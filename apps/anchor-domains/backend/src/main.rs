//! Anchor Domains Backend
//! Decentralized DNS on Bitcoin using the Anchor Protocol

mod config;
mod db;
mod handlers;
mod indexer;
mod models;

use std::sync::Arc;
use std::net::SocketAddr;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::db::Database;
use crate::indexer::Indexer;

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub config: Config,
}

/// OpenAPI documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::health,
        handlers::get_stats,
        handlers::resolve_domain,
        handlers::resolve_by_txid,
        handlers::list_domains,
        handlers::get_domain,
        handlers::get_domain_history,
        handlers::check_availability,
        handlers::get_domains_by_owner,
        handlers::get_my_domains,
        handlers::register_domain,
        handlers::update_domain,
    ),
    components(schemas(
        models::HealthResponse,
        models::DnsStats,
        models::ResolveResponse,
        models::Domain,
        models::DomainListItem,
        models::DnsRecordResponse,
        models::PaginatedResponse<models::DomainListItem>,
        models::RegisterDomainRequest,
        models::UpdateDomainRequest,
        models::DnsRecordInput,
        models::CreateTxResponse,
        handlers::HistoryEntry,
        handlers::AvailabilityResponse,
        handlers::GetDomainsByOwnerRequest,
        handlers::MyDomainsResponse,
    )),
    tags(
        (name = "System", description = "Health and status endpoints"),
        (name = "Statistics", description = "Protocol statistics"),
        (name = "Resolution", description = "DNS resolution endpoints"),
        (name = "Domains", description = "Domain management endpoints"),
        (name = "Registration", description = "Domain registration endpoints"),
    ),
    info(
        title = "Anchor Domains API",
        version = "1.0.0",
        description = "Decentralized DNS on Bitcoin using the Anchor Protocol. Supports .btc, .sat, .anchor, .anc TLDs"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive("anchor_domains_backend=info".parse()?)
            .add_directive("tower_http=debug".parse()?))
        .init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting Anchor Domains Backend on port {}", config.port);

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create shared state
    let state = Arc::new(AppState {
        db: db.clone(),
        config: config.clone(),
    });

    // Spawn indexer in background
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

    // Build router
    let app = Router::new()
        // System
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        // Resolution
        .route("/resolve/:name", get(handlers::resolve_domain))
        .route("/resolve/txid/:prefix", get(handlers::resolve_by_txid))
        // Domains
        .route("/domains", get(handlers::list_domains))
        .route("/domains/by-owner", post(handlers::get_domains_by_owner))
        .route("/my-domains", get(handlers::get_my_domains))
        .route("/domains/:name", get(handlers::get_domain))
        .route("/domains/:name/history", get(handlers::get_domain_history))
        .route("/available/:name", get(handlers::check_availability))
        // Registration
        .route("/register", post(handlers::register_domain))
        .route("/update/:name", post(handlers::update_domain))
        // Swagger UI
        .merge(SwaggerUi::new("/docs").url("/api-doc/openapi.json", ApiDoc::openapi()))
        // State and middleware
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Listening on {}", addr);
    info!("API docs available at http://localhost:{}/docs", config.port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
