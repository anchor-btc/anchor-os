//! Indexer for Anchor Predictions messages from the blockchain

use anchor_core::{parse_output_script, AnchorKind};
use anyhow::Result;
use bitcoin::consensus::encode::deserialize;
use bitcoin::hashes::Hash;
use bitcoin::{Block, Transaction};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use crate::amm::INITIAL_LIQUIDITY;
use crate::config::Config;
use crate::db::Database;

/// Market creation message parser
/// Format: [market_id 32] [question_len 2 BE] [question var] [desc_len 2 BE] [desc var] [resolution_block 4 BE] [oracle_pubkey 32] [initial_liquidity 8 BE]
pub struct MarketCreateBody {
    pub market_id: [u8; 32],
    pub question: String,
    pub description: Option<String>,
    pub resolution_block: u32,
    pub oracle_pubkey: [u8; 32],
    pub initial_liquidity: i64,
}

impl MarketCreateBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 36 {
            // Minimum: market_id(32) + question_len(2) + at least 1 char + resolution_block is later
            return None;
        }

        let mut market_id = [0u8; 32];
        market_id.copy_from_slice(&body[0..32]);

        let question_len = u16::from_be_bytes([body[32], body[33]]) as usize;
        if body.len() < 34 + question_len + 2 {
            return None;
        }

        let question = String::from_utf8_lossy(&body[34..34 + question_len]).to_string();
        let mut offset = 34 + question_len;

        let desc_len = u16::from_be_bytes([body[offset], body[offset + 1]]) as usize;
        offset += 2;

        let description = if desc_len > 0 && body.len() >= offset + desc_len {
            let desc = String::from_utf8_lossy(&body[offset..offset + desc_len]).to_string();
            offset += desc_len;
            Some(desc)
        } else {
            None
        };

        if body.len() < offset + 4 + 32 {
            return None;
        }

        let resolution_block = u32::from_be_bytes([
            body[offset],
            body[offset + 1],
            body[offset + 2],
            body[offset + 3],
        ]);
        offset += 4;

        let mut oracle_pubkey = [0u8; 32];
        oracle_pubkey.copy_from_slice(&body[offset..offset + 32]);
        offset += 32;

        let initial_liquidity = if body.len() >= offset + 8 {
            i64::from_be_bytes([
                body[offset],
                body[offset + 1],
                body[offset + 2],
                body[offset + 3],
                body[offset + 4],
                body[offset + 5],
                body[offset + 6],
                body[offset + 7],
            ])
        } else {
            INITIAL_LIQUIDITY
        };

        Some(Self {
            market_id,
            question,
            description,
            resolution_block,
            oracle_pubkey,
            initial_liquidity,
        })
    }
}

/// Place bet message parser
/// Format: [market_id 32] [outcome 1] [amount_sats 8 BE] [min_shares 8 BE] [user_pubkey 33]
pub struct PlaceBetBody {
    pub market_id: [u8; 32],
    pub outcome: u8,
    pub amount_sats: i64,
    pub _min_shares: i64,
    pub user_pubkey: [u8; 33],
}

impl PlaceBetBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 32 + 1 + 8 + 8 + 33 {
            return None;
        }

        let mut market_id = [0u8; 32];
        market_id.copy_from_slice(&body[0..32]);

        let outcome = body[32];

        let amount_sats = i64::from_be_bytes([
            body[33], body[34], body[35], body[36], body[37], body[38], body[39], body[40],
        ]);

        let min_shares = i64::from_be_bytes([
            body[41], body[42], body[43], body[44], body[45], body[46], body[47], body[48],
        ]);

        let mut user_pubkey = [0u8; 33];
        user_pubkey.copy_from_slice(&body[49..82]);

        Some(Self {
            market_id,
            outcome,
            amount_sats,
            _min_shares: min_shares,
            user_pubkey,
        })
    }
}

/// Market resolve message parser
/// Format: [market_id 32] [resolution 1] [oracle_pubkey 32] [schnorr_signature 64]
pub struct MarketResolveBody {
    pub market_id: [u8; 32],
    pub resolution: u8,
    pub _oracle_pubkey: [u8; 32],
    pub _schnorr_signature: [u8; 64],
}

