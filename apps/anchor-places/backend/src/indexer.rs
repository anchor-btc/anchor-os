//! Anchor Places transaction indexer
//!
//! Scans the Bitcoin blockchain for Anchor protocol transactions
//! that contain geo marker data (kind = Custom(5)) and text replies.
//! Supports both OP_RETURN and WitnessData carriers.
//!
//! ## Ownership Rule
//!
//! The first marker at any exact coordinate "owns" that location.
//! Subsequent markers at the same coordinates are automatically
//! converted to replies to the first marker.

use anyhow::{anyhow, Result};
use bitcoin::hashes::Hash;
use bitcoin::{Address, Network};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::{debug, error, info, warn};

use anchor_core::carrier::CarrierSelector;
use anchor_core::AnchorKind;
use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

use crate::config::Config;
use crate::db::Database;

/// Sanitize a string for PostgreSQL by removing null bytes
fn sanitize_for_postgres(s: &str) -> String {
    s.replace('\0', "")
}

/// Anchor Places indexer that scans the blockchain for marker transactions
pub struct MarkerIndexer {
    db: Database,
    rpc: Client,
    config: Config,
    running: Arc<RwLock<bool>>,
}

impl MarkerIndexer {
    /// Create a new indexer
    pub fn new(db: Database, config: Config) -> Result<Self> {
        let auth = Auth::UserPass(
            config.bitcoin_rpc_user.clone(),
            config.bitcoin_rpc_password.clone(),
        );
        let rpc = Client::new(&config.bitcoin_rpc_url, auth)?;

        Ok(Self {
            db,
            rpc,
            config,
            running: Arc::new(RwLock::new(false)),
        })
    }

    /// Start the indexer loop
    pub async fn start(self: Arc<Self>) -> Result<()> {
        {
            let mut running = self.running.write().await;
            if *running {
                return Err(anyhow!("Indexer already running"));
            }
            *running = true;
        }

        info!("Starting Anchor Places indexer");

        loop {
            if !*self.running.read().await {
                break;
            }

            if let Err(e) = self.index_new_blocks().await {
                error!("Indexer error: {}", e);
            }

            sleep(Duration::from_secs(self.config.poll_interval_secs)).await;
        }

        info!("Anchor Places indexer stopped");
        Ok(())
    }

    /// Stop the indexer
    pub async fn stop(&self) {
        let mut running = self.running.write().await;
        *running = false;
    }

    /// Index new blocks since the last indexed block
    async fn index_new_blocks(&self) -> Result<()> {
        let last_indexed = self.db.get_last_block_height().await?;
        let current_height = self.rpc.get_block_count()? as i32;

        if current_height <= last_indexed {
            debug!("No new blocks to index");
            return Ok(());
        }

        info!(
            "Indexing blocks {} to {}",
            last_indexed + 1,
            current_height
        );

        for height in (last_indexed + 1)..=current_height {
            self.index_block(height).await?;
        }

        Ok(())
    }

    /// Index a single block
    async fn index_block(&self, height: i32) -> Result<()> {
        let block_hash = self.rpc.get_block_hash(height as u64)?;
        let block = self.rpc.get_block(&block_hash)?;

        debug!(
            "Indexing block {} with {} transactions",
            height,
            block.txdata.len()
        );

        let mut marker_count = 0;
        let mut reply_count = 0;

        for tx in &block.txdata {
            let result = self
                .process_transaction(tx, Some(&block_hash.to_byte_array()), Some(height))
                .await?;
            marker_count += result.0;
            reply_count += result.1;
        }

        // Update last indexed block
        self.db
            .update_last_block(&block_hash.to_byte_array(), height)
            .await?;

        if marker_count > 0 || reply_count > 0 {
            info!(
                "Block {}: indexed {} markers, {} replies",
                height, marker_count, reply_count
            );
        }

        Ok(())
    }

    /// Extract creator address from transaction
    /// First tries to get from a change output, then from the input witness
    fn extract_creator_address(&self, tx: &bitcoin::Transaction) -> Option<String> {
        // First, look for a change output (non-OP_RETURN output)
        for output in tx.output.iter().rev() {
            // Skip OP_RETURN outputs
            if output.script_pubkey.is_op_return() {
                continue;
            }
            // Try to extract address from the script
            if let Ok(address) = Address::from_script(&output.script_pubkey, Network::Regtest) {
                let addr_str = address.to_string();
                // Prefer SegWit (bcrt1q) or Taproot (bcrt1p) addresses
                if addr_str.starts_with("bcrt1") || addr_str.starts_with("bc1") {
                    return Some(addr_str);
                }
            }
        }
        
        // Fallback: try to derive address from the first input's witness (P2WPKH)
        // For P2WPKH, the witness has [signature, pubkey]
        if let Some(input) = tx.input.first() {
            if input.witness.len() >= 2 {
                // The second element is the public key
                let pubkey_bytes = &input.witness[1];
                if pubkey_bytes.len() == 33 {
                    // Compressed public key - derive P2WPKH address
                    if let Ok(pubkey) = bitcoin::CompressedPublicKey::from_slice(pubkey_bytes) {
                        let address = Address::p2wpkh(&pubkey, Network::Regtest);
                        return Some(address.to_string());
                    }
                }
            }
        }
        
        None
    }

