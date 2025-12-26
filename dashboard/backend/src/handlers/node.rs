//! Node management handlers
//!
//! Endpoints for managing Bitcoin Core versions

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use bollard::container::ListContainersOptions;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

/// Available Bitcoin Core versions
pub const BITCOIN_VERSIONS: &[&str] = &["30.0", "29.0", "28.0", "27.0"];
pub const DEFAULT_VERSION: &str = "30.0";

/// Version info
#[derive(Debug, Serialize, ToSchema)]
pub struct VersionInfo {
    pub version: String,
    pub is_default: bool,
    pub release_date: String,
    pub features: Vec<String>,
}

/// Current node configuration
#[derive(Debug, Serialize, ToSchema)]
pub struct NodeConfig {
    pub current_version: Option<String>,
    pub current_network: String,
    pub is_running: bool,
    pub available_versions: Vec<VersionInfo>,
}

/// Switch version request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SwitchVersionRequest {
    pub version: String,
    #[serde(default = "default_network")]
    pub network: String,
}

fn default_network() -> String {
    "regtest".to_string()
}

/// Switch version response
#[derive(Debug, Serialize, ToSchema)]
pub struct SwitchVersionResponse {
    pub success: bool,
    pub message: String,
    pub version: String,
    pub network: String,
    pub requires_rebuild: bool,
}

fn get_version_info(version: &str) -> VersionInfo {
    let (release_date, features) = match version {
        "30.0" => (
            "May 2024",
            vec![
                "Default v2 transport (BIP324)".to_string(),
                "Improved wallet performance".to_string(),
                "New RPC commands".to_string(),
            ],
        ),
        "29.0" => (
            "Dec 2024",
            vec![
                "Ephemeral dust support".to_string(),
                "Fee estimation improvements".to_string(),
                "P2P protocol updates".to_string(),
            ],
        ),
        "28.0" => (
            "Oct 2024",
            vec![
                "Testnet4 support".to_string(),
                "JSON-RPC 2.0 support".to_string(),
                "assumeUTXO improvements".to_string(),
            ],
        ),
        "27.0" => (
            "Apr 2024",
            vec![
                "v2 transport enabled".to_string(),
                "Wallet migration improvements".to_string(),
                "Mempool policy updates".to_string(),
            ],
        ),
        _ => ("Unknown", vec![]),
    };

    VersionInfo {
        version: version.to_string(),
        is_default: version == DEFAULT_VERSION,
        release_date: release_date.to_string(),
        features,
    }
}

/// Get current node configuration
#[utoipa::path(
    get,
    path = "/node/config",
    tag = "Node",
    responses(
        (status = 200, description = "Current node configuration", body = NodeConfig),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_node_config(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Check if Bitcoin node container is running
    let mut filters = HashMap::new();
    filters.insert("name", vec!["anchor-core-bitcoin"]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let (is_running, current_version) = match state.docker.list_containers(options).await {
        Ok(containers) => {
            let running = containers
                .iter()
                .any(|c| c.state.as_deref() == Some("running"));

            // Try to get version from image tag
            let version = containers
                .first()
                .and_then(|c| c.image.as_ref())
                .map(|img| {
                    // Extract version from image name if available
                    if img.contains("bitcoin-core") {
                        // For now, assume default version
                        DEFAULT_VERSION.to_string()
                    } else {
                        DEFAULT_VERSION.to_string()
                    }
                });

            (running, version)
        }
        Err(e) => {
            error!("Failed to list containers: {}", e);
            (false, None)
        }
    };

    let available_versions: Vec<VersionInfo> = BITCOIN_VERSIONS
        .iter()
        .map(|v| get_version_info(v))
        .collect();

    Ok(Json(NodeConfig {
        current_version,
        current_network: "regtest".to_string(),
        is_running,
        available_versions,
    }))
}

/// Switch to a different Bitcoin Core version
#[utoipa::path(
    post,
    path = "/node/switch",
    tag = "Node",
    request_body = SwitchVersionRequest,
    responses(
        (status = 200, description = "Version switch initiated", body = SwitchVersionResponse),
        (status = 400, description = "Invalid version"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn switch_node(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<SwitchVersionRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(
        "Switching to Bitcoin Core version: {}, network: {}",
        req.version, req.network
    );

    // Validate version
    if !BITCOIN_VERSIONS.contains(&req.version.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Invalid version: {}. Available: {:?}",
                req.version, BITCOIN_VERSIONS
            ),
        ));
    }

    // Switching versions requires rebuilding the Docker image
    // The actual switch is done via docker-compose with build args
    Ok(Json(SwitchVersionResponse {
        success: true,
        message: format!(
            "To switch to Bitcoin Core v{}, run:\n\
            docker compose build --build-arg BITCOIN_VERSION={} core-bitcoin\n\
            docker compose up -d core-bitcoin",
            req.version, req.version
        ),
        version: req.version,
        network: req.network,
        requires_rebuild: true,
    }))
}

/// Get available Bitcoin Core versions
#[utoipa::path(
    get,
    path = "/node/versions",
    tag = "Node",
    responses(
        (status = 200, description = "Available versions", body = Vec<VersionInfo>),
    )
)]
pub async fn get_node_versions() -> impl IntoResponse {
    let versions: Vec<VersionInfo> = BITCOIN_VERSIONS
        .iter()
        .map(|v| get_version_info(v))
        .collect();

    Json(versions)
}

