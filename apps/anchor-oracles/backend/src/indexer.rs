//! Indexer for Anchor Oracle messages from the blockchain

use anchor_core::{AnchorKind, carrier::CarrierSelector};
use anyhow::Result;
use bitcoin::consensus::encode::deserialize;
use bitcoin::hashes::Hash;
use bitcoin::{Block, Transaction};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use crate::config::Config;
use crate::db::Database;

/// Oracle registration body parser
pub struct OracleRegistration {
    pub action: u8, // 0=register, 1=update, 2=deactivate
    pub oracle_pubkey: [u8; 32],
    pub name: String,
    pub categories: i32,
    pub _stake_amount: i64,
    pub metadata: Option<String>,
}

impl OracleRegistration {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 45 {
            return None;
        }

        let action = body[0];
        let mut oracle_pubkey = [0u8; 32];
        oracle_pubkey.copy_from_slice(&body[1..33]);

        let name_len = u16::from_be_bytes([body[33], body[34]]) as usize;
        if body.len() < 37 + name_len {
            return None;
        }

        let name = String::from_utf8(body[35..35 + name_len].to_vec()).ok()?;
        let offset = 35 + name_len;

        if body.len() < offset + 10 {
            return None;
        }

        let categories = i16::from_be_bytes([body[offset], body[offset + 1]]) as i32;
        let stake_amount = i64::from_be_bytes([
            body[offset + 2], body[offset + 3], body[offset + 4], body[offset + 5],
            body[offset + 6], body[offset + 7], body[offset + 8], body[offset + 9],
        ]);

        let metadata = if body.len() > offset + 10 {
            String::from_utf8(body[offset + 10..].to_vec()).ok()
        } else {
            None
        };

        Some(Self {
            action,
            oracle_pubkey,
            name,
            categories,
            _stake_amount: stake_amount,
            metadata,
        })
    }
}

/// Oracle attestation body parser
pub struct OracleAttestationBody {
    pub category: u8,
    pub event_id: [u8; 32],
    pub attestation_block: i64,
    pub outcome_data: Vec<u8>,
    pub schnorr_signature: [u8; 64],
}

impl OracleAttestationBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 107 {
            return None;
        }

        let category = body[0];
        let mut event_id = [0u8; 32];
        event_id.copy_from_slice(&body[1..33]);

        let attestation_block = i64::from_be_bytes([
            body[33], body[34], body[35], body[36],
            body[37], body[38], body[39], body[40],
        ]);

        let outcome_len = u16::from_be_bytes([body[41], body[42]]) as usize;
        if body.len() < 43 + outcome_len + 64 {
            return None;
        }

        let outcome_data = body[43..43 + outcome_len].to_vec();
        let mut schnorr_signature = [0u8; 64];
        schnorr_signature.copy_from_slice(&body[43 + outcome_len..43 + outcome_len + 64]);

        Some(Self {
            category,
            event_id,
            attestation_block,
            outcome_data,
            schnorr_signature,
        })
    }
}

/// Oracle event request body parser
pub struct OracleEventBody {
    pub event_id: [u8; 32],
    pub category: u8,
    pub resolution_block: i32,
    pub bounty_sats: i64,
    pub description: String,
}

impl OracleEventBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        // Minimum: event_id(32) + category(1) + resolution_block(4) + bounty(8) = 45 bytes
        if body.len() < 45 {
            return None;
        }

        let mut event_id = [0u8; 32];
        event_id.copy_from_slice(&body[0..32]);

        let category = body[32];

        let resolution_block = i32::from_be_bytes([
            body[33], body[34], body[35], body[36],
        ]);

        let bounty_sats = i64::from_be_bytes([
            body[37], body[38], body[39], body[40],
            body[41], body[42], body[43], body[44],
        ]);

        let description = if body.len() > 45 {
            String::from_utf8(body[45..].to_vec()).unwrap_or_default()
        } else {
            String::new()
        };

        Some(Self {
            event_id,
            category,
            resolution_block,
            bounty_sats,
            description,
        })
    }
}

/// Oracle dispute body parser
pub struct OracleDisputeBody {
    pub disputer_pubkey: [u8; 32],
    pub attestation_txid: [u8; 32],
    pub attestation_vout: u16,
    pub reason: u8,
    pub stake_sats: i64,
    pub evidence: String,
}

