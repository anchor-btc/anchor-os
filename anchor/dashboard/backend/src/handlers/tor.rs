//! Tor network management handlers

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

const TOR_CONTAINER: &str = "anchor-networking-tor";

/// Onion addresses for hidden services
#[derive(Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct OnionAddresses {
    pub bitcoin: Option<String>,
    pub electrs: Option<String>,
    pub dashboard: Option<String>,
}

/// Tor status response
#[derive(Debug, Serialize, ToSchema)]
pub struct TorStatus {
    pub running: bool,
    pub connected: bool,
    pub container_status: Option<String>,
    pub tor_version: Option<String>,
    pub circuit_established: bool,
    pub external_ip: Option<String>,
    pub onion_addresses: OnionAddresses,
}

/// Tor action response
#[derive(Debug, Serialize, ToSchema)]
pub struct TorActionResponse {
    pub success: bool,
    pub message: String,
}

/// Get Tor status
#[utoipa::path(
    get,
    path = "/tor/status",
    tag = "Tor",
    responses(
        (status = 200, description = "Tor status", body = TorStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_tor_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::container::ListContainersOptions;
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;
    use std::collections::HashMap;

    // Check if container is running
    let mut filters = HashMap::new();
    filters.insert("name", vec![TOR_CONTAINER]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let containers = state.docker.list_containers(options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let container = containers.first();
    let container_status = container
        .and_then(|c| c.state.clone());
    let running = container_status.as_deref() == Some("running");

    if !running {
        return Ok(Json(TorStatus {
            running: false,
            connected: false,
            container_status,
            tor_version: None,
            circuit_established: false,
            external_ip: None,
            onion_addresses: OnionAddresses::default(),
        }));
    }

    // Check if Tor circuit is established by checking SOCKS proxy
    let circuit_established = check_tor_circuit(&state).await.unwrap_or(false);

    // Get Tor version
    let tor_version = get_tor_version(&state).await.ok();

    // Get external IP via Tor
    let external_ip = if circuit_established {
        get_external_ip_via_tor(&state).await.ok()
    } else {
        None
    };

    // Get onion addresses
    let onion_addresses = get_onion_addresses(&state).await.unwrap_or_default();

    Ok(Json(TorStatus {
        running: true,
        connected: circuit_established,
        container_status,
        tor_version,
        circuit_established,
        external_ip,
        onion_addresses,
    }))
}

/// Check if Tor circuit is established
async fn check_tor_circuit(state: &Arc<AppState>) -> Result<bool, String> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec![
            "sh", "-c",
            "curl -s --socks5-hostname localhost:9050 https://check.torproject.org/api/ip 2>/dev/null | grep -q IsTor && echo 'connected'"
        ]),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TOR_CONTAINER, exec_options).await
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    Ok(output.contains("connected"))
}

/// Get Tor version
async fn get_tor_version(state: &Arc<AppState>) -> Result<String, String> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec!["tor", "--version"]),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TOR_CONTAINER, exec_options).await
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    // Parse version from "Tor version 0.4.x.x"
    let version = output.lines()
        .next()
        .and_then(|line| line.strip_prefix("Tor version "))
        .map(|v| v.trim().to_string())
        .unwrap_or_else(|| output.trim().to_string());

    Ok(version)
}

/// Get external IP via Tor
async fn get_external_ip_via_tor(state: &Arc<AppState>) -> Result<String, String> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec![
            "sh", "-c",
            "curl -s --socks5-hostname localhost:9050 https://check.torproject.org/api/ip 2>/dev/null"
        ]),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TOR_CONTAINER, exec_options).await
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    // Parse IP from JSON response
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output) {
        if let Some(ip) = json.get("IP").and_then(|v| v.as_str()) {
            return Ok(ip.to_string());
        }
    }

    Err("Could not get external IP".to_string())
}

