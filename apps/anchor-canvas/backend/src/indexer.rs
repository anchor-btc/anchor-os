//! AnchorCanvas transaction indexer
//!
//! Scans the Bitcoin blockchain for Anchor protocol transactions
//! that contain pixel data (kind = State/2) and updates the database.
//! Supports both OP_RETURN and WitnessData carriers.

use anyhow::{anyhow, Result};
use bitcoin::hashes::Hash;
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::{debug, error, info, warn};

use anchor_core::carrier::CarrierSelector;
use anchor_core::AnchorKind;
use anchor_specs::state::StateSpec;
use anchor_specs::KindSpec;

use crate::config::{Config, CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::db::Database;
use crate::models::Pixel;

/// Parse pixel data from Anchor message body using StateSpec
pub fn parse_pixel_payload(body: &[u8]) -> Result<Vec<Pixel>> {
    let spec =
        StateSpec::from_bytes(body).map_err(|e| anyhow!("Failed to parse StateSpec: {}", e))?;

    let mut pixels = Vec::with_capacity(spec.pixels.len());
    for pixel_data in spec.pixels {
        // Validate coordinates
        if (pixel_data.x as u32) < CANVAS_WIDTH && (pixel_data.y as u32) < CANVAS_HEIGHT {
            pixels.push(Pixel {
                x: pixel_data.x as u32,
                y: pixel_data.y as u32,
                r: pixel_data.r,
                g: pixel_data.g,
                b: pixel_data.b,
            });
        } else {
            warn!(
                "Pixel ({}, {}) out of bounds, skipping",
                pixel_data.x, pixel_data.y
            );
        }
    }

    Ok(pixels)
}

/// AnchorCanvas indexer that scans the blockchain for pixel transactions
pub struct CanvasIndexer {
    db: Database,
    rpc: Client,
    config: Config,
    running: Arc<RwLock<bool>>,
}

impl CanvasIndexer {
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

        info!("Starting AnchorCanvas indexer");

        loop {
            if !*self.running.read().await {
                break;
            }

            if let Err(e) = self.index_new_blocks().await {
                error!("Indexer error: {}", e);
            }

            sleep(Duration::from_secs(self.config.poll_interval_secs)).await;
        }

        info!("AnchorCanvas indexer stopped");
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

        info!("Indexing blocks {} to {}", last_indexed + 1, current_height);

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

        let mut pixel_count = 0;

        for tx in &block.txdata {
            if let Some(pixels) = self.extract_pixels_from_tx(tx)? {
                let txid = tx.compute_txid();

                // Extract creator address from the first input
                let creator_address = self.get_creator_address(tx);

                for (vout, pixel) in pixels.iter().enumerate() {
                    self.db
                        .upsert_pixel(
                            pixel.x as i32,
                            pixel.y as i32,
                            pixel.r as i16,
                            pixel.g as i16,
                            pixel.b as i16,
                            &txid.to_byte_array(),
                            vout as i32,
                            Some(height),
                            creator_address.as_deref(),
                        )
                        .await?;
                    pixel_count += 1;
                }
            }
        }

        // Update last indexed block
        self.db
            .update_last_block(&block_hash.to_byte_array(), height)
            .await?;

        if pixel_count > 0 {
            info!("Block {}: indexed {} pixels", height, pixel_count);
        }

        Ok(())
    }

    /// Get the creator address from the transaction
    /// For Anchor transactions, we look at the change output (non-OP_RETURN outputs)
    /// This works for both regular transactions and inscriptions
    fn get_creator_address(&self, tx: &bitcoin::Transaction) -> Option<String> {
        // Skip coinbase transactions
        if tx.is_coinbase() {
            return None;
        }

        // First try: Look for a change output in the transaction itself
        // Skip outputs that are OP_RETURN (nulldata) or zero value
        for output in &tx.output {
            // Skip OP_RETURN outputs (they start with 0x6a)
            if output.script_pubkey.is_op_return() {
                continue;
            }
            // Skip zero-value outputs
            if output.value.to_sat() == 0 {
                continue;
            }
            // Try to extract address from the script pubkey
            if let Ok(addr) =
                bitcoin::Address::from_script(&output.script_pubkey, bitcoin::Network::Regtest)
            {
                return Some(addr.to_string());
            }
        }

        // Fallback: Get the address from the first input's previous output
        if let Some(first_input) = tx.input.first() {
            let prev_txid = first_input.previous_output.txid;
            let prev_vout = first_input.previous_output.vout;

            // Fetch the previous transaction to get the address
            match self.rpc.get_raw_transaction_info(&prev_txid, None) {
                Ok(prev_tx_info) => {
                    if let Some(vout) = prev_tx_info.vout.get(prev_vout as usize) {
                        if let Some(ref addr) = vout.script_pub_key.address {
                            return Some(addr.clone().assume_checked().to_string());
                        }
                    }
                }
                Err(e) => {
                    debug!("Failed to get previous tx {}: {}", prev_txid, e);
                }
            }
        }

        None
    }

    /// Extract pixel data from a transaction if it contains valid Anchor pixel messages
    /// Supports both OP_RETURN and WitnessData carriers
    fn extract_pixels_from_tx(&self, tx: &bitcoin::Transaction) -> Result<Option<Vec<Pixel>>> {
        // Use CarrierSelector to detect Anchor messages from all carriers
        let selector = CarrierSelector::new();
        let detected = selector.detect(tx);

        for detection in detected {
            // Check if it's a State message (kind = 2) - used for pixels
            if matches!(detection.message.kind, AnchorKind::State) {
                debug!(
                    "Found State message with {} bytes body via {:?}",
                    detection.message.body.len(),
                    detection.carrier_type
                );

                // Parse the pixel payload
                if let Ok(pixels) = parse_pixel_payload(&detection.message.body) {
                    if !pixels.is_empty() {
                        info!(
                            "Decoded {} pixels from {:?} carrier",
                            pixels.len(),
                            detection.carrier_type
                        );
                        return Ok(Some(pixels));
                    }
                }
            }
        }

        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pixel_payload() {
        // Create test payload: 2 pixels
        let mut payload = Vec::new();
        payload.extend_from_slice(&2u32.to_be_bytes()); // num_pixels = 2

        // Pixel 1: (100, 200) red
        payload.extend_from_slice(&100u16.to_be_bytes());
        payload.extend_from_slice(&200u16.to_be_bytes());
        payload.push(255); // r
        payload.push(0); // g
        payload.push(0); // b

        // Pixel 2: (300, 400) blue
        payload.extend_from_slice(&300u16.to_be_bytes());
        payload.extend_from_slice(&400u16.to_be_bytes());
        payload.push(0); // r
        payload.push(0); // g
        payload.push(255); // b

        let pixels = parse_pixel_payload(&payload).unwrap();
        assert_eq!(pixels.len(), 2);
        assert_eq!(pixels[0].x, 100);
        assert_eq!(pixels[0].y, 200);
        assert_eq!(pixels[0].r, 255);
        assert_eq!(pixels[0].g, 0);
        assert_eq!(pixels[0].b, 0);
        assert_eq!(pixels[1].x, 300);
        assert_eq!(pixels[1].y, 400);
        assert_eq!(pixels[1].r, 0);
        assert_eq!(pixels[1].g, 0);
        assert_eq!(pixels[1].b, 255);
    }

    #[test]
    fn test_pixel_encode_decode() {
        let pixel = Pixel::new(1234, 5678, 128, 64, 32);
        let bytes = pixel.to_bytes();
        let decoded = Pixel::from_bytes(&bytes).unwrap();
        assert_eq!(decoded.x, 1234);
        assert_eq!(decoded.y, 5678);
        assert_eq!(decoded.r, 128);
        assert_eq!(decoded.g, 64);
        assert_eq!(decoded.b, 32);
    }
}
