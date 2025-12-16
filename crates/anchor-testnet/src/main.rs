//! ANCHOR Testnet Service
//!
//! Generates random ANCHOR transactions on regtest to test the full stack.
//! Supports multiple message types: Text, Pixel, Image, Map, DNS, Proof.
//! Provides a REST API for runtime configuration.

mod config;
mod generator;

use crate::config::{GeneratorStats, SharedConfig, SharedStats, TestnetConfig};
use crate::generator::MessageGenerator;
use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

/// Application state shared across handlers
#[derive(Clone)]
struct AppState {
    config: SharedConfig,
    stats: SharedStats,
}

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
    let api_port: u16 = env::var("API_PORT")
        .unwrap_or_else(|_| "3014".to_string())
        .parse()
        .unwrap_or(3014);

    // Create shared state
    let config: SharedConfig = Arc::new(RwLock::new(TestnetConfig::from_env()));
    let stats: SharedStats = Arc::new(RwLock::new(GeneratorStats::default()));

    let initial_blocks: u32 = env::var("INITIAL_BLOCKS")
        .unwrap_or_else(|_| "101".to_string())
        .parse()
        .unwrap_or(101);

    {
        let cfg = config.read().await;
        info!("📡 Wallet URL: {}", wallet_url);
        info!("🌐 API Port: {}", api_port);
        info!("⏱️  Interval: {}s - {}s", cfg.min_interval_secs, cfg.max_interval_secs);
        info!("⛏️  Blocks per cycle: {}", cfg.blocks_per_cycle);
    }

    // Create generator
    let mut generator = MessageGenerator::new(&wallet_url, config.clone(), stats.clone());

    // Start API server in background
    let app_state = AppState {
        config: config.clone(),
        stats: stats.clone(),
    };
    
    tokio::spawn(async move {
        start_api_server(app_state, api_port).await;
    });

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
    info!("🌐 API available at http://0.0.0.0:{}", api_port);

    // Main loop
    let mut cycle = 0u64;
    loop {
        cycle += 1;

        // Get current config
        let cfg = generator.get_config().await;

        // Check if paused
        if cfg.paused {
            info!("⏸️  Generator paused, waiting...");
            sleep(Duration::from_secs(5)).await;
            continue;
        }

        info!("━━━ Cycle {} ━━━", cycle);

        // Generate a message
        match generator.generate_message().await {
            Ok(Some(result)) => {
                let type_icon = match result.message_type {
                    config::MessageType::Text => if result.is_reply { "↩️" } else { "📝" },
                    config::MessageType::Pixel => "🎨",
                    config::MessageType::Image => "🖼️",
                    config::MessageType::Map => "📍",
                    config::MessageType::Dns => "🌐",
                    config::MessageType::Proof => "📜",
                };
                let carrier_icon = match result.carrier {
                    generator::CarrierType::OpReturn => "📦",
                    generator::CarrierType::Inscription => "✍️",
                    generator::CarrierType::Stamps => "📮",
                    generator::CarrierType::TaprootAnnex => "🌿",
                    generator::CarrierType::WitnessData => "👁️",
                };
                info!(
                    "{} Created {} via {} {}: {}:{}",
                    type_icon,
                    result.message_type.name(),
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
            Ok(None) => {
                info!("⏭️  No enabled message types, skipping...");
            }
            Err(e) => {
                error!("Failed to create message: {}", e);
            }
        }

        // Mine blocks to confirm
        match generator.mine_blocks(cfg.blocks_per_cycle).await {
            Ok(hashes) => info!("⛏️  Mined {} block(s)", hashes.len()),
            Err(e) => error!("Failed to mine: {}", e),
        }

        // Random delay
        let delay = generator.random_delay(cfg.min_interval_secs, cfg.max_interval_secs);
        info!("💤 Waiting {}s...", delay);
        sleep(Duration::from_secs(delay)).await;
    }
}

/// Start the API server
async fn start_api_server(state: AppState, port: u16) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/config", get(get_config_handler))
        .route("/config", post(update_config_handler))
        .route("/stats", get(get_stats_handler))
        .route("/pause", post(pause_handler))
        .route("/resume", post(resume_handler))
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", port);
    info!("🌐 Starting API server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Health check endpoint
async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

/// Get current configuration
async fn get_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().await;
    Json(config.clone())
}

/// Request body for updating config
#[derive(Debug, Deserialize)]
struct UpdateConfigRequest {
    #[serde(default)]
    min_interval_secs: Option<u64>,
    #[serde(default)]
    max_interval_secs: Option<u64>,
    #[serde(default)]
    blocks_per_cycle: Option<u32>,
    #[serde(default)]
    enable_text: Option<bool>,
    #[serde(default)]
    enable_pixel: Option<bool>,
    #[serde(default)]
    enable_image: Option<bool>,
    #[serde(default)]
    enable_map: Option<bool>,
    #[serde(default)]
    enable_dns: Option<bool>,
    #[serde(default)]
    enable_proof: Option<bool>,
    #[serde(default)]
    weight_op_return: Option<u8>,
    #[serde(default)]
    weight_stamps: Option<u8>,
    #[serde(default)]
    weight_inscription: Option<u8>,
    #[serde(default)]
    weight_taproot_annex: Option<u8>,
    #[serde(default)]
    weight_witness_data: Option<u8>,
}

/// Update configuration
async fn update_config_handler(
    State(state): State<AppState>,
    Json(req): Json<UpdateConfigRequest>,
) -> impl IntoResponse {
    let mut config = state.config.write().await;

    // Update only provided fields
    if let Some(v) = req.min_interval_secs {
        config.min_interval_secs = v.max(1);
    }
    if let Some(v) = req.max_interval_secs {
        config.max_interval_secs = v.max(config.min_interval_secs);
    }
    if let Some(v) = req.blocks_per_cycle {
        config.blocks_per_cycle = v.max(1).min(10);
    }
    if let Some(v) = req.enable_text {
        config.enable_text = v;
    }
    if let Some(v) = req.enable_pixel {
        config.enable_pixel = v;
    }
    if let Some(v) = req.enable_image {
        config.enable_image = v;
    }
    if let Some(v) = req.enable_map {
        config.enable_map = v;
    }
    if let Some(v) = req.enable_dns {
        config.enable_dns = v;
    }
    if let Some(v) = req.enable_proof {
        config.enable_proof = v;
    }
    if let Some(v) = req.weight_op_return {
        config.weight_op_return = v.min(100);
    }
    if let Some(v) = req.weight_stamps {
        config.weight_stamps = v.min(100);
    }
    if let Some(v) = req.weight_inscription {
        config.weight_inscription = v.min(100);
    }
    if let Some(v) = req.weight_taproot_annex {
        config.weight_taproot_annex = v.min(100);
    }
    if let Some(v) = req.weight_witness_data {
        config.weight_witness_data = v.min(100);
    }

    info!("📝 Configuration updated");
    Json(config.clone())
}

/// Get generation statistics
async fn get_stats_handler(State(state): State<AppState>) -> impl IntoResponse {
    let stats = state.stats.read().await;
    Json(stats.clone())
}

/// Pause generation
async fn pause_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut config = state.config.write().await;
    config.paused = true;
    info!("⏸️  Generator paused via API");
    Json(serde_json::json!({ "paused": true }))
}

/// Resume generation
async fn resume_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut config = state.config.write().await;
    config.paused = false;
    info!("▶️  Generator resumed via API");
    Json(serde_json::json!({ "paused": false }))
}