/// Get onion addresses from hidden service directories
async fn get_onion_addresses(state: &Arc<AppState>) -> Result<OnionAddresses, String> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    async fn read_hostname(state: &Arc<AppState>, path: &str) -> Option<String> {
        let exec_options = CreateExecOptions {
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            cmd: Some(vec!["cat", path]),
            ..Default::default()
        };

        let exec = state.docker.create_exec(TOR_CONTAINER, exec_options).await.ok()?;

        let mut output = String::new();
        if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
            while let Some(Ok(chunk)) = stream.next().await {
                output.push_str(&chunk.to_string());
            }
        }

        let hostname = output.trim().to_string();
        if hostname.ends_with(".onion") {
            Some(hostname)
        } else {
            None
        }
    }

    let bitcoin = read_hostname(state, "/var/lib/tor/bitcoin-node/hostname").await;
    let electrs = read_hostname(state, "/var/lib/tor/electrs/hostname").await;
    let dashboard = read_hostname(state, "/var/lib/tor/dashboard/hostname").await;

    Ok(OnionAddresses {
        bitcoin,
        electrs,
        dashboard,
    })
}

/// Get onion addresses endpoint
#[utoipa::path(
    get,
    path = "/tor/onion-addresses",
    tag = "Tor",
    responses(
        (status = 200, description = "Onion addresses", body = OnionAddresses),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_onion_addresses_handler(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let addresses = get_onion_addresses(&state).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(addresses))
}

/// Force new Tor circuit
#[utoipa::path(
    post,
    path = "/tor/new-circuit",
    tag = "Tor",
    responses(
        (status = 200, description = "New circuit requested", body = TorActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn new_tor_circuit(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    info!("Requesting new Tor circuit...");

    // Send NEWNYM signal via curl telnet (BusyBox nc doesn't work well)
    // Password "anchor" is set via environment variable in docker-compose
    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        attach_stdin: Some(true),
        cmd: Some(vec![
            "sh", "-c",
            r#"curl -s telnet://localhost:9051 <<EOF
AUTHENTICATE "anchor"
SIGNAL NEWNYM
QUIT
EOF"#
        ]),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TOR_CONTAINER, exec_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    // Check if successful (should have "250 OK" responses)
    let ok_count = output.matches("250 OK").count();
    if ok_count >= 2 {
        Ok(Json(TorActionResponse {
            success: true,
            message: "New Tor circuit established. Your exit IP will change.".to_string(),
        }))
    } else if output.contains("250") {
        Ok(Json(TorActionResponse {
            success: true,
            message: "Circuit signal sent.".to_string(),
        }))
    } else {
        Ok(Json(TorActionResponse {
            success: false,
            message: format!("Failed to create new circuit: {}", output.trim()),
        }))
    }
}

/// Enable Tor (start container)
#[utoipa::path(
    post,
    path = "/tor/enable",
    tag = "Tor",
    responses(
        (status = 200, description = "Tor enabled", body = TorActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn enable_tor(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Enabling Tor...");

    // Start the Tor container
    match state.docker.start_container::<String>(TOR_CONTAINER, None).await {
        Ok(_) => {
            Ok(Json(TorActionResponse {
                success: true,
                message: "Tor container started successfully".to_string(),
            }))
        }
        Err(e) => {
            // Check if already running
            if e.to_string().contains("already started") || e.to_string().contains("304") {
                Ok(Json(TorActionResponse {
                    success: true,
                    message: "Tor container is already running".to_string(),
                }))
            } else {
                error!("Failed to start Tor container: {}", e);
                Ok(Json(TorActionResponse {
                    success: false,
                    message: format!("Failed to start Tor: {}", e),
                }))
            }
        }
    }
}

/// Disable Tor (stop container)
#[utoipa::path(
    post,
    path = "/tor/disable",
    tag = "Tor",
    responses(
        (status = 200, description = "Tor disabled", body = TorActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn disable_tor(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Disabling Tor...");

    // Stop the Tor container
    match state.docker.stop_container(TOR_CONTAINER, None).await {
        Ok(_) => {
            Ok(Json(TorActionResponse {
                success: true,
                message: "Tor container stopped successfully".to_string(),
            }))
        }
        Err(e) => {
            // Check if already stopped
            if e.to_string().contains("not running") || e.to_string().contains("304") {
                Ok(Json(TorActionResponse {
                    success: true,
                    message: "Tor container is already stopped".to_string(),
                }))
            } else {
                error!("Failed to stop Tor container: {}", e);
                Ok(Json(TorActionResponse {
                    success: false,
                    message: format!("Failed to stop Tor: {}", e),
                }))
            }
        }
    }
}
