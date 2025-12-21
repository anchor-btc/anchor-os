//! Anchor Tokens Backend
//!
//! API server and indexer for the Anchor Tokens protocol.

mod config;
mod db;
mod handlers;
mod indexer;
mod models;
mod utxo;

use std::net::SocketAddr;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use config::Config;
use db::Database;
use handlers::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .compact()
        .init();

    info!("Starting Anchor Tokens Backend");

    // Load configuration
    let config = Config::from_env();
    info!("Loaded configuration");

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create app state
    let state = AppState {
        db: db.clone(),
        wallet_url: config.wallet_url.clone(),
    };

    // Build router
    let app = Router::new()
        // Health & Stats
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        // Token endpoints
        .route("/tokens", get(handlers::list_tokens))
        .route("/tokens/:ticker", get(handlers::get_token))
        .route("/tokens/:ticker/holders", get(handlers::get_token_holders))
        .route("/tokens/:ticker/history", get(handlers::get_token_history))
        // Address endpoints
        .route("/address/:address/balances", get(handlers::get_address_balances))
        .route("/address/:address/utxos", get(handlers::get_address_utxos))
        .route("/address/:address/history", get(handlers::get_address_history))
        // Wallet endpoints
        .route("/wallet/tokens", get(handlers::get_wallet_tokens))
        // Transaction endpoints
        .route("/tx/deploy", post(handlers::create_deploy_tx))
        .route("/tx/mint", post(handlers::create_mint_tx))
        .route("/tx/transfer", post(handlers::create_transfer_tx))
        .route("/tx/burn", post(handlers::create_burn_tx))
        // State
        .with_state(state)
        // CORS
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Start indexer in background
    let indexer_config = config.clone();
    let indexer_db = db.clone();
    tokio::spawn(async move {
        match indexer::Indexer::new(indexer_config, indexer_db).await {
            Ok(indexer) => {
                if let Err(e) = indexer.run().await {
                    tracing::error!("Indexer error: {}", e);
                }
            }
            Err(e) => {
                tracing::error!("Failed to start indexer: {}", e);
            }
        }
    });

    // Start HTTP server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Starting HTTP server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