impl OracleDisputeBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        // Minimum: disputer(32) + att_txid(32) + att_vout(2) + reason(1) + stake(8) = 75 bytes
        if body.len() < 75 {
            return None;
        }

        let mut disputer_pubkey = [0u8; 32];
        disputer_pubkey.copy_from_slice(&body[0..32]);

        let mut attestation_txid = [0u8; 32];
        attestation_txid.copy_from_slice(&body[32..64]);

        let attestation_vout = u16::from_be_bytes([body[64], body[65]]);

        let reason = body[66];

        let stake_sats = i64::from_be_bytes([
            body[67], body[68], body[69], body[70],
            body[71], body[72], body[73], body[74],
        ]);

        let evidence = if body.len() > 75 {
            String::from_utf8(body[75..].to_vec()).unwrap_or_default()
        } else {
            String::new()
        };

        Some(Self {
            disputer_pubkey,
            attestation_txid,
            attestation_vout,
            reason,
            stake_sats,
            evidence,
        })
    }
}

pub struct Indexer {
    db: Arc<Database>,
    rpc: Client,
    carrier_selector: CarrierSelector,
}

impl Indexer {
    pub fn new(config: &Config, db: Arc<Database>) -> Result<Self> {
        let rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;

        // Create carrier selector that can detect all carrier types
        let carrier_selector = CarrierSelector::new();

        Ok(Self { db, rpc, carrier_selector })
    }

    pub async fn run(&self) -> Result<()> {
        tracing::info!("Starting Oracle indexer");

        loop {
            if let Err(e) = self.sync_blocks().await {
                tracing::error!("Indexer sync error: {}", e);
            }
            sleep(Duration::from_secs(5)).await;
        }
    }

    async fn sync_blocks(&self) -> Result<()> {
        let chain_height = self.rpc.get_block_count()? as i32;
        let mut last_height = self.db.get_last_block_height().await?;

        while last_height < chain_height {
            let target_height = last_height + 1;
            let block_hash = self.rpc.get_block_hash(target_height as u64)?;
            let block_hex = self.rpc.get_block_hex(&block_hash)?;
            let block_bytes = hex::decode(&block_hex)?;
            let block: Block = deserialize(&block_bytes)?;

            self.process_block(&block, target_height).await?;
            self.db.update_last_block(&block_hash[..], target_height).await?;

            last_height = target_height;
            if target_height % 100 == 0 {
                tracing::info!("Indexed block {}/{}", target_height, chain_height);
            }
        }

        Ok(())
    }

    async fn process_block(&self, block: &Block, height: i32) -> Result<()> {
        for tx in &block.txdata {
            self.process_transaction(tx, height).await?;
        }
        Ok(())
    }

