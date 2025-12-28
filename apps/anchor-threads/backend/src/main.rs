//! ANCHOR Explorer Backend
//!
//! REST API for querying indexed ANCHOR messages.

mod config;
mod db;
mod handlers;
mod models;

use anyhow::Result;
use axum::{routing::get, Router};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::db::Database;

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "ANCHOR Explorer API",
        version = "1.0.0",
        description = "REST API for querying ANCHOR protocol messages indexed from Bitcoin blockchain",
        license(name = "MIT", url = "https://opensource.org/licenses/MIT"),
        contact(name = "ANCHOR Protocol", url = "https://github.com/anchor-btc/anchor-os")
    ),
    paths(
        handlers::health,
        handlers::get_stats,
        handlers::list_messages,
        handlers::get_message,
        handlers::list_roots,
        handlers::list_roots_filtered,
        handlers::get_popular_threads,
        handlers::get_thread,
        handlers::get_replies,
    ),
    components(schemas(
        handlers::HealthResponse,
        models::MessageResponse,
        models::AnchorResponse,
        models::StatsResponse,
        models::PopularThreadResponse,
        models::ListParams,
        models::FilterParams,
    )),
    tags(
        (name = "System", description = "System health endpoints"),
        (name = "Statistics", description = "Protocol statistics"),
        (name = "Messages", description = "ANCHOR message operations"),
        (name = "Threads", description = "Thread and reply operations"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("Starting ANCHOR Explorer API");

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create application state
    let state = Arc::new(AppState { db });

    // Build router
    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        .route("/messages", get(handlers::list_messages))
        .route("/messages/:txid/:vout", get(handlers::get_message))
        .route("/roots", get(handlers::list_roots))
        .route("/roots/filter", get(handlers::list_roots_filtered))
        .route("/popular", get(handlers::get_popular_threads))
        .route("/threads/:txid/:vout", get(handlers::get_thread))
        .route("/replies/:txid/:vout", get(handlers::get_replies))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    info!(
        "Swagger UI available at http://localhost:{}/swagger-ui/",
        config.port
    );

    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