impl MarketResolveBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 32 + 1 + 32 + 64 {
            return None;
        }

        let mut market_id = [0u8; 32];
        market_id.copy_from_slice(&body[0..32]);

        let resolution = body[32];

        let mut oracle_pubkey = [0u8; 32];
        oracle_pubkey.copy_from_slice(&body[33..65]);

        let mut schnorr_signature = [0u8; 64];
        schnorr_signature.copy_from_slice(&body[65..129]);

        Some(Self {
            market_id,
            resolution,
            _oracle_pubkey: oracle_pubkey,
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
            Auth::UserPass(
                config.bitcoin_rpc_user.clone(),
                config.bitcoin_rpc_password.clone(),
            ),
        )?;

        Ok(Self { db, rpc })
    }

    pub async fn run(&self) -> Result<()> {
        tracing::info!("Starting Prediction Markets indexer");

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
            self.db
                .update_last_block(&block_hash[..], target_height)
                .await?;

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
                    AnchorKind::MarketCreate => {
                        if let Some(create) = MarketCreateBody::parse(&msg.body) {
                            // Get creator from transaction inputs (simplified)
                            let creator = [0u8; 33]; // Would extract from input

                            let _ = self
                                .db
                                .insert_market(
                                    &create.market_id,
                                    &create.question,
                                    create.description.as_deref(),
                                    create.resolution_block as i32,
                                    &create.oracle_pubkey,
                                    &creator,
                                    &txid_bytes,
                                    height,
                                    create.initial_liquidity,
                                )
                                .await;

                            tracing::info!(
                                "Indexed market: {} - \"{}\"",
                                hex::encode(&create.market_id[..8]),
                                create.question.chars().take(50).collect::<String>()
                            );
                        }
                    }
                    AnchorKind::PlaceBet => {
                        if let Some(bet) = PlaceBetBody::parse(&msg.body) {
                            // Get current AMM state
                            if let Ok(Some(amm)) =
                                self.db.get_market_amm_state(&bet.market_id).await
                            {
                                // Calculate shares
                                let result = amm.quote(bet.outcome as i16, bet.amount_sats);

                                // Insert position
                                let _ = self
                                    .db
                                    .insert_position(
                                        &bet.market_id,
                                        &txid_bytes,
                                        vout as i32,
                                        height,
                                        &bet.user_pubkey,
                                        bet.outcome as i16,
                                        bet.amount_sats,
                                        result.shares_out,
                                        result.avg_price as f32,
                                    )
                                    .await;

                                // Update market AMM state
                                let _ = self
                                    .db
                                    .update_market_after_bet(
                                        &bet.market_id,
                                        result.new_yes_pool,
                                        result.new_no_pool,
                                        bet.amount_sats,
                                        bet.outcome as i16,
                                    )
                                    .await;

                                let outcome_str = if bet.outcome == 1 { "YES" } else { "NO" };
                                tracing::info!(
                                    "Indexed bet on {}: {} {} sats -> {} shares",
                                    hex::encode(&bet.market_id[..8]),
                                    outcome_str,
                                    bet.amount_sats,
                                    result.shares_out
                                );
                            }
                        }
                    }
                    AnchorKind::MarketResolve => {
                        if let Some(resolve) = MarketResolveBody::parse(&msg.body) {
                            let _ = self
                                .db
                                .resolve_market(
                                    &resolve.market_id,
                                    resolve.resolution as i16,
                                    &txid_bytes,
                                    height,
                                )
                                .await;

                            let resolution_str = match resolve.resolution {
                                0 => "NO",
                                1 => "YES",
                                2 => "INVALID",
                                _ => "UNKNOWN",
                            };
                            tracing::info!(
                                "Indexed market resolution: {} -> {}",
                                hex::encode(&resolve.market_id[..8]),
                                resolution_str
                            );
                        }
                    }
                    _ => {}
                }
            }
        }

        Ok(())
    }
}
