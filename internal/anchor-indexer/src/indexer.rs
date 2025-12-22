//! Main indexer logic

use anyhow::{Context, Result};
use bitcoin::consensus::encode::deserialize;
use bitcoin::hashes::Hash;
use bitcoin::{Block, Transaction};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use anchor_core::carrier::{CarrierSelector, CarrierType};
use anchor_core::parse_transaction;

use crate::config::Config;
use crate::db::Database;

/// The main indexer service
pub struct Indexer {
    config: Config,
    rpc: Client,
    db: Database,
    carrier_selector: CarrierSelector,
}

impl Indexer {
    /// Create a new indexer instance
    pub async fn new(config: Config) -> Result<Self> {
        // Connect to Bitcoin Core
        let rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )
        .context("Failed to connect to Bitcoin RPC")?;

        // Verify connection
        let blockchain_info = rpc.get_blockchain_info()?;
        info!(
            "Connected to Bitcoin node: chain={}, blocks={}",
            blockchain_info.chain, blockchain_info.blocks
        );

        // Connect to database
        let db = Database::connect(&config.database_url).await?;
        info!("Connected to database");

        // Initialize carrier selector for multi-carrier detection
        let carrier_selector = CarrierSelector::new();
        info!(
            "Initialized multi-carrier detector with {} carriers",
            carrier_selector.carriers().len()
        );

        Ok(Self {
            config,
            rpc,
            db,
            carrier_selector,
        })
    }

    /// Run the indexer loop
    pub async fn run(&self) -> Result<()> {
        info!("Starting indexer loop");

        loop {
            match self.index_new_blocks().await {
                Ok(indexed) => {
                    if indexed > 0 {
                        info!("Indexed {} new blocks", indexed);
                        
                        // Resolve any pending anchors
                        match self.db.resolve_anchors().await {
                            Ok(resolved) => {
                                if resolved > 0 {
                                    info!("Resolved {} anchors", resolved);
                                }
                            }
                            Err(e) => error!("Failed to resolve anchors: {}", e),
                        }
                    }
                }
                Err(e) => {
                    error!("Indexing error: {}", e);
                }
            }

            // Wait before next poll
            sleep(Duration::from_secs(self.config.poll_interval_secs)).await;
        }
    }

    /// Index any new blocks since last indexed height
    async fn index_new_blocks(&self) -> Result<u32> {
        let last_height = self.db.get_last_block_height().await?;
        let current_height = self.rpc.get_block_count()? as i32;

        // Calculate safe height (accounting for confirmations)
        let safe_height = current_height - self.config.confirmations as i32;

        if safe_height <= last_height {
            debug!(
                "No new blocks to index (last={}, current={}, safe={})",
                last_height, current_height, safe_height
            );
            return Ok(0);
        }

        let mut indexed = 0;

        for height in (last_height + 1)..=safe_height {
            match self.index_block(height).await {
                Ok(messages) => {
                    if messages > 0 {
                        info!("Block {}: indexed {} ANCHOR messages", height, messages);
                    } else {
                        debug!("Block {}: no ANCHOR messages", height);
                    }
                    indexed += 1;
                }
                Err(e) => {
                    error!("Failed to index block {}: {}", height, e);
                    // Check for reorg
                    if e.to_string().contains("Block not found") {
                        warn!("Possible reorg detected at height {}", height);
                        self.db.handle_reorg(height).await?;
                        return Ok(indexed);
                    }
                    return Err(e);
                }
            }
        }

        Ok(indexed)
    }

    /// Index a single block
    async fn index_block(&self, height: i32) -> Result<u32> {
        // Get block hash
        let block_hash = self.rpc.get_block_hash(height as u64)?;
        let block_hash_bytes = block_hash.to_byte_array().to_vec();

        // Get raw block
        let block_hex = self.rpc.call::<String>("getblock", &[
            serde_json::json!(block_hash.to_string()),
            serde_json::json!(0), // Raw hex format
        ])?;

        let block_bytes = hex::decode(&block_hex)?;
        let block: Block = deserialize(&block_bytes)?;

        let mut message_count = 0;

        // Process each transaction
        for tx in &block.txdata {
            let count = self.index_transaction(tx, Some(&block_hash_bytes), Some(height)).await?;
            message_count += count;
        }

        // Update last indexed block
        self.db.update_last_block(&block_hash_bytes, height).await?;

        Ok(message_count)
    }

    /// Index a single transaction
    async fn index_transaction(
        &self,
        tx: &Transaction,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<u32> {
        let txid = tx.compute_txid();

        // Try multi-carrier detection first
        let detected = self.carrier_selector.detect(tx);

        // Fall back to legacy OP_RETURN parsing if no messages detected
        let messages: Vec<(u32, CarrierType, anchor_core::ParsedAnchorMessage)> = if detected
            .is_empty()
        {
            // Use legacy parser for backwards compatibility
            parse_transaction(tx)
                .into_iter()
                .map(|(vout, msg)| (vout, CarrierType::OpReturn, msg))
                .collect()
        } else {
            detected
                .into_iter()
                .map(|d| (d.vout, d.carrier_type, d.message))
                .collect()
        };

        if messages.is_empty() {
            return Ok(0);
        }

        debug!(
            "Found {} ANCHOR messages in tx {} (carriers: {:?})",
            messages.len(),
            txid,
            messages.iter().map(|(_, c, _)| c).collect::<Vec<_>>()
        );

        for (vout, carrier_type, message) in &messages {
            // Check if already indexed
            if self.db.message_exists(&txid, *vout).await? {
                debug!("Message {}:{} already indexed, skipping", txid, vout);
                continue;
            }

            self.db
                .insert_message_with_carrier(&txid, *vout, block_hash, block_height, message, *carrier_type)
                .await?;
        }

        Ok(messages.len() as u32)
    }
}

