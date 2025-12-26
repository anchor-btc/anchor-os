//! Anchor Oracles Backend
//! Decentralized oracle network for Bitcoin

mod config;
mod db;
mod handlers;
mod indexer;
mod models;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::db::Database;
use crate::handlers::*;
use crate::indexer::Indexer;
use crate::models::*;

#[derive(OpenApi)]
#[openapi(
    paths(
        get_stats,
        list_oracles,
        get_oracle,
        get_oracle_attestations,
        register_oracle,
        list_attestations,
        submit_attestation,
        list_events,
        create_event_request,
        list_disputes,
        list_categories,
    ),
    components(schemas(
        Oracle,
        Attestation,
        Dispute,
        EventRequest,
        OracleStats,
        CategoryInfo,
        RegisterOracleRequest,
        SubmitAttestationRequest,
        CreateEventRequest,
    )),
    tags(
        (name = "stats", description = "Oracle network statistics"),
        (name = "oracles", description = "Oracle registry operations"),
        (name = "attestations", description = "Oracle attestation operations"),
        (name = "events", description = "Event request operations"),
        (name = "disputes", description = "Dispute operations"),
        (name = "categories", description = "Oracle category operations"),
    ),
    info(
        title = "Anchor Oracles API",
        version = "1.0.0",
        description = "Decentralized oracle network for Bitcoin"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchor_oracles_backend=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!(
        "Starting Anchor Oracles backend on {}:{}",
        config.host,
        config.port
    );

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    let db = Arc::new(db);
    tracing::info!("Connected to database");

    // Start indexer in background
    let indexer_db = db.clone();
    let indexer_config = config.clone();
    tokio::spawn(async move {
        match Indexer::new(&indexer_config, indexer_db) {
            Ok(indexer) => {
                if let Err(e) = indexer.run().await {
                    tracing::error!("Indexer error: {}", e);
                }
            }
            Err(e) => {
                tracing::warn!("Could not start indexer: {}", e);
            }
        }
    });

    // Build router
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Health check
        .route("/health", get(health))
        // Stats
        .route("/api/stats", get(get_stats))
        // Oracles
        .route("/api/oracles", get(list_oracles))
        .route("/api/oracles/register", post(register_oracle))
        .route(
            "/api/oracles/by-addresses",
            get(get_oracles_by_addresses).post(post_oracles_by_addresses),
        )
        .route("/api/oracles/:pubkey", get(get_oracle))
        .route(
            "/api/oracles/:pubkey/attestations",
            get(get_oracle_attestations),
        )
        // Attestations
        .route("/api/attestations", get(list_attestations))
        .route("/api/attestations/submit", post(submit_attestation))
        // Events
        .route("/api/events", get(list_events))
        .route("/api/events/request", post(create_event_request))
        .route("/api/events/:id", get(get_event))
        .route("/api/events/:id/attestations", get(get_event_attestations))
        // Disputes
        .route("/api/disputes", get(list_disputes))
        // Categories
        .route("/api/categories", get(list_categories))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(cors)
        .with_state(db);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Listening on {}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