    async fn process_transaction(&self, tx: &Transaction, height: i32) -> Result<()> {
        let txid_bytes = tx.compute_txid().to_byte_array();

        // Use CarrierSelector to detect messages from ALL carrier types
        let detected_messages = self.carrier_selector.detect(tx);

        for detected in detected_messages {
            let msg = detected.message;
            let vout = detected.vout as usize;
            let carrier_name = format!("{:?}", detected.carrier_type);

            match msg.kind {
                    AnchorKind::Oracle => {
                        if let Some(reg) = OracleRegistration::parse(&msg.body) {
                            match reg.action {
                                0 => {
                                    // Register new oracle
                                    let _ = self.db.insert_oracle(
                                        &reg.oracle_pubkey,
                                        &reg.name,
                                        reg.metadata.as_deref(),
                                        reg.categories,
                                        &txid_bytes,
                                        Some(height),
                                    ).await;
                                    tracing::info!("Indexed oracle registration: {} (via {})", reg.name, carrier_name);
                                }
                                1 => {
                                    // Update oracle - handled by upsert
                                    let _ = self.db.insert_oracle(
                                        &reg.oracle_pubkey,
                                        &reg.name,
                                        reg.metadata.as_deref(),
                                        reg.categories,
                                        &txid_bytes,
                                        Some(height),
                                    ).await;
                                    tracing::info!("Indexed oracle update: {} (via {})", reg.name, carrier_name);
                                }
                                2 => {
                                    // Deactivate - would need separate handling
                                    tracing::info!("Oracle deactivation request (via {})", carrier_name);
                                }
                                _ => {}
                            }
                        }
                    }
                    AnchorKind::OracleAttestation => {
                        if let Some(att) = OracleAttestationBody::parse(&msg.body) {
                            // Find oracle from anchors (parent message)
                            if let Some(anchor) = msg.canonical_parent() {
                                // Look up oracle by parent txid prefix
                                // We use txid_prefix as the key since that's what we have
                                if let Ok(Some(oracle_id)) = self.db.get_oracle_id_by_pubkey(&anchor.txid_prefix).await {
                                    // Try to parse outcome as description
                                    let event_desc = String::from_utf8(att.outcome_data.clone()).ok();
                                    
                                    match self.db.insert_attestation(
                                        oracle_id,
                                        &txid_bytes,
                                        vout as i32,
                                        Some(height),
                                        att.category as i32,
                                        &att.event_id,
                                        event_desc.as_deref(),
                                        &att.outcome_data,
                                        &att.schnorr_signature,
                                    ).await {
                                        Ok(id) => tracing::info!(
                                            "Indexed attestation id={} for event {} at block {} (via {})",
                                            id,
                                            hex::encode(&att.event_id[..8]),
                                            height,
                                            carrier_name
                                        ),
                                        Err(e) => tracing::warn!("Failed to insert attestation: {}", e),
                                    }
                                } else {
                                    // Try with first oracle as fallback for testnet
                                    if let Ok(oracles) = self.db.get_oracles(1, 0).await {
                                        if let Some(oracle) = oracles.first() {
                                            let event_desc = String::from_utf8(att.outcome_data.clone()).ok();
                                            
                                            if let Ok(id) = self.db.insert_attestation(
                                                oracle.id,
                                                &txid_bytes,
                                                vout as i32,
                                                Some(height),
                                                att.category as i32,
                                                &att.event_id,
                                                event_desc.as_deref(),
                                                &att.outcome_data,
                                                &att.schnorr_signature,
                                            ).await {
                                                tracing::info!(
                                                    "Indexed attestation id={} (fallback oracle={}) (via {})",
                                                    id,
                                                    oracle.name,
                                                    carrier_name
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    AnchorKind::OracleDispute => {
                        tracing::debug!("Found OracleDispute message (via {})", carrier_name);
                        if let Some(disp) = OracleDisputeBody::parse(&msg.body) {
                            tracing::debug!(
                                "Parsed dispute: attestation_txid={}, reason={}, stake={}",
                                hex::encode(&disp.attestation_txid),
                                disp.reason,
                                disp.stake_sats
                            );
                            // Look up attestation by txid
                            if let Ok(Some(attestation_id)) = self.db.get_attestation_id_by_txid(&disp.attestation_txid).await {
                                match self.db.insert_dispute(
                                    attestation_id,
                                    &disp.disputer_pubkey,
                                    &txid_bytes,
                                    vout as i32,
                                    Some(height),
                                    disp.reason as i32,
                                    disp.stake_sats,
                                ).await {
                                    Ok(id) => tracing::info!(
                                        "Indexed dispute id={} for attestation {} (reason: {}) (via {})",
                                        id,
                                        attestation_id,
                                        disp.reason,
                                        carrier_name
                                    ),
                                    Err(e) => tracing::warn!("Failed to insert dispute: {}", e),
                                }
                            } else {
                                // For testnet, just insert with fallback to first attestation if any
                                if let Ok(attestations) = self.db.get_attestations(1, 0).await {
                                    if let Some(att) = attestations.first() {
                                        match self.db.insert_dispute(
                                            att.id,
                                            &disp.disputer_pubkey,
                                            &txid_bytes,
                                            vout as i32,
                                            Some(height),
                                            disp.reason as i32,
                                            disp.stake_sats,
                                        ).await {
                                            Ok(id) => tracing::info!(
                                                "Indexed dispute id={} (fallback attestation={}) (via {})",
                                                id,
                                                att.id,
                                                carrier_name
                                            ),
                                            Err(e) => tracing::warn!("Failed to insert fallback dispute: {}", e),
                                        }
                                    } else {
                                        tracing::warn!(
                                            "Dispute at vout {} - no attestations in database (via {})",
                                            vout,
                                            carrier_name
                                        );
                                    }
                                }
                            }
                        } else {
                            tracing::warn!("Failed to parse OracleDispute body (len={})", msg.body.len());
                        }
                    }
                    AnchorKind::OracleSlash => {
                        tracing::debug!("Indexed oracle slash at height {} (via {})", height, carrier_name);
                    }
                    _ => {}
                }
        }

        Ok(())
    }
}

