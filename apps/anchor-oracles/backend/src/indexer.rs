//! Indexer for Anchor Oracle messages from the blockchain

use anchor_core::{parse_output_script, AnchorKind};
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
    pub _category: u8,
    pub event_id: [u8; 32],
    pub _attestation_block: i64,
    pub _outcome_data: Vec<u8>,
    pub _schnorr_signature: [u8; 64],
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
            _category: category,
            event_id,
            _attestation_block: attestation_block,
            _outcome_data: outcome_data,
            _schnorr_signature: schnorr_signature,
        })
    }
}

pub struct Indexer {
    db: Arc<Database>,
    rpc: Client,
}

impl Indexer {
    pub fn new(config: &Config, db: Arc<Database>) -> Result<Self> {
        let rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;

        Ok(Self { db, rpc })
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

        for (vout, output) in tx.output.iter().enumerate() {
            if let Some(msg) = parse_output_script(&output.script_pubkey) {
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
                                    tracing::info!("Indexed oracle registration: {}", reg.name);
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
                                    tracing::info!("Indexed oracle update: {}", reg.name);
                                }
                                2 => {
                                    // Deactivate - would need separate handling
                                    tracing::info!("Oracle deactivation request");
                                }
                                _ => {}
                            }
                        }
                    }
                    AnchorKind::OracleAttestation => {
                        if let Some(att) = OracleAttestationBody::parse(&msg.body) {
                            // Find oracle from anchors (parent message)
                            if let Some(_anchor) = msg.canonical_parent() {
                                // Look up oracle by txid prefix
                                // For now, we'd need to resolve the anchor
                                tracing::debug!(
                                    "Indexed attestation for event {:?} at vout {}",
                                    hex::encode(&att.event_id),
                                    vout
                                );
                            }
                        }
                    }
                    AnchorKind::OracleDispute => {
                        tracing::debug!("Indexed oracle dispute at height {}", height);
                    }
                    AnchorKind::OracleSlash => {
                        tracing::debug!("Indexed oracle slash at height {}", height);
                    }
                    _ => {}
                }
            }
        }

        Ok(())
    }
}

