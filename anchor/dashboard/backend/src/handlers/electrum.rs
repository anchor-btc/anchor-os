//! Electrum server management handlers (Electrs vs Fulcrum)

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::container::{ListContainersOptions, StopContainerOptions, StartContainerOptions};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use utoipa::ToSchema;

use crate::AppState;

// Container names
const ELECTRS_CONTAINER: &str = "anchor-core-electrs";
const FULCRUM_CONTAINER: &str = "anchor-core-fulcrum";

// Dependent services that need to be restarted when switching
const DEPENDENT_CONTAINERS: &[&str] = &[
    "anchor-explorer-mempool-api",
    "anchor-explorer-btc-rpc",
];

/// Electrum server types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ElectrumServer {
    Electrs,
    Fulcrum,
}

impl std::fmt::Display for ElectrumServer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ElectrumServer::Electrs => write!(f, "electrs"),
            ElectrumServer::Fulcrum => write!(f, "fulcrum"),
        }
    }
}

impl std::str::FromStr for ElectrumServer {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "electrs" => Ok(ElectrumServer::Electrs),
            "fulcrum" => Ok(ElectrumServer::Fulcrum),
            _ => Err(format!("Unknown electrum server: {}", s)),
        }
    }
}

/// Electrum status response
#[derive(Debug, Serialize, ToSchema)]
pub struct ElectrumStatus {
    /// Currently configured server preference
    pub configured_server: ElectrumServer,
    /// Which server is actually running (if any)
    pub active_server: Option<ElectrumServer>,
    /// Electrs container status
    pub electrs_status: Option<String>,
    /// Fulcrum container status
    pub fulcrum_status: Option<String>,
    /// Whether the electrum port (50001) is available
    pub port_available: bool,
    /// Sync status of the active server
    pub sync_status: Option<String>,
}

/// Electrum switch request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ElectrumSwitchRequest {
    pub server: ElectrumServer,
}

/// Electrum action response
#[derive(Debug, Serialize, ToSchema)]
pub struct ElectrumActionResponse {
    pub success: bool,
    pub message: String,
    pub active_server: Option<ElectrumServer>,
}

/// Get electrum server status
#[utoipa::path(
    get,
    path = "/electrum/status",
    tag = "Electrum",
    responses(
        (status = 200, description = "Electrum server status", body = ElectrumStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_electrum_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get configured server from database
    let configured_server = get_configured_server(&state).await.unwrap_or(ElectrumServer::Electrs);

    // Check container statuses
    let electrs_status = get_container_status(&state, ELECTRS_CONTAINER).await;
    let fulcrum_status = get_container_status(&state, FULCRUM_CONTAINER).await;

    // Determine which server is active
    let active_server = if electrs_status.as_deref() == Some("running") {
        Some(ElectrumServer::Electrs)
    } else if fulcrum_status.as_deref() == Some("running") {
        Some(ElectrumServer::Fulcrum)
    } else {
        None
    };

    // Check if port is available (no conflict)
    let port_available = !(electrs_status.as_deref() == Some("running") 
        && fulcrum_status.as_deref() == Some("running"));

    Ok(Json(ElectrumStatus {
        configured_server,
        active_server,
        electrs_status,
        fulcrum_status,
        port_available,
        sync_status: None, // Could parse logs for sync status
    }))
}

/// Switch electrum server
#[utoipa::path(
    post,
    path = "/electrum/switch",
    tag = "Electrum",
    request_body = ElectrumSwitchRequest,
    responses(
        (status = 200, description = "Server switched successfully", body = ElectrumActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn switch_electrum_server(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ElectrumSwitchRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Switching to electrum server: {:?}", req.server);

    let target_server = req.server;
    let (target_container, other_container) = match target_server {
        ElectrumServer::Electrs => (ELECTRS_CONTAINER, FULCRUM_CONTAINER),
        ElectrumServer::Fulcrum => (FULCRUM_CONTAINER, ELECTRS_CONTAINER),
    };

    // Step 1: Stop dependent services
    info!("Stopping dependent services...");
    for container in DEPENDENT_CONTAINERS {
        let _ = stop_container_safe(&state, container).await;
    }

    // Step 2: Stop the other server (if running)
    info!("Stopping other electrum server: {}", other_container);
    let _ = stop_container_safe(&state, other_container).await;

    // Wait a moment for port to be released
    sleep(Duration::from_secs(2)).await;

    // Step 3: Start the target server
    info!("Starting target electrum server: {}", target_container);
    match start_container_safe(&state, target_container).await {
        Ok(_) => {
            info!("Target server started successfully");
        }
        Err(e) => {
            error!("Failed to start target server: {}", e);
            // Try to restart dependent services anyway
            for container in DEPENDENT_CONTAINERS {
                let _ = start_container_safe(&state, container).await;
            }
            return Ok(Json(ElectrumActionResponse {
                success: false,
                message: format!("Failed to start {}: {}", target_server, e),
                active_server: None,
            }));
        }
    }

    // Step 4: Wait for server to be ready
    info!("Waiting for server to be ready...");
    sleep(Duration::from_secs(5)).await;

    // Step 5: Restart dependent services
    info!("Restarting dependent services...");
    for container in DEPENDENT_CONTAINERS {
        let _ = start_container_safe(&state, container).await;
    }

    // Step 6: Save preference to database
    if let Err(e) = save_configured_server(&state, target_server).await {
        warn!("Failed to save server preference: {}", e);
    }

    Ok(Json(ElectrumActionResponse {
        success: true,
        message: format!("Switched to {} successfully", target_server),
        active_server: Some(target_server),
    }))
}

/// Get electrum server info
#[utoipa::path(
    get,
    path = "/electrum/info",
    tag = "Electrum",
    responses(
        (status = 200, description = "Electrum server info", body = ElectrumStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_electrum_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Same as status for now, could add more detailed info in the future
    get_electrum_status(State(state)).await
}

// Helper functions

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

async fn stop_container_safe(state: &Arc<AppState>, container_name: &str) -> Result<(), String> {
    let options = Some(StopContainerOptions { t: 10 });
    state.docker
        .stop_container(container_name, options)
        .await
        .map_err(|e| e.to_string())
}

async fn start_container_safe(state: &Arc<AppState>, container_name: &str) -> Result<(), String> {
    state.docker
        .start_container(container_name, None::<StartContainerOptions<String>>)
        .await
        .map_err(|e| e.to_string())
}

async fn get_configured_server(state: &Arc<AppState>) -> Result<ElectrumServer, String> {
    let pool = state.db_pool.as_ref().ok_or("Database not available")?;

    let row = sqlx::query("SELECT value FROM system_settings WHERE key = 'electrum_server'")
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(row) => {
            let value: serde_json::Value = row.get("value");
            let server_str = value.as_str().unwrap_or("electrs");
            server_str.parse()
        }
        None => Ok(ElectrumServer::Electrs),
    }
}

async fn save_configured_server(state: &Arc<AppState>, server: ElectrumServer) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("Database not available")?;

    let value = serde_json::json!(server.to_string());

    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('electrum_server', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
    )
    .bind(&value)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