    /// Process a single transaction for Anchor messages
    async fn process_transaction(
        &self,
        tx: &bitcoin::Transaction,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<(usize, usize)> {
        let selector = CarrierSelector::new();
        let detected = selector.detect(tx);

        let mut markers = 0;
        let mut replies = 0;

        // Extract creator address once for this transaction
        let creator_address = self.extract_creator_address(tx);

        for detection in detected {
            let txid = tx.compute_txid();
            let txid_bytes = txid.to_byte_array();

            match detection.message.kind {
                // Custom(5) = Geo Marker
                AnchorKind::Custom(5) => {
                    // Parse using anchor-specs GeoMarkerSpec
                    match GeoMarkerSpec::from_bytes(&detection.message.body) {
                        Ok(spec) => {
                            debug!(
                                "Found geo marker at ({}, {}): {} (creator: {:?})",
                                spec.latitude, spec.longitude, spec.message, creator_address
                            );

                            // Sanitize message for PostgreSQL (remove null bytes)
                            let clean_message = sanitize_for_postgres(&spec.message);

                            // Check if a marker already exists at this exact coordinate
                            // If so, this becomes a reply (first-pin-owns rule)
                            if let Some((parent_txid, parent_vout)) = self
                                .db
                                .find_marker_at_coordinates(spec.latitude, spec.longitude)
                                .await?
                            {
                                // Location already has a pin - create as reply
                                info!(
                                    "Coordinate ({}, {}) already has a pin, creating as reply",
                                    spec.latitude, spec.longitude
                                );

                                self.db
                                    .insert_reply(
                                        &txid_bytes,
                                        detection.vout as i32,
                                        &parent_txid,
                                        parent_vout,
                                        &clean_message,
                                        block_hash,
                                        block_height,
                                    )
                                    .await?;

                                replies += 1;
                            } else {
                                // New location - create marker with creator address
                                self.db
                                    .insert_marker(
                                        &txid_bytes,
                                        detection.vout as i32,
                                        spec.category as i16,
                                        spec.latitude,
                                        spec.longitude,
                                        &clean_message,
                                        creator_address.as_deref(),
                                        block_hash,
                                        block_height,
                                    )
                                    .await?;

                                markers += 1;
                            }
                        }
                        Err(e) => {
                            warn!("Failed to parse geo marker payload: {}", e);
                        }
                    }
                }

                // Text message with anchors = Reply to a marker
                AnchorKind::Text => {
                    if !detection.message.anchors.is_empty() {
                        // This is a reply - check if parent is a marker
                        let parent_anchor = &detection.message.anchors[0];

                        debug!(
                            "Found text message with anchor: prefix={}, vout={}",
                            hex::encode(&parent_anchor.txid_prefix),
                            parent_anchor.vout
                        );

                        // Try to find the parent marker
                        match self
                            .db
                            .resolve_anchor_to_marker(&parent_anchor.txid_prefix, parent_anchor.vout as i32)
                            .await?
                        {
                            Some(parent_txid) => {
                                let raw_message =
                                    String::from_utf8_lossy(&detection.message.body).to_string();
                                // Sanitize for PostgreSQL (remove null bytes and replacement chars)
                                let message = sanitize_for_postgres(&raw_message);

                                info!("Found reply to marker: {}", message);

                                self.db
                                    .insert_reply(
                                        &txid_bytes,
                                        detection.vout as i32,
                                        &parent_txid,
                                        parent_anchor.vout as i32,
                                        &message,
                                        block_hash,
                                        block_height,
                                    )
                                    .await?;

                                replies += 1;
                            }
                            None => {
                                debug!(
                                    "Could not resolve anchor to marker: prefix={}, vout={}",
                                    hex::encode(&parent_anchor.txid_prefix),
                                    parent_anchor.vout
                                );
                            }
                        }
                    }
                }

                _ => {}
            }
        }

        Ok((markers, replies))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geo_marker_parsing_with_spec() {
        // Create a test payload using GeoMarkerSpec
        let spec = GeoMarkerSpec::new(1, 48.8566, 2.3522, "Eiffel Tower");
        let bytes = spec.to_bytes();
        let parsed = GeoMarkerSpec::from_bytes(&bytes).unwrap();

        assert_eq!(parsed.category, 1);
        assert!((parsed.latitude - 48.8566).abs() < 0.001);
        assert!((parsed.longitude - 2.3522).abs() < 0.001);
        assert_eq!(parsed.message, "Eiffel Tower");
    }
}
