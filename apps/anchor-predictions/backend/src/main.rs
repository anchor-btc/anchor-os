//! Anchor Predictions Backend
//! Binary Prediction Markets with AMM

mod amm;
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
        list_markets,
        get_market,
        create_market,
        get_market_positions,
        get_bet_quote,
        place_bet,
        get_resolution,
        get_market_winners,
        claim_winnings,
        get_my_positions,
        get_all_positions,
        get_history,
    ),
    components(schemas(
        Market,
        Position,
        MarketStats,
        Winner,
        CreateMarketRequest,
        PlaceBetRequest,
        PlaceBetQuote,
        ClaimWinningsRequest,
    )),
    tags(
        (name = "stats", description = "Market statistics"),
        (name = "markets", description = "Prediction market operations"),
        (name = "user", description = "User position operations"),
        (name = "history", description = "Historical data"),
    ),
    info(
        title = "Anchor Predictions API",
        version = "2.0.0",
        description = "Binary Prediction Markets with AMM on Bitcoin"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchor_predictions_backend=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Starting Anchor Predictions backend on {}:{}", config.host, config.port);

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
        // Markets
        .route("/api/markets", get(list_markets))
        .route("/api/markets/create", post(create_market))
        .route("/api/markets/:id", get(get_market))
        .route("/api/markets/:id/positions", get(get_market_positions))
        .route("/api/markets/:id/quote", post(get_bet_quote))
        .route("/api/markets/:id/bet", post(place_bet))
        .route("/api/markets/:id/resolution", get(get_resolution))
        .route("/api/markets/:id/winners", get(get_market_winners))
        .route("/api/markets/:id/claim", post(claim_winnings))
        // User/Positions
        .route("/api/my/positions", get(get_my_positions))
        .route("/api/positions", get(get_all_positions))
        // History
        .route("/api/history", get(get_history))
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
