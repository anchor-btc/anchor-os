//! Electrum server management handlers (Electrs vs Fulcrum)
//!
//! Both servers can run simultaneously on different ports:
//! - Electrs: port 50001
//! - Fulcrum: port 50002
//!
//! The "default" server is used by dependent services (Mempool, BTC RPC Explorer).

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use bollard::container::{ListContainersOptions, StartContainerOptions, StopContainerOptions};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

// Container names
const ELECTRS_CONTAINER: &str = "anchor-core-electrs";
const FULCRUM_CONTAINER: &str = "anchor-core-fulcrum";

// Server ports
const ELECTRS_PORT: u16 = 50001;
const FULCRUM_PORT: u16 = 50002;

// Dependent services that need to be restarted when switching default
const DEPENDENT_CONTAINERS: &[&str] = &["anchor-explorer-mempool-api", "anchor-explorer-btc-rpc"];

/// Electrum server types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ElectrumServer {
    Electrs,
    Fulcrum,
}

impl ElectrumServer {
    pub fn container_name(&self) -> &'static str {
        match self {
            ElectrumServer::Electrs => ELECTRS_CONTAINER,
            ElectrumServer::Fulcrum => FULCRUM_CONTAINER,
        }
    }

    pub fn port(&self) -> u16 {
        match self {
            ElectrumServer::Electrs => ELECTRS_PORT,
            ElectrumServer::Fulcrum => FULCRUM_PORT,
        }
    }

    pub fn host(&self) -> &'static str {
        match self {
            ElectrumServer::Electrs => "core-electrs",
            ElectrumServer::Fulcrum => "core-fulcrum",
        }
    }
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

/// Server info with status
#[derive(Debug, Serialize, ToSchema)]
pub struct ServerInfo {
    /// Server type
    pub server: ElectrumServer,
    /// Container status (running, exited, etc.)
    pub status: Option<String>,
    /// Whether this server is the default for dependent services
    pub is_default: bool,
    /// Host name for docker network
    pub host: String,
    /// Port number
    pub port: u16,
}

/// Electrum status response
#[derive(Debug, Serialize, ToSchema)]
pub struct ElectrumStatus {
    /// Currently configured default server
    pub default_server: ElectrumServer,
    /// Electrs server info
    pub electrs: ServerInfo,
    /// Fulcrum server info
    pub fulcrum: ServerInfo,
}

/// Electrum switch request (set default server)
#[derive(Debug, Deserialize, ToSchema)]
pub struct ElectrumSetDefaultRequest {
    pub server: ElectrumServer,
}

/// Electrum action request (start/stop individual server)
#[derive(Debug, Deserialize, ToSchema)]
pub struct ElectrumServerActionRequest {
    pub server: ElectrumServer,
    pub action: ServerAction,
}

/// Server actions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ServerAction {
    Start,
    Stop,
}

/// Electrum action response
#[derive(Debug, Serialize, ToSchema)]
pub struct ElectrumActionResponse {
    pub success: bool,
    pub message: String,
}

