//! Cloudflare Tunnel management handlers

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::container::{
    Config, CreateContainerOptions, RemoveContainerOptions, StartContainerOptions,
    StopContainerOptions,
};
use bollard::models::{HostConfig, RestartPolicy, RestartPolicyNameEnum};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

const CLOUDFLARE_CONTAINER: &str = "anchor-tool-cloudflare";
const CLOUDFLARE_IMAGE: &str = "cloudflare/cloudflared:latest";

/// Cloudflare tunnel status response
#[derive(Debug, Serialize, ToSchema)]
pub struct CloudflareStatus {
    pub running: bool,
    pub connected: bool,
    pub container_status: Option<String>,
    pub tunnel_info: Option<String>,
}

/// Cloudflare connect request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CloudflareConnectRequest {
    pub token: String,
}

/// Cloudflare action response
#[derive(Debug, Serialize, ToSchema)]
pub struct CloudflareActionResponse {
    pub success: bool,
    pub message: String,
}

/// Available services that can be exposed
#[derive(Debug, Serialize, ToSchema)]
pub struct ExposableService {
    pub name: String,
    pub description: String,
    pub local_url: String,
    pub port: u16,
}

/// Get list of exposable services
#[derive(Debug, Serialize, ToSchema)]
pub struct ExposableServicesResponse {
    pub services: Vec<ExposableService>,
}

