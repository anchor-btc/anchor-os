//! ANCHOR Dashboard Backend
//!
//! Control panel for managing the entire Anchor stack.

mod config;
mod handlers;

use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use bollard::Docker;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;

/// Application state shared across handlers
pub struct AppState {
    pub config: Config,
    pub docker: Docker,
    pub http_client: reqwest::Client,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "ANCHOR Dashboard API",
        version = "1.0.0",
        description = "Control panel API for managing the Anchor stack",
        license(name = "MIT", url = "https://opensource.org/licenses/MIT")
    ),
    paths(
        handlers::health,
        handlers::docker::list_containers,
        handlers::docker::start_container,
        handlers::docker::stop_container,
        handlers::docker::restart_container,
        handlers::docker::get_container_logs,
        handlers::docker::exec_container,
        handlers::bitcoin::get_blockchain_info,
        handlers::bitcoin::get_mempool_info,
        handlers::bitcoin::get_network_info,
        handlers::bitcoin::get_node_status,
        handlers::wallet::get_balance,
        handlers::wallet::get_new_address,
        handlers::wallet::list_utxos,
        handlers::wallet::get_transactions,
        handlers::wallet::mine_blocks,
        handlers::node::get_node_config,
        handlers::node::switch_node,
        handlers::node::get_node_versions,
        handlers::tailscale::get_tailscale_status,
        handlers::tailscale::connect_tailscale,
        handlers::tailscale::disconnect_tailscale,
        handlers::cloudflare::get_cloudflare_status,
        handlers::cloudflare::connect_cloudflare,
        handlers::cloudflare::disconnect_cloudflare,
        handlers::cloudflare::get_exposable_services,
    ),
    components(schemas(
        handlers::HealthResponse,
        handlers::docker::ContainerInfo,
        handlers::docker::ContainersResponse,
        handlers::docker::ContainerActionResponse,
        handlers::docker::ContainerLogsResponse,
        handlers::docker::ExecRequest,
        handlers::docker::ExecResponse,
        handlers::bitcoin::BlockchainInfo,
        handlers::bitcoin::MempoolInfo,
        handlers::bitcoin::NetworkInfo,
        handlers::bitcoin::NodeStatus,
        handlers::bitcoin::LocalAddress,
        handlers::wallet::WalletBalance,
        handlers::wallet::AddressResponse,
        handlers::wallet::Utxo,
        handlers::wallet::SendRequest,
        handlers::wallet::SendResponse,
        handlers::wallet::TransactionInfo,
        handlers::wallet::MineRequest,
        handlers::wallet::MineResponse,
        handlers::node::NodeConfig,
        handlers::node::VersionInfo,
        handlers::node::SwitchVersionRequest,
        handlers::node::SwitchVersionResponse,
        handlers::tailscale::TailscaleStatus,
        handlers::tailscale::TailscaleAuthRequest,
        handlers::tailscale::TailscaleActionResponse,
        handlers::cloudflare::CloudflareStatus,
        handlers::cloudflare::CloudflareConnectRequest,
        handlers::cloudflare::CloudflareActionResponse,
        handlers::cloudflare::ExposableService,
        handlers::cloudflare::ExposableServicesResponse,
    )),
    tags(
        (name = "System", description = "System health endpoints"),
        (name = "Docker", description = "Docker container management"),
        (name = "Bitcoin", description = "Bitcoin node information"),
        (name = "Wallet", description = "Wallet operations"),
        (name = "Node", description = "Node type management"),
        (name = "Tailscale", description = "Tailscale VPN management"),
        (name = "Cloudflare", description = "Cloudflare Tunnel management"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("Starting ANCHOR Dashboard Backend");

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    // Connect to Docker
    let docker = Docker::connect_with_socket_defaults()?;
    info!("Connected to Docker daemon");

    // Create HTTP client
    let http_client = reqwest::Client::new();

    // Create application state
    let state = Arc::new(AppState {
        config: config.clone(),
        docker,
        http_client,
    });

    // Build router
    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // System
        .route("/health", get(handlers::health))
        // Docker
        .route("/docker/containers", get(handlers::docker::list_containers))
        .route(
            "/docker/containers/:id/start",
            post(handlers::docker::start_container),
        )
        .route(
            "/docker/containers/:id/stop",
            post(handlers::docker::stop_container),
        )
        .route(
            "/docker/containers/:id/restart",
            post(handlers::docker::restart_container),
        )
        .route(
            "/docker/containers/:id/logs",
            get(handlers::docker::get_container_logs),
        )
        .route(
            "/docker/containers/:id/exec",
            post(handlers::docker::exec_container),
        )
        // Bitcoin
        .route("/bitcoin/info", get(handlers::bitcoin::get_blockchain_info))
        .route(
            "/bitcoin/mempool",
            get(handlers::bitcoin::get_mempool_info),
        )
        .route(
            "/bitcoin/network",
            get(handlers::bitcoin::get_network_info),
        )
        .route("/bitcoin/status", get(handlers::bitcoin::get_node_status))
        // Wallet
        .route("/wallet/balance", get(handlers::wallet::get_balance))
        .route("/wallet/address", get(handlers::wallet::get_new_address))
        .route("/wallet/utxos", get(handlers::wallet::list_utxos))
        .route(
            "/wallet/transactions",
            get(handlers::wallet::get_transactions),
        )
        .route("/wallet/mine", post(handlers::wallet::mine_blocks))
        // Node management
        .route("/node/config", get(handlers::node::get_node_config))
        .route("/node/switch", post(handlers::node::switch_node))
        .route("/node/versions", get(handlers::node::get_node_versions))
        // Tailscale
        .route("/tailscale/status", get(handlers::tailscale::get_tailscale_status))
        .route("/tailscale/connect", post(handlers::tailscale::connect_tailscale))
        .route("/tailscale/disconnect", post(handlers::tailscale::disconnect_tailscale))
        // Cloudflare
        .route("/cloudflare/status", get(handlers::cloudflare::get_cloudflare_status))
        .route("/cloudflare/connect", post(handlers::cloudflare::connect_cloudflare))
        .route("/cloudflare/disconnect", post(handlers::cloudflare::disconnect_cloudflare))
        .route("/cloudflare/services", get(handlers::cloudflare::get_exposable_services))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    info!(
        "Swagger UI available at http://{}:{}/swagger-ui/",
        config.host, config.port
    );

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

