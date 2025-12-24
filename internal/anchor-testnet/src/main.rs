//! ANCHOR Testnet Service
//!
//! Generates random ANCHOR transactions on regtest to test the full stack.
//! Supports multiple message types: Text, Pixel, Image, Map, DNS, Proof, Token, Oracle, Prediction.
//! Provides a REST API for runtime configuration.
//! Includes WebSocket support for real-time logs and stats streaming.

mod config;
mod generator;
mod handlers;
mod websocket;

use crate::config::{GeneratorStats, SharedConfig, SharedStats, TestnetConfig};
use crate::generator::{CarrierType, MessageGenerator};
use crate::handlers::{
    get_config_handler, get_stats_handler, health_handler, pause_handler, resume_handler,
    update_config_handler, AppState,
};
use crate::websocket::{
    create_log_buffer, create_ws_broadcast, ws_handler, WsState,
    LogEntry, LogLevel, broadcast_log, broadcast_stats,
};
use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("🚀 Starting ANCHOR Testnet Generator v2.1");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Load configuration
    dotenvy::dotenv().ok();
    let wallet_url = env::var("WALLET_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
    let api_port: u16 = env::var("API_PORT")
        .unwrap_or_else(|_| "8002".to_string())
        .parse()
        .unwrap_or(8002);

    // Create shared state
    let config: SharedConfig = Arc::new(RwLock::new(TestnetConfig::from_env()));
    let stats: SharedStats = Arc::new(RwLock::new(GeneratorStats::default()));
    
    // Create WebSocket broadcast and log buffer
    let log_buffer = create_log_buffer();
    let ws_broadcast = create_ws_broadcast();

    let initial_blocks: u32 = env::var("INITIAL_BLOCKS")
        .unwrap_or_else(|_| "101".to_string())
        .parse()
        .unwrap_or(101);

    {
        let cfg = config.read().await;
        info!("📡 Wallet URL: {}", wallet_url);
        info!("🌐 API Port: {}", api_port);
        info!(
            "⏱️  Interval: {}s - {}s",
            cfg.min_interval_secs, cfg.max_interval_secs
        );
        info!("⛏️  Blocks per cycle: {}", cfg.blocks_per_cycle);
    }

    // Create generator
    let mut generator = MessageGenerator::new(&wallet_url, config.clone(), stats.clone());

    // Create app states
    let app_state = AppState {
        config: config.clone(),
        stats: stats.clone(),
    };
    
    let ws_state = WsState {
        log_buffer: log_buffer.clone(),
        stats: stats.clone(),
        broadcast: ws_broadcast.clone(),
    };

    // Start API server in background
    let api_state = app_state.clone();
    let api_ws_state = ws_state.clone();
    
    tokio::spawn(async move {
        start_api_server(api_state, api_ws_state, api_port).await;
    });

    // Wait for wallet service to be ready
    info!("⏳ Waiting for wallet service...");
    broadcast_log(
        &ws_broadcast,
        &log_buffer,
        LogEntry::new(LogLevel::Info, "Waiting for wallet service...")
    ).await;
    
    loop {
        match generator.health_check().await {
            Ok(_) => {
                info!("✅ Wallet service is ready");
                broadcast_log(
                    &ws_broadcast,
                    &log_buffer,
                    LogEntry::new(LogLevel::Info, "Wallet service is ready")
                ).await;
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
    broadcast_log(
        &ws_broadcast,
        &log_buffer,
        LogEntry::new(LogLevel::Info, format!("Mining {} initial blocks...", initial_blocks))
    ).await;
    
    match generator.mine_blocks(initial_blocks).await {
        Ok(hashes) => {
            info!("✅ Mined {} blocks", hashes.len());
            let mut s = stats.write().await;
            s.increment_blocks(hashes.len() as u64);
            s.mark_started();
        }
        Err(e) => {
            error!("Failed to mine initial blocks: {}", e);
            return Err(e);
        }
    }

    // Wait a bit for the indexer to catch up
    sleep(Duration::from_secs(2)).await;

    // Check balance
    match generator.get_balance().await {
        Ok(balance) => {
            info!("💰 Wallet balance: {} BTC", balance);
            broadcast_log(
                &ws_broadcast,
                &log_buffer,
                LogEntry::new(LogLevel::Info, format!("Wallet balance: {} BTC", balance))
            ).await;
        }
        Err(e) => warn!("Could not get balance: {}", e),
    }

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("🔄 Starting transaction generation loop...");
    info!("🌐 API available at http://0.0.0.0:{}", api_port);
    info!("🔌 WebSocket available at ws://0.0.0.0:{}/ws", api_port);

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
                    config::MessageType::Text => {
                        if result.is_reply { "↩️" } else { "📝" }
                    }
                    config::MessageType::Pixel => "🎨",
                    config::MessageType::Image => "🖼️",
                    config::MessageType::Map => "📍",
                    config::MessageType::Dns => "🌐",
                    config::MessageType::Proof => "📜",
                    config::MessageType::Token => "🪙",
                    config::MessageType::TokenMint => "⛏️",
                    config::MessageType::TokenTransfer => "➡️",
                    config::MessageType::TokenBurn => "🔥",
                    config::MessageType::Oracle => "🔮",
                    config::MessageType::OracleAttestation => "✅",
                    config::MessageType::OracleDispute => "⚔️",
                    config::MessageType::Prediction => "🎲",
                };
                let carrier_icon = match result.carrier {
                    CarrierType::OpReturn => "📦",
                    CarrierType::Inscription => "✍️",
                    CarrierType::Stamps => "📮",
                    CarrierType::TaprootAnnex => "🌿",
                    CarrierType::WitnessData => "👁️",
                };
                
                let msg = format!(
                    "{} Created {} via {} {}: {}:{}",
                    type_icon,
                    result.message_type.name(),
                    carrier_icon,
                    result.carrier.as_str(),
                    &result.txid[..16],
                    result.vout
                );
                info!("{}", msg);
                
                // Broadcast log entry
                let log_entry = LogEntry::new(LogLevel::Info, msg.clone())
                    .with_message_type(result.message_type.name().to_lowercase().as_str())
                    .with_carrier(result.carrier.as_str())
                    .with_txid(&result.txid)
                    .with_cycle(cycle);
                broadcast_log(&ws_broadcast, &log_buffer, log_entry).await;
                
                // Broadcast updated stats
                let current_stats = stats.read().await.clone();
                broadcast_stats(&ws_broadcast, &current_stats).await;
                
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
                let mut s = stats.write().await;
                s.increment_error();
                
                broadcast_log(
                    &ws_broadcast,
                    &log_buffer,
                    LogEntry::new(LogLevel::Error, format!("Failed to create message: {}", e))
                        .with_cycle(cycle)
                ).await;
            }
        }

        // Mine blocks to confirm
        match generator.mine_blocks(cfg.blocks_per_cycle).await {
            Ok(hashes) => {
                info!("⛏️  Mined {} block(s)", hashes.len());
                let mut s = stats.write().await;
                s.increment_blocks(hashes.len() as u64);
            }
            Err(e) => error!("Failed to mine: {}", e),
        }

        // Random delay
        let delay = generator.random_delay(cfg.min_interval_secs, cfg.max_interval_secs);
        info!("💤 Waiting {}s...", delay);
        sleep(Duration::from_secs(delay)).await;
    }
}

/// Start the API server with all routes
async fn start_api_server(
    app_state: AppState,
    ws_state: WsState,
    port: u16,
) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Config routes
    let config_routes = Router::new()
        .route("/health", get(health_handler))
        .route("/config", get(get_config_handler))
        .route("/config", post(update_config_handler))
        .route("/stats", get(get_stats_handler))
        .route("/pause", post(pause_handler))
        .route("/resume", post(resume_handler))
        .with_state(app_state);

    // WebSocket route
    let ws_routes = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(ws_state);

    // Combine routes
    let app = Router::new()
        .merge(config_routes)
        .merge(ws_routes)
        .layer(cors);

    let addr = format!("0.0.0.0:{}", port);
    info!("🌐 Starting API server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
