//! BitDNS Indexer
//! Scans the blockchain for DNS registration and update transactions

use anyhow::{Context, Result};
use bitcoin::consensus::encode::deserialize;
use bitcoin::hashes::Hash;
use bitcoin::{Block, Transaction};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use anchor_core::carrier::CarrierSelector;
use anchor_core::parse_transaction;

use crate::config::Config;
use crate::db::Database;
use crate::models::{DnsOperation, DnsPayload};

/// DNS message kind (Custom(10))
const DNS_KIND: u8 = 10;

/// The main indexer service
pub struct Indexer {
    config: Config,
    rpc: Client,
    db: Database,
    carrier_selector: CarrierSelector,
}

impl Indexer {
    /// Create a new indexer instance
    pub async fn new(config: Config, db: Database) -> Result<Self> {
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

        // Initialize carrier selector
        let carrier_selector = CarrierSelector::new();

        Ok(Self {
            config,
            rpc,
            db,
            carrier_selector,
        })
    }

    /// Run the indexer loop
    pub async fn run(&self) -> Result<()> {
        info!("Starting BitDNS indexer loop");

        loop {
            match self.index_new_blocks().await {
                Ok(indexed) => {
                    if indexed > 0 {
                        info!("Indexed {} new blocks", indexed);
                    }
                }
                Err(e) => {
                    error!("Indexing error: {}", e);
                }
            }

            sleep(Duration::from_secs(self.config.poll_interval_secs)).await;
        }
    }

    /// Index any new blocks since last indexed height
    async fn index_new_blocks(&self) -> Result<u32> {
        let last_height = self.db.get_last_block_height().await?;
        let current_height = self.rpc.get_block_count()? as i32;

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
                        info!("Block {}: indexed {} DNS messages", height, messages);
                    } else {
                        debug!("Block {}: no DNS messages", height);
                    }
                    indexed += 1;
                }
                Err(e) => {
                    error!("Failed to index block {}: {}", height, e);
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
        let block_hash = self.rpc.get_block_hash(height as u64)?;
        let block_hash_bytes = block_hash.to_byte_array().to_vec();

        let block_hex = self.rpc.call::<String>(
            "getblock",
            &[
                serde_json::json!(block_hash.to_string()),
                serde_json::json!(0),
            ],
        )?;

        let block_bytes = hex::decode(&block_hex)?;
        let block: Block = deserialize(&block_bytes)?;

        let mut message_count = 0;

        for tx in &block.txdata {
            let count = self
                .index_transaction(tx, Some(&block_hash_bytes), Some(height))
                .await?;
            message_count += count;
        }

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
        let txid_bytes = txid.to_byte_array().to_vec();

        // Try multi-carrier detection first
        let detected = self.carrier_selector.detect(tx);

        // Fall back to legacy OP_RETURN parsing
        let messages: Vec<(u32, anchor_core::ParsedAnchorMessage)> = if detected.is_empty() {
            parse_transaction(tx)
        } else {
            detected.into_iter().map(|d| (d.vout, d.message)).collect()
        };

        if messages.is_empty() {
            return Ok(0);
        }

        let mut dns_count = 0;

        for (vout, message) in messages {
            // Check if it's a DNS message (kind = 10)
            let kind_value: u8 = message.kind.into();
            if kind_value != DNS_KIND {
                continue;
            }

            // Parse DNS payload
            let payload = match DnsPayload::from_bytes(&message.body) {
                Some(p) => p,
                None => {
                    debug!("Failed to parse DNS payload in tx {}", txid);
                    continue;
                }
            };

            // Check if already indexed
            if self.db.tx_exists(&txid_bytes, vout as i32).await? {
                debug!("Transaction {}:{} already indexed, skipping", txid, vout);
                continue;
            }

            // Process based on operation
            match payload.operation {
                DnsOperation::Register => {
                    // Check if domain is available
                    if !self.db.is_domain_available(&payload.name).await? {
                        debug!("Domain {} already registered, skipping", payload.name);
                        continue;
                    }

                    self.db
                        .register_domain(
                            &payload.name,
                            &txid_bytes,
                            vout as i32,
                            &payload.records,
                            block_hash,
                            block_height,
                        )
                        .await?;

                    info!("Registered domain: {}", payload.name);
                    dns_count += 1;
                }
                DnsOperation::Update => {
                    // Verify anchor points to owner
                    if let Some(anchor) = message.anchors.first() {
                        let owner = self.db.get_domain_owner(&payload.name).await?;

                        if let Some((owner_txid, _owner_vout)) = owner {
                            // Check if anchor matches owner txid prefix
                            if owner_txid.starts_with(&anchor.txid_prefix) {
                                self.db
                                    .update_domain(
                                        &payload.name,
                                        &txid_bytes,
                                        vout as i32,
                                        &payload.records,
                                        block_hash,
                                        block_height,
                                    )
                                    .await?;

                                info!("Updated domain: {}", payload.name);
                                dns_count += 1;
                            } else {
                                debug!(
                                    "Update for {} rejected: anchor doesn't match owner",
                                    payload.name
                                );
                            }
                        }
                    } else {
                        debug!("Update for {} rejected: no anchor", payload.name);
                    }
                }
                DnsOperation::Transfer => {
                    // Transfer is similar to update but changes owner
                    // For now, we don't change the owner, just update records
                    debug!("Transfer operation not fully implemented yet");
                }
            }
        }

        Ok(dns_count)
    }
}
