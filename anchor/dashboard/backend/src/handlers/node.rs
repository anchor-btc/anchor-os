//! Node management handlers
//!
//! Endpoints for managing Bitcoin Core versions

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
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
        "30.0" => ("May 2024", vec![
            "Default v2 transport (BIP324)".to_string(),
            "Improved wallet performance".to_string(),
            "New RPC commands".to_string(),
        ]),
        "29.0" => ("Dec 2024", vec![
            "Ephemeral dust support".to_string(),
            "Fee estimation improvements".to_string(),
            "P2P protocol updates".to_string(),
        ]),
        "28.0" => ("Oct 2024", vec![
            "Testnet4 support".to_string(),
            "JSON-RPC 2.0 support".to_string(),
            "assumeUTXO improvements".to_string(),
        ]),
        "27.0" => ("Apr 2024", vec![
            "v2 transport enabled".to_string(),
            "Wallet migration improvements".to_string(),
            "Mempool policy updates".to_string(),
        ]),
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
            let running = containers.iter().any(|c| c.state.as_deref() == Some("running"));
            
            // Try to get version from image tag
            let version = containers.first()
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
    info!("Switching to Bitcoin Core version: {}, network: {}", req.version, req.network);

    // Validate version
    if !BITCOIN_VERSIONS.contains(&req.version.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid version: {}. Available: {:?}", req.version, BITCOIN_VERSIONS),
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