// =============================================
// Node Settings Configuration
// =============================================

/// Node settings configuration
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NodeSettings {
    // Network settings
    pub network: String,
    pub listen: bool,
    pub maxconnections: i32,
    pub bantime: i32,
    // Mempool settings
    pub maxmempool: i32,
    pub mempoolexpiry: i32,
    pub minrelaytxfee: f64,
    pub datacarriersize: i32,
    // RPC settings
    pub rpcuser: String,
    pub rpcpassword: String,
    pub rpcport: i32,
    pub rpcthreads: i32,
    // Tor settings
    pub proxy: String,
    pub listenonion: bool,
    pub onlynet: String,
    // Performance settings
    pub dbcache: i32,
    pub prune: i32,
    pub txindex: bool,
    pub blockfilterindex: bool,
    pub coinstatsindex: bool,
    pub logtimestamps: bool,
}

impl Default for NodeSettings {
    fn default() -> Self {
        Self {
            network: "regtest".to_string(),
            listen: true,
            maxconnections: 125,
            bantime: 86400,
            maxmempool: 300,
            mempoolexpiry: 336,
            minrelaytxfee: 0.00001,
            datacarriersize: 100000,
            rpcuser: "anchor".to_string(),
            rpcpassword: "anchor".to_string(),
            rpcport: 18443,
            rpcthreads: 4,
            proxy: String::new(),
            listenonion: false,
            onlynet: String::new(),
            dbcache: 450,
            prune: 0,
            txindex: true,
            blockfilterindex: false,
            coinstatsindex: false,
            logtimestamps: true,
        }
    }
}

/// Node settings response
#[derive(Debug, Serialize, ToSchema)]
pub struct NodeSettingsResponse {
    pub settings: NodeSettings,
    pub config_path: String,
}

/// Update settings request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateNodeSettingsRequest {
    pub settings: NodeSettings,
}

/// Update settings response
#[derive(Debug, Serialize, ToSchema)]
pub struct UpdateNodeSettingsResponse {
    pub success: bool,
    pub message: String,
    pub requires_restart: bool,
}

