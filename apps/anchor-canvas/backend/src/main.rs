//! AnchorCanvas Backend
//!
//! A collaborative pixel canvas on Bitcoin using the Anchor protocol.
//! This service provides:
//! - REST API for querying canvas state
//! - Tile generation for efficient rendering
//! - Blockchain indexer for processing pixel transactions

mod canvas;
mod config;
mod db;
mod handlers;
mod indexer;
mod models;
mod services;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::canvas::CanvasManager;
use crate::config::Config;
use crate::db::Database;
use crate::handlers::AppState;
use crate::indexer::CanvasIndexer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchor_canvas_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    info!(
        "Starting AnchorCanvas Backend on {}:{}",
        config.host, config.port
    );

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create canvas manager
    let canvas = CanvasManager::new(db.clone());

    // Create shared state
    let state = AppState::new(db.clone(), canvas);

    // Start indexer in background
    let indexer = Arc::new(CanvasIndexer::new(db.clone(), config.clone())?);
    let indexer_clone = indexer.clone();
    tokio::spawn(async move {
        if let Err(e) = indexer_clone.start().await {
            tracing::error!("Indexer error: {}", e);
        }
    });

    // Build router
    let app = Router::new()
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        .route("/pixel/{x}/{y}", get(handlers::get_pixel))
        .route("/recent", get(handlers::get_recent))
        .route("/pixels/by-txids", post(handlers::get_pixels_by_txids))
        .route("/pixels/by-address", get(handlers::get_pixels_by_address))
        .route(
            "/pixels/by-addresses",
            post(handlers::get_pixels_by_addresses),
        )
        .route("/pixels/my", get(handlers::get_my_pixels))
        .route("/canvas", get(handlers::get_canvas))
        .route("/canvas/preview", get(handlers::get_preview))
        .route("/canvas/region", get(handlers::get_region))
        .route("/canvas/tile/{z}/{x}/{y}", get(handlers::get_tile))
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
    info!("AnchorCanvas Backend listening on {}", addr);

    axum::serve(listener, app).await?;

    // Cleanup
    indexer.stop().await;

    Ok(())
}
