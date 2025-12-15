//! ANCHOR Testnet Service
//!
//! Generates random ANCHOR transactions on regtest to test the full stack.
//! Creates threads, replies, and multi-anchor messages.

mod generator;

use anyhow::Result;
use std::env;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

use crate::generator::MessageGenerator;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("🚀 Starting ANCHOR Testnet Generator");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Load configuration
    dotenvy::dotenv().ok();
    let wallet_url = env::var("WALLET_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
    let min_interval_secs: u64 = env::var("MIN_INTERVAL_SECS")
        .unwrap_or_else(|_| "3".to_string())
        .parse()
        .unwrap_or(3);
    let max_interval_secs: u64 = env::var("MAX_INTERVAL_SECS")
        .unwrap_or_else(|_| "10".to_string())
        .parse()
        .unwrap_or(10);
    let blocks_per_cycle: u32 = env::var("BLOCKS_PER_CYCLE")
        .unwrap_or_else(|_| "1".to_string())
        .parse()
        .unwrap_or(1);
    let initial_blocks: u32 = env::var("INITIAL_BLOCKS")
        .unwrap_or_else(|_| "101".to_string())
        .parse()
        .unwrap_or(101);

    info!("📡 Wallet URL: {}", wallet_url);
    info!("⏱️  Interval: {}s - {}s", min_interval_secs, max_interval_secs);
    info!("⛏️  Blocks per cycle: {}", blocks_per_cycle);

    // Create generator
    let mut generator = MessageGenerator::new(&wallet_url);

    // Wait for wallet service to be ready
    info!("⏳ Waiting for wallet service...");
    loop {
        match generator.health_check().await {
            Ok(_) => {
                info!("✅ Wallet service is ready");
                break;
            }
            Err(e) => {
                warn!("Wallet not ready: {}. Retrying in 5s...", e);
                sleep(Duration::from_secs(5)).await;
            }
        }
    }

    // Mine initial blocks for funding
    info!("⛏️  Mining {} initial blocks for funding...", initial_blocks);
    match generator.mine_blocks(initial_blocks).await {
        Ok(hashes) => info!("✅ Mined {} blocks", hashes.len()),
        Err(e) => {
            error!("Failed to mine initial blocks: {}", e);
            return Err(e);
        }
    }

    // Wait a bit for the indexer to catch up
    sleep(Duration::from_secs(2)).await;

    // Check balance
    match generator.get_balance().await {
        Ok(balance) => info!("💰 Wallet balance: {} BTC", balance),
        Err(e) => warn!("Could not get balance: {}", e),
    }

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("🔄 Starting transaction generation loop...");

    // Main loop
    let mut cycle = 0u64;
    loop {
        cycle += 1;
        info!("━━━ Cycle {} ━━━", cycle);

        // Generate a message (root, reply, or image)
        match generator.generate_message().await {
            Ok(result) => {
                let msg_type = if result.is_image {
                    "🖼️  image"
                } else if result.is_reply {
                    "↩️  reply"
                } else {
                    "📝 root"
                };
                let carrier_icon = match result.carrier {
                    generator::CarrierType::OpReturn => "📦",
                    generator::CarrierType::Inscription => "✍️",
                    generator::CarrierType::Stamps => "📮",
                    generator::CarrierType::TaprootAnnex => "🌿",
                    generator::CarrierType::WitnessData => "👁️",
                };
                info!(
                    "📨 Created {} message via {} {}: {}:{}",
                    msg_type,
                    carrier_icon,
                    result.carrier.as_str(),
                    &result.txid[..16],
                    result.vout
                );
                if let Some(parent) = &result.parent_txid {
                    info!(
                        "   ↳ Reply to: {}:{}",
                        &parent[..16],
                        result.parent_vout.unwrap_or(0)
                    );
                }
            }
            Err(e) => {
                error!("Failed to create message: {}", e);
            }
        }

        // Mine blocks to confirm
        match generator.mine_blocks(blocks_per_cycle).await {
            Ok(hashes) => info!("⛏️  Mined {} block(s)", hashes.len()),
            Err(e) => error!("Failed to mine: {}", e),
        }

        // Random delay
        let delay = generator.random_delay(min_interval_secs, max_interval_secs);
        info!("💤 Waiting {}s...", delay);
        sleep(Duration::from_secs(delay)).await;
    }
}

