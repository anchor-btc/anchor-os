//! Docker container management handlers

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::container::{ListContainersOptions, RestartContainerOptions, StartContainerOptions, StopContainerOptions, StatsOptions};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

/// Container info response
#[derive(Debug, Serialize, ToSchema)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub ports: Vec<String>,
    pub created: i64,
}

/// List of containers response
#[derive(Debug, Serialize, ToSchema)]
pub struct ContainersResponse {
    pub containers: Vec<ContainerInfo>,
}

/// Container action response
#[derive(Debug, Serialize, ToSchema)]
pub struct ContainerActionResponse {
    pub success: bool,
    pub message: String,
    pub container_id: String,
}

/// List all anchor-* containers
#[utoipa::path(
    get,
    path = "/docker/containers",
    tag = "Docker",
    responses(
        (status = 200, description = "List of containers", body = ContainersResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_containers(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut filters = HashMap::new();
    filters.insert("name", vec!["anchor-"]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    match state.docker.list_containers(options).await {
        Ok(containers) => {
            let container_infos: Vec<ContainerInfo> = containers
                .into_iter()
                .map(|c| {
                    let name = c
                        .names
                        .unwrap_or_default()
                        .first()
                        .map(|n| n.trim_start_matches('/').to_string())
                        .unwrap_or_default();

                    let ports = c
                        .ports
                        .unwrap_or_default()
                        .into_iter()
                        .filter_map(|p| {
                            if let (Some(public), Some(private)) = (p.public_port, Some(p.private_port)) {
                                Some(format!("{}:{}", public, private))
                            } else {
                                Some(format!("{}", p.private_port))
                            }
                        })
                        .collect();

                    ContainerInfo {
                        id: c.id.unwrap_or_default(),
                        name,
                        image: c.image.unwrap_or_default(),
                        status: c.status.unwrap_or_default(),
                        state: c.state.unwrap_or_default(),
                        ports,
                        created: c.created.unwrap_or(0),
                    }
                })
                .collect();

            Ok(Json(ContainersResponse {
                containers: container_infos,
            }))
        }
        Err(e) => {
            error!("Failed to list containers: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Start a container
#[utoipa::path(
    post,
    path = "/docker/containers/{id}/start",
    tag = "Docker",
    params(
        ("id" = String, Path, description = "Container ID or name")
    ),
    responses(
        (status = 200, description = "Container started", body = ContainerActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn start_container(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Starting container: {}", id);

    match state
        .docker
        .start_container(&id, None::<StartContainerOptions<String>>)
        .await
    {
        Ok(_) => Ok(Json(ContainerActionResponse {
            success: true,
            message: format!("Container {} started", id),
            container_id: id,
        })),
        Err(e) => {
            error!("Failed to start container {}: {}", id, e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Stop a container
#[utoipa::path(
    post,
    path = "/docker/containers/{id}/stop",
    tag = "Docker",
    params(
        ("id" = String, Path, description = "Container ID or name")
    ),
    responses(
        (status = 200, description = "Container stopped", body = ContainerActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn stop_container(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Stopping container: {}", id);

    let options = Some(StopContainerOptions { t: 10 });

    match state.docker.stop_container(&id, options).await {
        Ok(_) => Ok(Json(ContainerActionResponse {
            success: true,
            message: format!("Container {} stopped", id),
            container_id: id,
        })),
        Err(e) => {
            error!("Failed to stop container {}: {}", id, e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Restart a container
#[utoipa::path(
    post,
    path = "/docker/containers/{id}/restart",
    tag = "Docker",
    params(
        ("id" = String, Path, description = "Container ID or name")
    ),
    responses(
        (status = 200, description = "Container restarted", body = ContainerActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn restart_container(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Restarting container: {}", id);

    let options = Some(RestartContainerOptions { t: 10 });
    match state.docker.restart_container(&id, options).await {
        Ok(_) => Ok(Json(ContainerActionResponse {
            success: true,
            message: format!("Container {} restarted", id),
            container_id: id,
        })),
        Err(e) => {
            error!("Failed to restart container {}: {}", id, e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get container logs
#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    #[serde(default = "default_tail")]
    pub tail: usize,
}

fn default_tail() -> usize {
    100
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ContainerLogsResponse {
    pub container_id: String,
    pub logs: Vec<String>,
}

/// Get container logs
#[utoipa::path(
    get,
    path = "/docker/containers/{id}/logs",
    tag = "Docker",
    params(
        ("id" = String, Path, description = "Container ID or name"),
        ("tail" = Option<usize>, Query, description = "Number of lines to tail (default: 100)")
    ),
    responses(
        (status = 200, description = "Container logs", body = ContainerLogsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_container_logs(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<LogsQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::container::LogsOptions;
    use futures::StreamExt;

    let options = Some(LogsOptions::<String> {
        stdout: true,
        stderr: true,
        tail: query.tail.to_string(),
        ..Default::default()
    });

    let mut logs_stream = state.docker.logs(&id, options);
    let mut logs = Vec::new();

    while let Some(result) = logs_stream.next().await {
        match result {
            Ok(log) => {
                logs.push(log.to_string());
            }
            Err(e) => {
                error!("Error reading logs: {}", e);
                break;
            }
        }
    }

    Ok(Json(ContainerLogsResponse {
        container_id: id,
        logs,
    }))
}

/// Execute command request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExecRequest {
    pub command: String,
}

/// Execute command response
#[derive(Debug, Serialize, ToSchema)]
pub struct ExecResponse {
    pub container_id: String,
    pub output: String,
    pub exit_code: Option<i64>,
}

/// Execute a command in a container
#[utoipa::path(
    post,
    path = "/docker/containers/{id}/exec",
    tag = "Docker",
    params(
        ("id" = String, Path, description = "Container ID or name")
    ),
    request_body = ExecRequest,
    responses(
        (status = 200, description = "Command executed", body = ExecResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn exec_container(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<ExecRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bollard::exec::{CreateExecOptions, StartExecResults};
    use futures::StreamExt;

    info!("Executing command in container {}: {}", id, req.command);

    // Parse command - split by spaces but respect quotes
    let cmd: Vec<&str> = req.command.split_whitespace().collect();
    
    if cmd.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Empty command".to_string()));
    }

    // Create exec instance
    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(cmd),
        ..Default::default()
    };

    let exec = match state.docker.create_exec(&id, exec_options).await {
        Ok(exec) => exec,
        Err(e) => {
            error!("Failed to create exec: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Start exec and collect output
    let start_result = match state.docker.start_exec(&exec.id, None).await {
        Ok(result) => result,
        Err(e) => {
            error!("Failed to start exec: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let mut output = String::new();

    if let StartExecResults::Attached { output: mut stream, .. } = start_result {
        while let Some(result) = stream.next().await {
            match result {
                Ok(chunk) => {
                    output.push_str(&chunk.to_string());
                }
                Err(e) => {
                    error!("Error reading exec output: {}", e);
                    break;
                }
            }
        }
    }

    // Get exit code
    let inspect = state.docker.inspect_exec(&exec.id).await.ok();
    let exit_code = inspect.and_then(|i| i.exit_code);

    Ok(Json(ExecResponse {
        container_id: id,
        output,
        exit_code,
    }))
}

/// Container stats response
#[derive(Debug, Serialize, ToSchema)]
pub struct ContainerStats {
    pub name: String,
    pub cpu_percent: f64,
    pub memory_usage: u64,
    pub memory_limit: u64,
    pub memory_percent: f64,
    pub network_rx: u64,
    pub network_tx: u64,
    pub block_read: u64,
    pub block_write: u64,
}

/// Aggregate stats response
#[derive(Debug, Serialize, ToSchema)]
pub struct AggregateStats {
    pub timestamp: i64,
    pub total_cpu_percent: f64,
    pub total_memory_usage: u64,
    pub total_memory_limit: u64,
    pub total_memory_percent: f64,
    pub total_network_rx: u64,
    pub total_network_tx: u64,
    pub total_block_read: u64,
    pub total_block_write: u64,
    pub container_count: usize,
    pub containers: Vec<ContainerStats>,
}

/// Get Docker container stats
#[utoipa::path(
    get,
    path = "/docker/stats",
    tag = "Docker",
    responses(
        (status = 200, description = "Container stats", body = AggregateStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_docker_stats(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // First get list of running anchor containers
    let mut filters = HashMap::new();
    filters.insert("name", vec!["anchor-"]);
    filters.insert("status", vec!["running"]);

    let options = Some(ListContainersOptions {
        all: false,
        filters,
        ..Default::default()
    });

    let containers = match state.docker.list_containers(options).await {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to list containers: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let mut container_stats = Vec::new();
    let mut total_cpu = 0.0;
    let mut total_memory_usage = 0u64;
    let mut total_memory_limit = 0u64;
    let mut total_network_rx = 0u64;
    let mut total_network_tx = 0u64;
    let mut total_block_read = 0u64;
    let mut total_block_write = 0u64;

    for container in containers.iter() {
        let id = match &container.id {
            Some(id) => id.clone(),
            None => continue,
        };

        let name = container
            .names
            .as_ref()
            .and_then(|n| n.first())
            .map(|n| n.trim_start_matches('/').to_string())
            .unwrap_or_default();

        // Get one-shot stats
        let stats_options = Some(StatsOptions {
            stream: false,
            one_shot: true,
        });

        let mut stats_stream = state.docker.stats(&id, stats_options);
        
        if let Some(Ok(stats)) = stats_stream.next().await {
            // Calculate CPU percentage
            let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64
                - stats.precpu_stats.cpu_usage.total_usage as f64;
            let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64
                - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;
            let num_cpus = stats.cpu_stats.online_cpus.unwrap_or(1) as f64;
            
            let cpu_percent = if system_delta > 0.0 && cpu_delta > 0.0 {
                (cpu_delta / system_delta) * num_cpus * 100.0
            } else {
                0.0
            };

            // Memory stats
            let memory_usage = stats.memory_stats.usage.unwrap_or(0);
            let memory_limit = stats.memory_stats.limit.unwrap_or(1);
            let memory_percent = (memory_usage as f64 / memory_limit as f64) * 100.0;

            // Network stats
            let (network_rx, network_tx) = stats
                .networks
                .as_ref()
                .map(|nets| {
                    nets.values().fold((0u64, 0u64), |(rx, tx), net| {
                        (rx + net.rx_bytes, tx + net.tx_bytes)
                    })
                })
                .unwrap_or((0, 0));

            // Block I/O stats
            let (block_read, block_write) = stats
                .blkio_stats
                .io_service_bytes_recursive
                .as_ref()
                .map(|ios| {
                    ios.iter().fold((0u64, 0u64), |(r, w), io| {
                        let op_str: &str = &io.op;
                        match op_str {
                            "read" | "Read" => (r + io.value, w),
                            "write" | "Write" => (r, w + io.value),
                            _ => (r, w),
                        }
                    })
                })
                .unwrap_or((0, 0));

            total_cpu += cpu_percent;
            total_memory_usage += memory_usage;
            total_memory_limit = memory_limit; // Use single container limit as reference
            total_network_rx += network_rx;
            total_network_tx += network_tx;
            total_block_read += block_read;
            total_block_write += block_write;

            container_stats.push(ContainerStats {
                name,
                cpu_percent,
                memory_usage,
                memory_limit,
                memory_percent,
                network_rx,
                network_tx,
                block_read,
                block_write,
            });
        }
    }

    let total_memory_percent = if total_memory_limit > 0 {
        (total_memory_usage as f64 / total_memory_limit as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(AggregateStats {
        timestamp: chrono::Utc::now().timestamp_millis(),
        total_cpu_percent: total_cpu,
        total_memory_usage,
        total_memory_limit,
        total_memory_percent,
        total_network_rx,
        total_network_tx,
        total_block_read,
        total_block_write,
        container_count: container_stats.len(),
        containers: container_stats,
    }))
}

