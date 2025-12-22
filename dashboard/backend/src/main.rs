//! ANCHOR Dashboard Backend
//!
//! Control panel for managing the entire Anchor stack.

mod backup;
mod backup_config;
mod config;
mod handlers;
mod monitors;
mod scheduler;
mod storage;

use anyhow::Result;
use axum::{
    routing::{get, post, put, delete},
    Router,
};
use bollard::Docker;
use sqlx::PgPool;
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
    pub db_pool: Option<PgPool>,
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
        handlers::docker::get_docker_stats,
        handlers::docker::shutdown_all,
        handlers::docker::restart_all,
        handlers::bitcoin::get_blockchain_info,
        handlers::bitcoin::get_mempool_info,
        handlers::bitcoin::get_network_info,
        handlers::bitcoin::get_node_status,
        handlers::wallet::get_balance,
        handlers::wallet::get_new_address,
        handlers::wallet::list_utxos,
        handlers::wallet::get_transactions,
        handlers::wallet::mine_blocks,
        handlers::wallet::list_locked_utxos,
        handlers::wallet::list_unlocked_utxos,
        handlers::wallet::lock_utxos,
        handlers::wallet::unlock_utxos,
        handlers::wallet::sync_locks,
        handlers::wallet::get_lock_settings,
        handlers::wallet::set_auto_lock,
        handlers::wallet::get_assets,
        handlers::wallet::get_assets_domains,
        handlers::wallet::get_assets_tokens,
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
        handlers::indexer::get_indexer_stats,
        handlers::tor::get_tor_status,
        handlers::tor::get_onion_addresses_handler,
        handlers::tor::new_tor_circuit,
        handlers::tor::enable_tor,
        handlers::tor::disable_tor,
        handlers::installation::get_installation_status,
        handlers::installation::get_services,
        handlers::installation::apply_preset,
        handlers::installation::apply_custom,
        handlers::installation::complete_setup,
        handlers::installation::install_service,
        handlers::installation::uninstall_service,
        handlers::installation::get_profiles,
        handlers::installation::reset_installation,
        handlers::profile::get_profile,
        handlers::profile::update_profile,
        handlers::notifications::list_notifications,
        handlers::notifications::get_unread_count,
        handlers::notifications::create_notification,
        handlers::notifications::mark_as_read,
        handlers::notifications::mark_all_as_read,
        handlers::notifications::delete_notification,
        handlers::notifications::clear_read_notifications,
    ),
    components(schemas(
        handlers::HealthResponse,
        handlers::docker::ContainerInfo,
        handlers::docker::ContainersResponse,
        handlers::docker::ContainerActionResponse,
        handlers::docker::BulkActionResponse,
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
        handlers::wallet::LockedUtxo,
        handlers::wallet::LockResponse,
        handlers::wallet::LockSettings,
        handlers::wallet::SyncLocksResponse,
        handlers::wallet::DomainAsset,
        handlers::wallet::TokenAsset,
        handlers::wallet::AssetsOverview,
        handlers::wallet::LockRequest,
        handlers::wallet::UnlockRequest,
        handlers::wallet::UtxoRef,
        handlers::wallet::SetAutoLockRequest,
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
        handlers::indexer::IndexerStats,
        handlers::indexer::MessageKindCount,
        handlers::tor::TorStatus,
        handlers::tor::TorActionResponse,
        handlers::tor::OnionAddresses,
        handlers::installation::InstallationPreset,
        handlers::installation::ServiceInstallStatus,
        handlers::installation::ServiceCategory,
        handlers::installation::ServiceDefinition,
        handlers::installation::InstallationStatus,
        handlers::installation::ServicesListResponse,
        handlers::installation::PresetInfo,
        handlers::installation::ApplyPresetRequest,
        handlers::installation::CustomInstallRequest,
        handlers::installation::InstallationActionResponse,
        handlers::installation::ServiceActionRequest,
        handlers::installation::ResetInstallationRequest,
        handlers::profile::UserProfile,
        handlers::profile::UpdateProfileRequest,
        handlers::profile::ProfileResponse,
        handlers::notifications::Notification,
        handlers::notifications::NotificationsListResponse,
        handlers::notifications::UnreadCountResponse,
        handlers::notifications::CreateNotificationRequest,
        handlers::notifications::NotificationActionResponse,
    )),
    tags(
        (name = "System", description = "System health endpoints"),
        (name = "Docker", description = "Docker container management"),
        (name = "Bitcoin", description = "Bitcoin node information"),
        (name = "Wallet", description = "Wallet operations"),
        (name = "Node", description = "Node type management"),
        (name = "Tailscale", description = "Tailscale VPN management"),
        (name = "Cloudflare", description = "Cloudflare Tunnel management"),
        (name = "Tor", description = "Tor network management"),
        (name = "Indexer", description = "Anchor indexer statistics"),
        (name = "Installation", description = "Installation and setup wizard"),
        (name = "Profile", description = "User profile management"),
        (name = "Notifications", description = "System notifications management"),
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

    // Connect to PostgreSQL (optional - settings features won't work without it)
    let db_pool = if let Ok(database_url) = std::env::var("DATABASE_URL") {
        match PgPool::connect(&database_url).await {
            Ok(pool) => {
                info!("Connected to PostgreSQL database");
                // Run migrations
                match sqlx::query(include_str!("../migrations/001_system_settings.sql"))
                    .execute(&pool)
                    .await
                {
                    Ok(_) => info!("Database migration 001 applied"),
                    Err(e) => info!("Migration 001 may already exist: {}", e),
                }
                match sqlx::query(include_str!("../migrations/002_tor_settings.sql"))
                    .execute(&pool)
                    .await
                {
                    Ok(_) => info!("Database migration 002 applied"),
                    Err(e) => info!("Migration 002 may already exist: {}", e),
                }
                match sqlx::query(include_str!("../migrations/003_electrum_setting.sql"))
                    .execute(&pool)
                    .await
                {
                    Ok(_) => info!("Database migration 003 applied"),
                    Err(e) => info!("Migration 003 may already exist: {}", e),
                }
                // Migration 004 - installation_config (multi-statement, run each separately)
                let migration_004_statements = [
                    "CREATE TABLE IF NOT EXISTS installation_config (
                        id SERIAL PRIMARY KEY,
                        preset VARCHAR(20) NOT NULL DEFAULT 'default',
                        services JSONB NOT NULL DEFAULT '{}',
                        setup_completed BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )",
                    "INSERT INTO installation_config (preset, services, setup_completed)
                     SELECT 'default', '{}', FALSE
                     WHERE NOT EXISTS (SELECT 1 FROM installation_config WHERE id = 1)",
                    "CREATE TABLE IF NOT EXISTS service_status (
                        id SERIAL PRIMARY KEY,
                        service_id VARCHAR(100) NOT NULL UNIQUE,
                        install_status VARCHAR(20) NOT NULL DEFAULT 'not_installed',
                        enabled BOOLEAN DEFAULT FALSE,
                        last_health_check TIMESTAMP WITH TIME ZONE,
                        error_message TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT valid_install_status CHECK (install_status IN ('not_installed', 'installed', 'installing', 'failed'))
                    )",
                    "CREATE INDEX IF NOT EXISTS idx_service_status_service_id ON service_status(service_id)",
                    "CREATE INDEX IF NOT EXISTS idx_service_status_install_status ON service_status(install_status)",
                ];
                for stmt in migration_004_statements {
                    let _ = sqlx::query(stmt).execute(&pool).await;
                }
                info!("Database migration 004 applied");

                // Migration 005 - user_profile (multi-statement, run each separately)
                let migration_005_statements = [
                    "CREATE TABLE IF NOT EXISTS user_profile (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL DEFAULT 'Bitcoiner',
                        avatar_url TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )",
                    "INSERT INTO user_profile (name)
                     SELECT 'Bitcoiner'
                     WHERE NOT EXISTS (SELECT 1 FROM user_profile WHERE id = 1)",
                ];
                for stmt in migration_005_statements {
                    let _ = sqlx::query(stmt).execute(&pool).await;
                }
                info!("Database migration 005 applied");

                // Migration 006 - notifications (multi-statement, run each separately)
                let migration_006_statements = [
                    "CREATE TABLE IF NOT EXISTS notifications (
                        id SERIAL PRIMARY KEY,
                        notification_type VARCHAR(50) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        message TEXT,
                        severity VARCHAR(20) DEFAULT 'info',
                        read BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )",
                    "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)",
                    "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)",
                    "CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type)",
                ];
                for stmt in migration_006_statements {
                    let _ = sqlx::query(stmt).execute(&pool).await;
                }
                info!("Database migration 006 applied");
                Some(pool)
            }
            Err(e) => {
                info!("PostgreSQL not available (settings features disabled): {}", e);
                None
            }
        }
    } else {
        info!("DATABASE_URL not set, settings features disabled");
        None
    };

    // Start background monitors if database is available
    if let Some(ref pool) = db_pool {
        monitors::start_monitors(
            Docker::connect_with_socket_defaults().unwrap(),
            reqwest::Client::new(),
            pool.clone(),
            config.bitcoin_rpc_url.clone(),
            config.bitcoin_rpc_user.clone(),
            config.bitcoin_rpc_password.clone(),
        );
    }

    // Create application state
    let state = Arc::new(AppState {
        config: config.clone(),
        docker,
        http_client,
        db_pool,
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
        .route("/docker/stats", get(handlers::docker::get_docker_stats))
        .route("/docker/shutdown", post(handlers::docker::shutdown_all))
        .route("/docker/restart-all", post(handlers::docker::restart_all))
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
        .route("/wallet/utxos/locked", get(handlers::wallet::list_locked_utxos))
        .route("/wallet/utxos/unlocked", get(handlers::wallet::list_unlocked_utxos))
        .route("/wallet/utxos/lock", post(handlers::wallet::lock_utxos))
        .route("/wallet/utxos/unlock", post(handlers::wallet::unlock_utxos))
        .route("/wallet/utxos/sync-locks", post(handlers::wallet::sync_locks))
        .route("/wallet/locks/settings", get(handlers::wallet::get_lock_settings))
        .route("/wallet/locks/auto-lock", post(handlers::wallet::set_auto_lock))
        .route("/wallet/assets", get(handlers::wallet::get_assets))
        .route("/wallet/assets/domains", get(handlers::wallet::get_assets_domains))
        .route("/wallet/assets/tokens", get(handlers::wallet::get_assets_tokens))
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
        // Tor
        .route("/tor/status", get(handlers::tor::get_tor_status))
        .route("/tor/onion-addresses", get(handlers::tor::get_onion_addresses_handler))
        .route("/tor/new-circuit", post(handlers::tor::new_tor_circuit))
        .route("/tor/enable", post(handlers::tor::enable_tor))
        .route("/tor/disable", post(handlers::tor::disable_tor))
        // Electrum (Electrs/Fulcrum switching)
        .route("/electrum/status", get(handlers::electrum::get_electrum_status))
        .route("/electrum/switch", post(handlers::electrum::switch_electrum_server))
        .route("/electrum/info", get(handlers::electrum::get_electrum_info))
        // Indexer
        .route("/indexer/stats", get(handlers::indexer::get_indexer_stats))
        // Installation
        .route("/installation/status", get(handlers::installation::get_installation_status))
        .route("/installation/services", get(handlers::installation::get_services))
        .route("/installation/preset", post(handlers::installation::apply_preset))
        .route("/installation/custom", post(handlers::installation::apply_custom))
        .route("/installation/complete", post(handlers::installation::complete_setup))
        .route("/installation/service/install", post(handlers::installation::install_service))
        .route("/installation/service/uninstall", post(handlers::installation::uninstall_service))
        .route("/installation/profiles", get(handlers::installation::get_profiles))
        .route("/installation/reset", post(handlers::installation::reset_installation))
        .route("/installation/stream", get(handlers::installation::stream_installation))
        // Profile
        .route("/profile", get(handlers::profile::get_profile))
        .route("/profile", put(handlers::profile::update_profile))
        // Settings
        .route("/settings", get(handlers::settings::get_all_settings))
        .route("/settings/export", get(handlers::settings::export_settings))
        .route("/settings/import", post(handlers::settings::import_settings))
        .route("/settings/{key}", get(handlers::settings::get_setting))
        .route("/settings/{key}", put(handlers::settings::update_setting))
        // Auth
        .route("/auth/status", get(handlers::auth::get_auth_status))
        .route("/auth/setup", post(handlers::auth::setup_password))
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/verify", post(handlers::auth::verify_token))
        .route("/auth/change-password", post(handlers::auth::change_password))
        .route("/auth/disable", delete(handlers::auth::disable_auth))
        // Notifications
        .route("/notifications", get(handlers::notifications::list_notifications))
        .route("/notifications", post(handlers::notifications::create_notification))
        .route("/notifications/unread-count", get(handlers::notifications::get_unread_count))
        .route("/notifications/read-all", put(handlers::notifications::mark_all_as_read))
        .route("/notifications/clear-read", delete(handlers::notifications::clear_read_notifications))
        .route("/notifications/{id}/read", put(handlers::notifications::mark_as_read))
        .route("/notifications/{id}", delete(handlers::notifications::delete_notification))
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