/// Get Cloudflare tunnel status
#[utoipa::path(
    get,
    path = "/cloudflare/status",
    tag = "Cloudflare",
    responses(
        (status = 200, description = "Cloudflare tunnel status", body = CloudflareStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_cloudflare_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::container::ListContainersOptions;

    // Check if container exists and is running
    let mut filters = HashMap::new();
    filters.insert("name", vec![CLOUDFLARE_CONTAINER]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let containers = state
        .docker
        .list_containers(options)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let container = containers.first();

    if container.is_none() {
        return Ok(Json(CloudflareStatus {
            running: false,
            connected: false,
            container_status: None,
            tunnel_info: None,
        }));
    }

    let container = container.unwrap();
    let running = container.state.as_deref() == Some("running");
    let container_status = container.status.clone();

    // If running, check logs for connection status
    let connected = if running {
        // Check recent logs for connection indicators
        use bollard::container::LogsOptions;
        use futures::StreamExt;

        let log_options = Some(LogsOptions::<String> {
            stdout: true,
            stderr: true,
            tail: "20".to_string(),
            ..Default::default()
        });

        let mut logs_stream = state.docker.logs(CLOUDFLARE_CONTAINER, log_options);
        let mut log_output = String::new();

        while let Some(Ok(chunk)) = logs_stream.next().await {
            log_output.push_str(&chunk.to_string());
        }

        // Check for successful connection indicators
        log_output.contains("Registered tunnel connection")
            || log_output.contains("Connection registered")
            || log_output.contains("connIndex=")
    } else {
        false
    };

    Ok(Json(CloudflareStatus {
        running,
        connected,
        container_status,
        tunnel_info: if connected {
            Some("Tunnel connected to Cloudflare network".to_string())
        } else if running {
            Some("Tunnel starting...".to_string())
        } else {
            None
        },
    }))
}

/// Connect to Cloudflare with tunnel token
#[utoipa::path(
    post,
    path = "/cloudflare/connect",
    tag = "Cloudflare",
    request_body = CloudflareConnectRequest,
    responses(
        (status = 200, description = "Connection initiated", body = CloudflareActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn connect_cloudflare(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CloudflareConnectRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Connecting to Cloudflare Tunnel...");

    // First, try to stop and remove existing container if any
    let _ = state
        .docker
        .stop_container(CLOUDFLARE_CONTAINER, Some(StopContainerOptions { t: 5 }))
        .await;
    let _ = state
        .docker
        .remove_container(
            CLOUDFLARE_CONTAINER,
            Some(RemoveContainerOptions {
                force: true,
                ..Default::default()
            }),
        )
        .await;

    // Pull the image first
    use bollard::image::CreateImageOptions;
    use futures::StreamExt;

    let pull_options = Some(CreateImageOptions {
        from_image: CLOUDFLARE_IMAGE,
        ..Default::default()
    });

    let mut pull_stream = state.docker.create_image(pull_options, None, None);
    while let Some(result) = pull_stream.next().await {
        if let Err(e) = result {
            error!("Error pulling image: {}", e);
        }
    }

    // Create container with token
    let env = vec![format!("TUNNEL_TOKEN={}", req.token)];

    let config = Config {
        image: Some(CLOUDFLARE_IMAGE.to_string()),
        cmd: Some(vec!["tunnel".to_string(), "run".to_string()]),
        env: Some(env),
        host_config: Some(HostConfig {
            network_mode: Some("anchor_anchor-network".to_string()),
            restart_policy: Some(RestartPolicy {
                name: Some(RestartPolicyNameEnum::UNLESS_STOPPED),
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..Default::default()
    };

    let create_options = Some(CreateContainerOptions {
        name: CLOUDFLARE_CONTAINER,
        platform: None,
    });

    match state.docker.create_container(create_options, config).await {
        Ok(_) => {
            info!("Container created, starting...");
        }
        Err(e) => {
            error!("Failed to create container: {}", e);
            return Ok(Json(CloudflareActionResponse {
                success: false,
                message: format!("Failed to create container: {}", e),
            }));
        }
    }

    // Start the container
    match state
        .docker
        .start_container(CLOUDFLARE_CONTAINER, None::<StartContainerOptions<String>>)
        .await
    {
        Ok(_) => {
            info!("Cloudflare tunnel container started");
            Ok(Json(CloudflareActionResponse {
                success: true,
                message: "Cloudflare tunnel started. It may take a few seconds to connect."
                    .to_string(),
            }))
        }
        Err(e) => {
            error!("Failed to start container: {}", e);
            Ok(Json(CloudflareActionResponse {
                success: false,
                message: format!("Failed to start container: {}", e),
            }))
        }
    }
}

/// Disconnect from Cloudflare tunnel
#[utoipa::path(
    post,
    path = "/cloudflare/disconnect",
    tag = "Cloudflare",
    responses(
        (status = 200, description = "Disconnected", body = CloudflareActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn disconnect_cloudflare(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Disconnecting Cloudflare Tunnel...");

    // Stop the container
    match state
        .docker
        .stop_container(CLOUDFLARE_CONTAINER, Some(StopContainerOptions { t: 10 }))
        .await
    {
        Ok(_) => {
            info!("Cloudflare tunnel stopped");
            Ok(Json(CloudflareActionResponse {
                success: true,
                message: "Cloudflare tunnel disconnected".to_string(),
            }))
        }
        Err(e) => {
            error!("Failed to stop container: {}", e);
            Ok(Json(CloudflareActionResponse {
                success: false,
                message: format!("Failed to stop tunnel: {}", e),
            }))
        }
    }
}

/// Get list of services that can be exposed
#[utoipa::path(
    get,
    path = "/cloudflare/services",
    tag = "Cloudflare",
    responses(
        (status = 200, description = "List of exposable services", body = ExposableServicesResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_exposable_services(
    State(_state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let services = vec![
        ExposableService {
            name: "Dashboard".to_string(),
            description: "Anchor Dashboard - Main control panel".to_string(),
            local_url: "http://anchor-dashboard-frontend:8000".to_string(),
            port: 8000,
        },
        ExposableService {
            name: "Anchor DNS".to_string(),
            description: "Decentralized DNS on Bitcoin".to_string(),
            local_url: "http://app-dns-frontend:3400".to_string(),
            port: 3400,
        },
        ExposableService {
            name: "Anchor Map".to_string(),
            description: "Location-based messages on Bitcoin".to_string(),
            local_url: "http://app-map-frontend:3300".to_string(),
            port: 3300,
        },
        ExposableService {
            name: "Anchor Canvas".to_string(),
            description: "Pixel art canvas on Bitcoin".to_string(),
            local_url: "http://app-pixel-frontend:3200".to_string(),
            port: 3200,
        },
        ExposableService {
            name: "Anchor Proofs".to_string(),
            description: "Proof of existence on Bitcoin".to_string(),
            local_url: "http://app-proof-frontend:3500".to_string(),
            port: 3500,
        },
        ExposableService {
            name: "Anchor Threads".to_string(),
            description: "Social threads on Bitcoin".to_string(),
            local_url: "http://app-threads-frontend:3100".to_string(),
            port: 3100,
        },
    ];

    Ok(Json(ExposableServicesResponse { services }))
}
