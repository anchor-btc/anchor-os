//! Anchor Predictions Backend
//! Trustless lottery with DLC-based payouts

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
        list_lotteries,
        get_lottery,
        create_lottery,
        get_lottery_tickets,
        buy_ticket,
        get_draw_result,
        get_lottery_winners,
        claim_prize,
        get_my_tickets,
        get_prize_tiers,
        get_history,
    ),
    components(schemas(
        Lottery,
        Ticket,
        DlcContract,
        LotteryStats,
        PrizeTier,
        Winner,
        CreateLotteryRequest,
        BuyTicketRequest,
        ClaimPrizeRequest,
    )),
    tags(
        (name = "stats", description = "Lottery statistics"),
        (name = "lotteries", description = "Lottery operations"),
        (name = "user", description = "User ticket operations"),
        (name = "config", description = "Configuration"),
        (name = "history", description = "Historical data"),
    ),
    info(
        title = "Anchor Predictions API",
        version = "1.0.0",
        description = "Trustless lottery with DLC-based payouts on Bitcoin"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchor_lottery_backend=info".into()),
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
        // Lotteries
        .route("/api/lotteries", get(list_lotteries))
        .route("/api/lotteries/create", post(create_lottery))
        .route("/api/lotteries/:id", get(get_lottery))
        .route("/api/lotteries/:id/tickets", get(get_lottery_tickets))
        .route("/api/lotteries/:id/buy", post(buy_ticket))
        .route("/api/lotteries/:id/draw", get(get_draw_result))
        .route("/api/lotteries/:id/winners", get(get_lottery_winners))
        .route("/api/lotteries/:id/claim", post(claim_prize))
        // User
        .route("/api/my/tickets", get(get_my_tickets))
        // Config
        .route("/api/prize-tiers/:lottery_type", get(get_prize_tiers))
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

