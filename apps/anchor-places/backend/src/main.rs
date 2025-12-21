//! Anchor Places Backend
//!
//! A Bitcoin-powered map markers application using the Anchor protocol.
//! This service provides:
//! - REST API for querying markers and map data
//! - Blockchain indexer for processing geo marker transactions
//! - Full-text search and geospatial queries

mod config;
mod db;
mod handlers;
mod indexer;
mod models;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::db::Database;
use crate::handlers::AppState;
use crate::indexer::MarkerIndexer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchor_places_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting Anchor Places Backend on {}:{}", config.host, config.port);

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create shared state
    let state = Arc::new(AppState {
        db: db.clone(),
        wallet_url: config.wallet_url.clone(),
    });

    // Start indexer in background
    let indexer = Arc::new(MarkerIndexer::new(db.clone(), config.clone())?);
    let indexer_clone = indexer.clone();
    tokio::spawn(async move {
        if let Err(e) = indexer_clone.start().await {
            tracing::error!("Indexer error: {}", e);
        }
    });

    // Build router
    let app = Router::new()
        // System
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        // Categories
        .route("/categories", get(handlers::get_categories))
        // Markers
        .route("/markers", get(handlers::get_markers))
        .route("/markers", post(handlers::create_marker))
        .route("/markers/bounds", get(handlers::get_markers_bounds))
        .route("/markers/search", get(handlers::search_markers))
        .route("/markers/:txid/:vout", get(handlers::get_marker))
        .route("/markers/:txid/:vout/reply", post(handlers::create_reply))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!("Anchor Places Backend listening on {}", addr);

    axum::serve(listener, app).await?;

    // Cleanup
    indexer.stop().await;

    Ok(())
}