/// Get electrum servers status
#[utoipa::path(
    get,
    path = "/electrum/status",
    tag = "Electrum",
    responses(
        (status = 200, description = "Electrum servers status", body = ElectrumStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_electrum_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get configured default server from database
    let default_server = get_configured_server(&state)
        .await
        .unwrap_or(ElectrumServer::Electrs);

    // Check container statuses
    let electrs_status = get_container_status(&state, ELECTRS_CONTAINER).await;
    let fulcrum_status = get_container_status(&state, FULCRUM_CONTAINER).await;

    Ok(Json(ElectrumStatus {
        default_server,
        electrs: ServerInfo {
            server: ElectrumServer::Electrs,
            status: electrs_status,
            is_default: default_server == ElectrumServer::Electrs,
            host: ElectrumServer::Electrs.host().to_string(),
            port: ELECTRS_PORT,
        },
        fulcrum: ServerInfo {
            server: ElectrumServer::Fulcrum,
            status: fulcrum_status,
            is_default: default_server == ElectrumServer::Fulcrum,
            host: ElectrumServer::Fulcrum.host().to_string(),
            port: FULCRUM_PORT,
        },
    }))
}

/// Set the default electrum server (used by dependent services)
#[utoipa::path(
    post,
    path = "/electrum/set-default",
    tag = "Electrum",
    request_body = ElectrumSetDefaultRequest,
    responses(
        (status = 200, description = "Default server set successfully", body = ElectrumActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn set_default_electrum_server(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ElectrumSetDefaultRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Setting default electrum server to: {:?}", req.server);

    let target_server = req.server;

    // Check if target server is running
    let target_status = get_container_status(&state, target_server.container_name()).await;
    if target_status.as_deref() != Some("running") {
        return Ok(Json(ElectrumActionResponse {
            success: false,
            message: format!(
                "{} is not running. Start it first before setting as default.",
                target_server
            ),
        }));
    }

    // Save preference to database
    if let Err(e) = save_configured_server(&state, target_server).await {
        error!("Failed to save server preference: {}", e);
        return Ok(Json(ElectrumActionResponse {
            success: false,
            message: format!("Failed to save preference: {}", e),
        }));
    }

    // Recreate dependent services with new Electrum configuration
    // We need to use docker compose to recreate them with the correct env vars
    info!("Recreating dependent services with new Electrum configuration...");

    let electrum_host = target_server.host();
    let electrum_port = target_server.port();

    // Spawn background task to recreate dependent services
    tokio::spawn(async move {
        // First, stop the dependent containers
        for container in DEPENDENT_CONTAINERS {
            info!("Stopping {} for recreation", container);
            let _ = tokio::process::Command::new("docker")
                .args(["stop", container])
                .output()
                .await;
        }

        sleep(Duration::from_secs(2)).await;

        // Remove the containers so they can be recreated with new env vars
        for container in DEPENDENT_CONTAINERS {
            info!("Removing {} for recreation", container);
            let _ = tokio::process::Command::new("docker")
                .args(["rm", "-f", container])
                .output()
                .await;
        }

        sleep(Duration::from_secs(1)).await;

        // Recreate with docker compose, passing the new env vars
        // Map container names to service names
        let services: Vec<&str> = DEPENDENT_CONTAINERS
            .iter()
            .map(|c| match *c {
                "anchor-explorer-mempool-api" => "explorer-mempool-api",
                "anchor-explorer-btc-rpc" => "explorer-btc-rpc",
                _ => c.strip_prefix("anchor-").unwrap_or(c),
            })
            .collect();

        for service in services {
            info!(
                "Recreating {} with ELECTRUM_DEFAULT_HOST={} ELECTRUM_DEFAULT_PORT={}",
                service, electrum_host, electrum_port
            );

            let output = tokio::process::Command::new("docker")
                .args(["compose", "up", "-d", service])
                .env("ELECTRUM_DEFAULT_HOST", electrum_host)
                .env("ELECTRUM_DEFAULT_PORT", electrum_port.to_string())
                .current_dir("/anchor-project")
                .output()
                .await;

            match output {
                Ok(out) => {
                    if out.status.success() {
                        info!("Successfully recreated {}", service);
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr);
                        error!("Failed to recreate {}: {}", service, stderr);
                    }
                }
                Err(e) => {
                    error!("Failed to run docker compose for {}: {}", service, e);
                }
            }
        }

        info!("Finished recreating dependent services with new Electrum configuration");
    });

    Ok(Json(ElectrumActionResponse {
        success: true,
        message: format!(
            "{} is now the default Electrum server. Dependent services being recreated...",
            target_server
        ),
    }))
}

/// Start or stop an individual electrum server
#[utoipa::path(
    post,
    path = "/electrum/server-action",
    tag = "Electrum",
    request_body = ElectrumServerActionRequest,
    responses(
        (status = 200, description = "Action completed", body = ElectrumActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn electrum_server_action(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ElectrumServerActionRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let container = req.server.container_name();

    match req.action {
        ServerAction::Start => {
            info!("Starting electrum server: {}", container);
            match start_container_safe(&state, container).await {
                Ok(_) => Ok(Json(ElectrumActionResponse {
                    success: true,
                    message: format!("{} started successfully", req.server),
                })),
                Err(e) => Ok(Json(ElectrumActionResponse {
                    success: false,
                    message: format!("Failed to start {}: {}", req.server, e),
                })),
            }
        }
        ServerAction::Stop => {
            info!("Stopping electrum server: {}", container);

            // Check if this is the default server
            let default_server = get_configured_server(&state)
                .await
                .unwrap_or(ElectrumServer::Electrs);
            if default_server == req.server {
                // Check if the other server is running
                let other = if req.server == ElectrumServer::Electrs {
                    ElectrumServer::Fulcrum
                } else {
                    ElectrumServer::Electrs
                };
                let other_status = get_container_status(&state, other.container_name()).await;

                if other_status.as_deref() != Some("running") {
                    return Ok(Json(ElectrumActionResponse {
                        success: false,
                        message: format!("Cannot stop {} - it's the default server and {} is not running. Start {} first or change the default.", req.server, other, other),
                    }));
                }
            }

            match stop_container_safe(&state, container).await {
                Ok(_) => Ok(Json(ElectrumActionResponse {
                    success: true,
                    message: format!("{} stopped successfully", req.server),
                })),
                Err(e) => Ok(Json(ElectrumActionResponse {
                    success: false,
                    message: format!("Failed to stop {}: {}", req.server, e),
                })),
            }
        }
    }
}

/// Legacy switch endpoint - redirects to set-default
#[utoipa::path(
    post,
    path = "/electrum/switch",
    tag = "Electrum",
    request_body = ElectrumSetDefaultRequest,
    responses(
        (status = 200, description = "Server switched successfully", body = ElectrumActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn switch_electrum_server(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ElectrumSetDefaultRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Delegate to the new set-default endpoint
    set_default_electrum_server(State(state), Json(req)).await
}

/// Get electrum server info (alias for status)
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
    state
        .docker
        .stop_container(container_name, options)
        .await
        .map_err(|e| e.to_string())
}

async fn start_container_safe(state: &Arc<AppState>, container_name: &str) -> Result<(), String> {
    // First check if container exists
    let status = get_container_status(state, container_name).await;

    if status.is_some() {
        // Container exists, just start it
        info!("Container {} exists, starting it", container_name);
        state
            .docker
            .start_container(container_name, None::<StartContainerOptions<String>>)
            .await
            .map_err(|e| e.to_string())
    } else {
        // Container doesn't exist, use docker compose to create and start it
        info!(
            "Container {} doesn't exist, creating with docker compose",
            container_name
        );

        // Map container name to service name
        let service_name = match container_name {
            "anchor-core-electrs" => "core-electrs",
            "anchor-core-fulcrum" => "core-fulcrum",
            "anchor-explorer-mempool-api" => "explorer-mempool-api",
            "anchor-explorer-btc-rpc" => "explorer-btc-rpc",
            _ => container_name
                .strip_prefix("anchor-")
                .unwrap_or(container_name),
        };

        // Run docker compose up -d for the service
        // Note: The dashboard-backend container has the project mounted at /anchor-project
        let output = tokio::process::Command::new("docker")
            .args(["compose", "up", "-d", service_name])
            .current_dir("/anchor-project")
            .output()
            .await
            .map_err(|e| format!("Failed to run docker compose: {}", e))?;

        if output.status.success() {
            info!(
                "Successfully created and started {} via docker compose",
                container_name
            );
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Docker compose failed for {}: {}", container_name, stderr);
            Err(format!("Docker compose failed: {}", stderr))
        }
    }
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

async fn save_configured_server(
    state: &Arc<AppState>,
    server: ElectrumServer,
) -> Result<(), String> {
    let pool = state.db_pool.as_ref().ok_or("Database not available")?;

    let value = serde_json::json!(server.to_string());

    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('electrum_server', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()",
    )
    .bind(&value)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
