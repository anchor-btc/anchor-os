//! ANCHOR OS Backup Service

mod backup;
mod config;
mod handlers;
mod scheduler;
mod storage;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use handlers::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "anchor_backup=info".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting ANCHOR Backup Service");

    // Load configuration
    let config = Config::from_env();
    info!("Configuration loaded: host={}, port={}", config.host, config.port);
    
    // Ensure backup directory exists
    tokio::fs::create_dir_all(&config.backup_dir).await?;
    info!("Backup directory: {}", config.backup_dir);

    // Create application state
    let state = Arc::new(AppState::new(config.clone()).await);

    // Initialize restic repository
    let engine = &state.engine;
    if let Err(e) = engine.init_repo(&backup::engine::BackupTarget::Local).await {
        info!("Note: {}", e);
    }
    
    // Start scheduler
    if let Err(e) = state.start_scheduler().await {
        info!("Note: Scheduler not started: {}", e);
    }

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        // Health check
        .route("/health", get(handlers::health))
        
        // Backup endpoints
        .route("/backup/status", get(handlers::get_status))
        .route("/backup/start", post(handlers::start_backup))
        .route("/backup/history", get(handlers::get_history))
        .route("/backup/restore", post(handlers::restore))
        
        // Storage targets
        .route("/backup/targets", get(handlers::get_targets))
        
        // Volumes and snapshots
        .route("/backup/volumes", get(handlers::list_volumes))
        .route("/backup/snapshots/{target}", get(handlers::list_snapshots))
        
        // Settings
        .route("/backup/settings", get(handlers::get_settings))
        .route("/backup/settings", post(handlers::save_settings))
        
        // Local storage files
        .route("/backup/local/files", get(handlers::list_local_files))
        
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    info!("Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
