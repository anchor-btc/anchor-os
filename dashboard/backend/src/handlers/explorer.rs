//! Block Explorer settings handlers
//! 
//! Allows users to choose a default block explorer for the Anchor OS.
//! Apps can query this setting to generate correct explorer links.

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use tracing::{info, warn};
use utoipa::ToSchema;

use crate::AppState;

/// Available block explorers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub enum BlockExplorer {
    Mempool,
    BtcRpcExplorer,
    Bitfeed,
}

impl BlockExplorer {
    /// Get the container name for this explorer
    pub fn container_name(&self) -> &'static str {
        match self {
            BlockExplorer::Mempool => "anchor-explorer-mempool-web",
            BlockExplorer::BtcRpcExplorer => "anchor-explorer-btc-rpc",
            BlockExplorer::Bitfeed => "anchor-explorer-bitfeed-web",
        }
    }

    /// Get the default port for this explorer
    pub fn port(&self) -> u16 {
        match self {
            BlockExplorer::Mempool => 4000,
            BlockExplorer::BtcRpcExplorer => 4010,
            BlockExplorer::Bitfeed => 4020,
        }
    }

    /// Get the base URL for transaction links
    pub fn tx_url_template(&self) -> &'static str {
        match self {
            BlockExplorer::Mempool => "/tx/{txid}",
            BlockExplorer::BtcRpcExplorer => "/tx/{txid}",
            BlockExplorer::Bitfeed => "/", // Bitfeed doesn't have individual tx pages
        }
    }

    /// Get the base URL for address links
    pub fn address_url_template(&self) -> &'static str {
        match self {
            BlockExplorer::Mempool => "/address/{address}",
            BlockExplorer::BtcRpcExplorer => "/address/{address}",
            BlockExplorer::Bitfeed => "/", // Bitfeed doesn't have individual address pages
        }
    }

    /// Get the display name
    pub fn display_name(&self) -> &'static str {
        match self {
            BlockExplorer::Mempool => "Mempool",
            BlockExplorer::BtcRpcExplorer => "BTC RPC Explorer",
            BlockExplorer::Bitfeed => "Bitfeed",
        }
    }
}

impl std::fmt::Display for BlockExplorer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BlockExplorer::Mempool => write!(f, "mempool"),
            BlockExplorer::BtcRpcExplorer => write!(f, "btc-rpc-explorer"),
            BlockExplorer::Bitfeed => write!(f, "bitfeed"),
        }
    }
}

impl std::str::FromStr for BlockExplorer {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().replace('_', "-").as_str() {
            "mempool" => Ok(BlockExplorer::Mempool),
            "btc-rpc-explorer" | "btcrpcexplorer" => Ok(BlockExplorer::BtcRpcExplorer),
            "bitfeed" => Ok(BlockExplorer::Bitfeed),
            _ => Err(format!("Unknown block explorer: {}", s)),
        }
    }
}

/// Explorer info with status
#[derive(Debug, Serialize, ToSchema)]
pub struct ExplorerInfo {
    /// Explorer identifier
    pub explorer: BlockExplorer,
    /// Display name
    pub name: String,
    /// Container status (running, exited, etc.)
    pub status: Option<String>,
    /// Port number
    pub port: u16,
    /// Whether this explorer is the default
    pub is_default: bool,
    /// Base URL for this explorer
    pub base_url: String,
    /// URL template for transactions
    pub tx_url_template: String,
    /// URL template for addresses  
    pub address_url_template: String,
}

/// Explorer settings response
#[derive(Debug, Serialize, ToSchema)]
pub struct ExplorerSettings {
    /// Currently configured default explorer
    pub default_explorer: BlockExplorer,
    /// All available explorers with their status
    pub explorers: Vec<ExplorerInfo>,
}

/// Set default explorer request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SetDefaultExplorerRequest {
    pub explorer: BlockExplorer,
}

/// Explorer action response
#[derive(Debug, Serialize, ToSchema)]
pub struct ExplorerActionResponse {
    pub success: bool,
    pub message: String,
}