/// Get node settings
#[utoipa::path(
    get,
    path = "/node/settings",
    tag = "Node",
    responses(
        (status = 200, description = "Current node settings", body = NodeSettingsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_node_settings(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Try to read settings from database
    let settings = if let Some(pool) = &state.db_pool {
        let result = sqlx::query_scalar::<_, serde_json::Value>(
            "SELECT value FROM system_settings WHERE key = 'node_settings'",
        )
        .fetch_optional(pool)
        .await;

        match result {
            Ok(Some(json_value)) => serde_json::from_value(json_value).unwrap_or_default(),
            _ => NodeSettings::default(),
        }
    } else {
        NodeSettings::default()
    };

    Ok(Json(NodeSettingsResponse {
        settings,
        config_path: "/data/bitcoin/bitcoin.conf".to_string(),
    }))
}

/// Update node settings
#[utoipa::path(
    put,
    path = "/node/settings",
    tag = "Node",
    request_body = UpdateNodeSettingsRequest,
    responses(
        (status = 200, description = "Settings updated", body = UpdateNodeSettingsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_node_settings(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateNodeSettingsRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Updating node settings");

    // Save to database
    if let Some(pool) = &state.db_pool {
        let settings_json = serde_json::to_value(&req.settings)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        sqlx::query(
            "INSERT INTO system_settings (key, value, updated_at) VALUES ('node_settings', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
        )
        .bind(&settings_json)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Generate bitcoin.conf content
    let config_content = generate_bitcoin_conf(&req.settings);
    info!("Generated bitcoin.conf:\n{}", config_content);

    // Note: Actually writing the config file would require mounting the config volume
    // For now, we just save the settings and the user can manually apply them

    Ok(Json(UpdateNodeSettingsResponse {
        success: true,
        message: "Settings saved. Restart the node to apply changes.".to_string(),
        requires_restart: true,
    }))
}

/// Generate bitcoin.conf content from settings
fn generate_bitcoin_conf(settings: &NodeSettings) -> String {
    let mut lines = Vec::new();

    lines.push("# Bitcoin Core configuration generated by ANCHOR Dashboard".to_string());
    lines.push(format!("# Generated at: {}", chrono::Utc::now()));
    lines.push(String::new());

    // Common settings
    lines.push("# Common Settings".to_string());
    lines.push(format!("rpcuser={}", settings.rpcuser));
    lines.push(format!("rpcpassword={}", settings.rpcpassword));
    lines.push("server=1".to_string());
    lines.push("daemon=0".to_string());
    lines.push(format!("listen={}", if settings.listen { 1 } else { 0 }));
    lines.push(format!("txindex={}", if settings.txindex { 1 } else { 0 }));
    lines.push(format!("datacarriersize={}", settings.datacarriersize));
    lines.push(format!("maxconnections={}", settings.maxconnections));
    lines.push(format!("bantime={}", settings.bantime));
    lines.push(format!("maxmempool={}", settings.maxmempool));
    lines.push(format!("mempoolexpiry={}", settings.mempoolexpiry));
    lines.push(format!("minrelaytxfee={:.8}", settings.minrelaytxfee));
    lines.push(format!("dbcache={}", settings.dbcache));
    lines.push(format!("rpcthreads={}", settings.rpcthreads));

    if settings.prune > 0 {
        lines.push(format!("prune={}", settings.prune));
    }

    if settings.blockfilterindex {
        lines.push("blockfilterindex=1".to_string());
    }

    if settings.coinstatsindex {
        lines.push("coinstatsindex=1".to_string());
    }

    if settings.logtimestamps {
        lines.push("logtimestamps=1".to_string());
    }

    lines.push("printtoconsole=1".to_string());
    lines.push(String::new());

    // Network-specific settings
    let network_section = match settings.network.as_str() {
        "regtest" => "[regtest]",
        "testnet" => "[test]",
        "signet" => "[signet]",
        "mainnet" => "[main]",
        _ => "[regtest]",
    };

    lines.push(format!("# {} Settings", settings.network.to_uppercase()));
    lines.push(network_section.to_string());
    lines.push(format!("rpcport={}", settings.rpcport));
    lines.push("rpcbind=0.0.0.0".to_string());
    lines.push("rpcallowip=0.0.0.0/0".to_string());

    if settings.network == "regtest" {
        lines.push("acceptnonstdtxn=1".to_string());
        lines.push("fallbackfee=0.00001".to_string());
        lines.push("wallet=anchor_wallet".to_string());
        // ZMQ for regtest
        lines.push("zmqpubrawblock=tcp://0.0.0.0:29000".to_string());
        lines.push("zmqpubrawtx=tcp://0.0.0.0:29001".to_string());
        lines.push("zmqpubsequence=tcp://0.0.0.0:29002".to_string());
    }

    lines.push(String::new());

    // Tor settings
    if !settings.proxy.is_empty() || settings.listenonion || !settings.onlynet.is_empty() {
        lines.push("# Tor Settings".to_string());

        if !settings.proxy.is_empty() {
            lines.push(format!("proxy={}", settings.proxy));
        }

        if settings.listenonion {
            lines.push("listenonion=1".to_string());
        }

        if !settings.onlynet.is_empty() {
            lines.push(format!("onlynet={}", settings.onlynet));
        }
    }

    lines.join("\n")
}

/// Reset node settings to defaults
#[utoipa::path(
    post,
    path = "/node/settings/reset",
    tag = "Node",
    responses(
        (status = 200, description = "Settings reset to defaults", body = NodeSettingsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn reset_node_settings(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Resetting node settings to defaults");

    let default_settings = NodeSettings::default();

    // Save defaults to database
    if let Some(pool) = &state.db_pool {
        let settings_json = serde_json::to_value(&default_settings)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        sqlx::query(
            "INSERT INTO system_settings (key, value, updated_at) VALUES ('node_settings', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
        )
        .bind(&settings_json)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(NodeSettingsResponse {
        settings: default_settings,
        config_path: "/data/bitcoin/bitcoin.conf".to_string(),
    }))
}
