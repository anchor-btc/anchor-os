//! Tailscale VPN management handlers

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

/// Tailscale status response
#[derive(Debug, Serialize, ToSchema)]
pub struct TailscaleStatus {
    pub running: bool,
    pub logged_in: bool,
    pub hostname: Option<String>,
    pub ip_address: Option<String>,
    pub tailnet: Option<String>,
    pub version: Option<String>,
    pub backend_state: Option<String>,
}

/// Tailscale auth request
#[derive(Debug, Deserialize, ToSchema)]
pub struct TailscaleAuthRequest {
    pub auth_key: String,
    #[serde(default)]
    pub hostname: Option<String>,
    #[serde(default)]
    pub advertise_routes: Option<String>,
}

/// Tailscale action response
#[derive(Debug, Serialize, ToSchema)]
pub struct TailscaleActionResponse {
    pub success: bool,
    pub message: String,
}

const TAILSCALE_CONTAINER: &str = "anchor-tool-tailscale";

/// Get Tailscale status
#[utoipa::path(
    get,
    path = "/tailscale/status",
    tag = "Tailscale",
    responses(
        (status = 200, description = "Tailscale status", body = TailscaleStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_tailscale_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::container::ListContainersOptions;
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;
    use std::collections::HashMap;

    // Check if container is running
    let mut filters = HashMap::new();
    filters.insert("name", vec![TAILSCALE_CONTAINER]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let containers = state.docker.list_containers(options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let container = containers.first();
    let running = container
        .map(|c| c.state.as_deref() == Some("running"))
        .unwrap_or(false);

    if !running {
        return Ok(Json(TailscaleStatus {
            running: false,
            logged_in: false,
            hostname: None,
            ip_address: None,
            tailnet: None,
            version: None,
            backend_state: None,
        }));
    }

    // Get tailscale status via exec
    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec!["tailscale", "status", "--json"]),
        ..Default::default()
    };

    let exec = match state.docker.create_exec(TAILSCALE_CONTAINER, exec_options).await {
        Ok(exec) => exec,
        Err(e) => {
            error!("Failed to create exec: {}", e);
            return Ok(Json(TailscaleStatus {
                running: true,
                logged_in: false,
                hostname: None,
                ip_address: None,
                tailnet: None,
                version: None,
                backend_state: Some("Error getting status".to_string()),
            }));
        }
    };

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    // Parse JSON output
    let status: TailscaleStatus = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output) {
        let backend_state = json.get("BackendState")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let logged_in = backend_state.as_deref() == Some("Running");
        
        let self_node = json.get("Self");
        
        let hostname = self_node
            .and_then(|s| s.get("HostName"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let ip_address = self_node
            .and_then(|s| s.get("TailscaleIPs"))
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let tailnet = json.get("MagicDNSSuffix")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let version = json.get("Version")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        TailscaleStatus {
            running: true,
            logged_in,
            hostname,
            ip_address,
            tailnet,
            version,
            backend_state,
        }
    } else {
        TailscaleStatus {
            running: true,
            logged_in: false,
            hostname: None,
            ip_address: None,
            tailnet: None,
            version: None,
            backend_state: Some("NeedsLogin".to_string()),
        }
    };

    Ok(Json(status))
}

/// Connect to Tailscale with auth key
#[utoipa::path(
    post,
    path = "/tailscale/connect",
    tag = "Tailscale",
    request_body = TailscaleAuthRequest,
    responses(
        (status = 200, description = "Connection initiated", body = TailscaleActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn connect_tailscale(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TailscaleAuthRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    info!("Connecting to Tailscale...");

    // Build tailscale up command with --reset to override any existing settings
    let mut cmd = vec!["tailscale", "up", "--reset", "--authkey", &req.auth_key];
    
    let hostname_str;
    if let Some(hostname) = &req.hostname {
        hostname_str = format!("--hostname={}", hostname);
        cmd.push(&hostname_str);
    }

    let routes_str;
    if let Some(routes) = &req.advertise_routes {
        routes_str = format!("--advertise-routes={}", routes);
        cmd.push(&routes_str);
    }

    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(cmd.iter().map(|s| *s).collect()),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TAILSCALE_CONTAINER, exec_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    // Check result
    let inspect = state.docker.inspect_exec(&exec.id).await.ok();
    let exit_code = inspect.and_then(|i| i.exit_code).unwrap_or(-1);

    if exit_code == 0 {
        Ok(Json(TailscaleActionResponse {
            success: true,
            message: "Connected to Tailscale successfully".to_string(),
        }))
    } else {
        Ok(Json(TailscaleActionResponse {
            success: false,
            message: format!("Failed to connect: {}", output.trim()),
        }))
    }
}

/// Disconnect from Tailscale
#[utoipa::path(
    post,
    path = "/tailscale/disconnect",
    tag = "Tailscale",
    responses(
        (status = 200, description = "Disconnected", body = TailscaleActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn disconnect_tailscale(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    info!("Disconnecting from Tailscale...");

    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec!["tailscale", "logout"]),
        ..Default::default()
    };

    let exec = state.docker.create_exec(TAILSCALE_CONTAINER, exec_options).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut output = String::new();
    if let Ok(StartExecResults::Attached { output: mut stream, .. }) = state.docker.start_exec(&exec.id, None).await {
        while let Some(Ok(chunk)) = stream.next().await {
            output.push_str(&chunk.to_string());
        }
    }

    Ok(Json(TailscaleActionResponse {
        success: true,
        message: "Logged out from Tailscale".to_string(),
    }))
}

