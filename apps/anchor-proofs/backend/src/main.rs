//! AnchorProofs Backend
//! Proof of Existence service using the Anchor Protocol

mod config;
mod db;
mod handlers;
mod indexer;
mod models;

use anyhow::Result;
use axum::{
    http::{header, Method},
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::db::Database;
use crate::handlers::AppState;
use crate::indexer::Indexer;

/// OpenAPI documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::health,
        handlers::get_stats,
        handlers::list_proofs,
        handlers::get_proof,
        handlers::get_proof_by_id,
        handlers::validate_hash,
        handlers::stamp,
        handlers::stamp_batch,
        handlers::revoke,
    ),
    components(schemas(
        models::HealthResponse,
        models::ProofStats,
        models::Proof,
        models::ProofListItem,
        models::PaginatedResponse<models::ProofListItem>,
        models::ValidationResult,
        models::StampRequest,
        models::BatchStampRequest,
        models::RevokeRequest,
        models::ValidateRequest,
        models::CreateTxResponse,
    )),
    tags(
        (name = "Health", description = "Health check endpoints"),
        (name = "Stats", description = "Protocol statistics"),
        (name = "Proofs", description = "Proof management"),
        (name = "Validation", description = "File validation"),
        (name = "Stamp", description = "Create proofs"),
        (name = "Revoke", description = "Revoke proofs"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting AnchorProofs backend");

    // Load configuration
    let config = Config::from_env();
    info!("Configuration loaded: host={}, port={}", config.host, config.port);

    // Connect to database
    let db = Database::new(&config.database_url).await?;

    // Start indexer in background if enabled
    if config.indexer_enabled {
        let indexer_config = config.clone();
        let indexer_db = db.clone();
        tokio::spawn(async move {
            match Indexer::new(indexer_config, indexer_db).await {
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
    }

    // Create app state
    let state = AppState {
        db,
        wallet_url: config.wallet_url.clone(),
    };

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    // Build router
    let app = Router::new()
        // Health
        .route("/api/health", get(handlers::health))
        // Stats
        .route("/api/stats", get(handlers::get_stats))
        // Proofs
        .route("/api/proofs", get(handlers::list_proofs))
        .route("/api/proof/:hash", get(handlers::get_proof))
        .route("/api/proof/id/:id", get(handlers::get_proof_by_id))
        // Validation
        .route("/api/validate", post(handlers::validate_hash))
        // Stamp
        .route("/api/stamp", post(handlers::stamp))
        .route("/api/stamp/batch", post(handlers::stamp_batch))
        // Revoke
        .route("/api/revoke", post(handlers::revoke))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // State and middleware
        .with_state(state)
        .layer(cors);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    info!("Server listening on {}", addr);
    info!("Swagger UI available at http://{}:{}/swagger-ui", config.host, config.port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
