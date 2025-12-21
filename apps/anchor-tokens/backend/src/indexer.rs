//! Anchor Tokens Indexer
//! Scans the blockchain for token operations and maintains UTXO state

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
use crate::models::{DeployFlags, TokenOperation, TokenSpec};
use crate::utxo::UtxoTracker;

use anchor_specs::KindSpec;

/// Token message kind (Custom(20))
const TOKEN_KIND: u8 = 20;

/// The main indexer service
pub struct Indexer {
    config: Config,
    rpc: Client,
    db: Database,
    carrier_selector: CarrierSelector,
    utxo_tracker: UtxoTracker,
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

        // Initialize UTXO tracker
        let utxo_tracker = UtxoTracker::new(db.clone());

        Ok(Self {
            config,
            rpc,
            db,
            carrier_selector,
            utxo_tracker,
        })
    }

    /// Run the indexer loop
    pub async fn run(&self) -> Result<()> {
        info!("Starting Anchor Tokens indexer loop");

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
                Ok(ops) => {
                    if ops > 0 {
                        info!("Block {}: indexed {} token operations", height, ops);
                    } else {
                        debug!("Block {}: no token operations", height);
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

        let mut op_count = 0;

        for tx in &block.txdata {
            let count = self
                .index_transaction(tx, Some(&block_hash_bytes), Some(height))
                .await?;
            op_count += count;
        }

        self.db.update_last_block(&block_hash_bytes, height).await?;

        Ok(op_count)
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

        let mut token_count = 0;

        for (vout, message) in messages {
            // Check if it's a token message (kind = 20)
            let kind_value: u8 = message.kind.into();
            if kind_value != TOKEN_KIND {
                continue;
            }

            // Parse token operation using anchor-specs
            let operation = match TokenSpec::from_bytes(&message.body) {
                Ok(spec) => spec.operation,
                Err(e) => {
                    debug!("Failed to parse token operation in tx {}: {}", txid, e);
                    continue;
                }
            };

            // Check if already indexed
            if self.db.tx_exists(&txid_bytes, vout as i32).await? {
                debug!("Transaction {}:{} already indexed, skipping", txid, vout);
                continue;
            }

            // Process the operation
            match &operation {
                TokenOperation::Deploy {
                    ticker,
                    decimals,
                    max_supply,
                    mint_limit,
                    flags,
                } => {
                    // Check if ticker is available
                    if !self.db.is_ticker_available(ticker).await? {
                        debug!("Ticker {} already registered, skipping", ticker);
                        continue;
                    }

                    // Create the token
                    let token_id = self
                        .db
                        .create_token(
                            ticker,
                            &txid_bytes,
                            vout as i32,
                            *decimals as i16,
                            &max_supply.to_string(),
                            mint_limit.as_ref().map(|m| m.to_string()).as_deref(),
                            *flags as i16,
                            block_hash,
                            block_height,
                        )
                        .await?;

                    info!("Deployed token: {} (id={})", ticker, token_id);
                    token_count += 1;
                }
                TokenOperation::Mint {
                    token_id,
                    amount,
                    output_index,
                } => {
                    // Get the token
                    let token = match self.db.get_token_by_id(*token_id as i32).await? {
                        Some(t) => t,
                        None => {
                            debug!("Token {} not found for mint", token_id);
                            continue;
                        }
                    };

                    // Check if minting is allowed
                    let flags = DeployFlags(token.flags as u8);
                    if flags.is_fixed_supply() {
                        debug!("Token {} has fixed supply, mint rejected", token.ticker);
                        continue;
                    }

                    // Get output address
                    let output_addr = tx
                        .output
                        .get(*output_index as usize)
                        .and_then(|o| {
                            bitcoin::Address::from_script(&o.script_pubkey, bitcoin::Network::Regtest)
                                .ok()
                        })
                        .map(|a| a.to_string());

                    // Create UTXO
                    self.utxo_tracker
                        .process_mint(
                            *token_id as i32,
                            &txid_bytes,
                            *output_index as i32,
                            &amount.to_string(),
                            output_addr.as_deref(),
                            block_hash,
                            block_height,
                        )
                        .await?;

                    // Update minted supply
                    self.db
                        .update_minted_supply(*token_id as i32, &amount.to_string())
                        .await?;

                    // Record operation
                    self.db
                        .record_operation(
                            *token_id as i32,
                            2, // MINT
                            &txid_bytes,
                            vout as i32,
                            Some(&amount.to_string()),
                            None,
                            output_addr.as_deref(),
                            block_hash,
                            block_height,
                        )
                        .await?;

                    info!(
                        "Minted {} {} to output {}",
                        amount, token.ticker, output_index
                    );
                    token_count += 1;
                }
                TokenOperation::Transfer {
                    token_id,
                    allocations,
                } => {
                    // Process transfer using anchors to identify source UTXOs
                    if message.anchors.is_empty() {
                        debug!("Transfer without anchors, skipping");
                        continue;
                    }

                    let processed = self
                        .utxo_tracker
                        .process_transfer(
                            tx,
                            &txid_bytes,
                            vout as i32,
                            *token_id as i32,
                            allocations,
                            &message.anchors,
                            block_hash,
                            block_height,
                        )
                        .await?;

                    if processed {
                        self.db.increment_tx_count(*token_id as i32).await?;
                        token_count += 1;
                    }
                }
                TokenOperation::Burn { token_id, amount } => {
                    // Get the token
                    let token = match self.db.get_token_by_id(*token_id as i32).await? {
                        Some(t) => t,
                        None => {
                            debug!("Token {} not found for burn", token_id);
                            continue;
                        }
                    };

                    // Check if burning is allowed
                    let flags = DeployFlags(token.flags as u8);
                    if !flags.is_burnable() {
                        debug!("Token {} is not burnable, burn rejected", token.ticker);
                        continue;
                    }

                    // Update burned supply
                    self.db
                        .update_burned_supply(*token_id as i32, &amount.to_string())
                        .await?;

                    // Record operation
                    self.db
                        .record_operation(
                            *token_id as i32,
                            4, // BURN
                            &txid_bytes,
                            vout as i32,
                            Some(&amount.to_string()),
                            None,
                            None,
                            block_hash,
                            block_height,
                        )
                        .await?;

                    info!("Burned {} {}", amount, token.ticker);
                    token_count += 1;
                }
                TokenOperation::Split {
                    token_id,
                    allocations,
                } => {
                    // Split is similar to transfer but from a single source
                    if message.anchors.is_empty() {
                        debug!("Split without anchors, skipping");
                        continue;
                    }

                    let processed = self
                        .utxo_tracker
                        .process_transfer(
                            tx,
                            &txid_bytes,
                            vout as i32,
                            *token_id as i32,
                            allocations,
                            &message.anchors,
                            block_hash,
                            block_height,
                        )
                        .await?;

                    if processed {
                        self.db.increment_tx_count(*token_id as i32).await?;
                        token_count += 1;
                    }
                }
            }
        }

        Ok(token_count)
    }
}
