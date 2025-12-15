//! ANCHOR Wallet Service
//!
//! HTTP API for creating and broadcasting ANCHOR transactions.

mod config;
mod handlers;
mod wallet;

use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::wallet::WalletService;

/// Application state shared across handlers
pub struct AppState {
    pub wallet: WalletService,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "ANCHOR Wallet API",
        version = "1.0.0",
        description = "HTTP API for creating and broadcasting ANCHOR protocol transactions on Bitcoin",
        license(name = "MIT", url = "https://opensource.org/licenses/MIT"),
        contact(name = "ANCHOR Protocol", url = "https://github.com/AnchorProtocol/anchor")
    ),
    paths(
        handlers::health,
        handlers::get_balance,
        handlers::get_new_address,
        handlers::list_utxos,
        handlers::create_message,
        handlers::broadcast,
        handlers::mine_blocks,
    ),
    components(schemas(
        handlers::HealthResponse,
        handlers::CreateMessageRequest,
        handlers::CreateMessageResponse,
        handlers::AnchorRef,
        handlers::AddressResponse,
        handlers::BroadcastRequest,
        handlers::BroadcastResponse,
        handlers::MineRequest,
        handlers::MineResponse,
    )),
    tags(
        (name = "System", description = "System health endpoints"),
        (name = "Wallet", description = "Wallet operations"),
        (name = "ANCHOR", description = "ANCHOR message creation"),
        (name = "Transactions", description = "Transaction operations"),
        (name = "Mining", description = "Block mining (regtest only)"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("Starting ANCHOR Wallet Service");

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    // Create wallet service
    let wallet = WalletService::new(&config)?;
    info!("Wallet service initialized");

    // Create application state
    let state = Arc::new(AppState { wallet });

    // Build router
    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/health", get(handlers::health))
        .route("/wallet/balance", get(handlers::get_balance))
        .route("/wallet/address", get(handlers::get_new_address))
        .route("/wallet/utxos", get(handlers::list_utxos))
        .route("/wallet/create-message", post(handlers::create_message))
        .route("/wallet/broadcast", post(handlers::broadcast))
        .route("/wallet/mine", post(handlers::mine_blocks))
        .route("/wallet/rawtx/:txid", get(handlers::get_raw_tx))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    info!("Swagger UI available at http://localhost:{}/swagger-ui/", config.port);

    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