/// Get explorer settings
#[utoipa::path(
    get,
    path = "/explorer/settings",
    tag = "Explorer",
    responses(
        (status = 200, description = "Explorer settings", body = ExplorerSettings),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_explorer_settings(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get configured default explorer from database
    let default_explorer = get_configured_explorer(&state).await.unwrap_or(BlockExplorer::Mempool);

    // Get container statuses
    let explorers = vec![
        BlockExplorer::Mempool,
        BlockExplorer::BtcRpcExplorer,
        BlockExplorer::Bitfeed,
    ];

    let mut explorer_infos = Vec::new();
    for explorer in explorers {
        let status = get_container_status(&state, explorer.container_name()).await;
        explorer_infos.push(ExplorerInfo {
            explorer,
            name: explorer.display_name().to_string(),
            status,
            port: explorer.port(),
            is_default: explorer == default_explorer,
            base_url: format!("http://localhost:{}", explorer.port()),
            tx_url_template: explorer.tx_url_template().to_string(),
            address_url_template: explorer.address_url_template().to_string(),
        });
    }

    Ok(Json(ExplorerSettings {
        default_explorer,
        explorers: explorer_infos,
    }))
}

/// Set the default block explorer
#[utoipa::path(
    post,
    path = "/explorer/set-default",
    tag = "Explorer",
    request_body = SetDefaultExplorerRequest,
    responses(
        (status = 200, description = "Default explorer set successfully", body = ExplorerActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn set_default_explorer(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SetDefaultExplorerRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Setting default block explorer to: {:?}", req.explorer);

    // Save preference to database
    if let Err(e) = save_configured_explorer(&state, req.explorer).await {
        warn!("Failed to save explorer preference: {}", e);
        return Ok(Json(ExplorerActionResponse {
            success: false,
            message: format!("Failed to save preference: {}", e),
        }));
    }

    Ok(Json(ExplorerActionResponse {
        success: true,
        message: format!("{} is now the default block explorer.", req.explorer.display_name()),
    }))
}

/// Get just the default explorer URL info (for apps to query)
#[utoipa::path(
    get,
    path = "/explorer/default",
    tag = "Explorer",
    responses(
        (status = 200, description = "Default explorer info", body = ExplorerInfo),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_default_explorer(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let default_explorer = get_configured_explorer(&state).await.unwrap_or(BlockExplorer::Mempool);
    let status = get_container_status(&state, default_explorer.container_name()).await;

    Ok(Json(ExplorerInfo {
        explorer: default_explorer,
        name: default_explorer.display_name().to_string(),
        status,
        port: default_explorer.port(),
        is_default: true,
        base_url: format!("http://localhost:{}", default_explorer.port()),
        tx_url_template: default_explorer.tx_url_template().to_string(),
        address_url_template: default_explorer.address_url_template().to_string(),
    }))
}

// Helper functions

use std::collections::HashMap;
use bollard::container::ListContainersOptions;

async fn get_container_status(state: &Arc<AppState>, container_name: &str) -> Option<String> {
    let mut filters = HashMap::new();
    filters.insert("name", vec![container_name]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    match state.docker.list_containers(options).await {
        Ok(containers) => containers.first().and_then(|c| c.state.clone()),
        Err(_) => None,
    }
}

async fn get_configured_explorer(state: &Arc<AppState>) -> Result<BlockExplorer, String> {
    let pool = state.db_pool.as_ref().ok_or("Database not available")?;

    let row = sqlx::query("SELECT value FROM system_settings WHERE key = 'default_explorer'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(row) => {
            let value: serde_json::Value = row.get("value");
            let explorer_str = value.as_str().unwrap_or("mempool");
            explorer_str.parse()
        }
        None => Ok(BlockExplorer::Mempool),
    }
}

async fn save_configured_explorer(state: &Arc<AppState>, explorer: BlockExplorer) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("Database not available")?;

    let value = serde_json::json!(explorer.to_string());

    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('default_explorer', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
    )
    .bind(&value)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

