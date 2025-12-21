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

use crate::config::{Config, CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::db::Database;
use crate::models::Pixel;

/// Parse pixel data from Anchor message body
/// Format: [num_pixels: u32][pixels...]
/// Each pixel: [x: u16][y: u16][r: u8][g: u8][b: u8] = 7 bytes
pub fn parse_pixel_payload(body: &[u8]) -> Result<Vec<Pixel>> {
    if body.len() < 4 {
        return Err(anyhow!("Body too short for pixel count"));
    }

    let num_pixels = u32::from_be_bytes([body[0], body[1], body[2], body[3]]) as usize;
    let expected_len = 4 + num_pixels * 7;

    if body.len() < expected_len {
        return Err(anyhow!(
            "Body too short: expected {} bytes for {} pixels, got {}",
            expected_len,
            num_pixels,
            body.len()
        ));
    }

    let mut pixels = Vec::with_capacity(num_pixels);
    for i in 0..num_pixels {
        let offset = 4 + i * 7;
        if let Some(pixel) = Pixel::from_bytes(&body[offset..offset + 7]) {
            // Validate coordinates
            if pixel.x < CANVAS_WIDTH && pixel.y < CANVAS_HEIGHT {
                pixels.push(pixel);
            } else {
                warn!(
                    "Pixel ({}, {}) out of bounds, skipping",
                    pixel.x, pixel.y
                );
            }
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
        let auth = Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone());
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

        debug!("Indexing block {} with {} transactions", height, block.txdata.len());

        let mut pixel_count = 0;

        for tx in &block.txdata {
            if let Some(pixels) = self.extract_pixels_from_tx(tx)? {
                let txid = tx.compute_txid();
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

    /// Reindex from a specific height (for handling reorgs)
    pub async fn reindex_from(&self, height: i32) -> Result<()> {
        info!("Reindexing from block {}", height);
        self.db.handle_reorg(height).await?;
        self.index_new_blocks().await
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

