//! Indexer statistics handlers

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use futures::StreamExt;
use serde::Serialize;
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::AppState;

const POSTGRES_CONTAINER: &str = "anchor-core-postgres";

/// Indexer statistics response
#[derive(Debug, Serialize, ToSchema)]
pub struct IndexerStats {
    pub total_messages: i64,
    pub total_blocks_with_messages: i64,
    pub messages_by_kind: Vec<MessageKindCount>,
    pub messages_by_carrier: Vec<CarrierCount>,
    pub recent_messages_24h: i64,
    pub last_indexed_block: Option<i64>,
}

/// Message count by kind
#[derive(Debug, Serialize, ToSchema)]
pub struct MessageKindCount {
    pub kind: i32,
    pub kind_name: String,
    pub count: i64,
}

/// Message count by carrier
#[derive(Debug, Serialize, ToSchema)]
pub struct CarrierCount {
    pub carrier: i32,
    pub carrier_name: String,
    pub count: i64,
}

fn get_kind_name(kind: i32) -> String {
    match kind {
        1 => "Text".to_string(),
        2 => "Canvas".to_string(),
        3 => "Image".to_string(),
        4 => "Map".to_string(),
        5 => "DNS".to_string(),
        6 => "Proof".to_string(),
        10 => "Token Deploy".to_string(),
        11 => "Token Mint".to_string(),
        20 => "Token Transfer".to_string(),
        _ => format!("Kind {}", kind),
    }
}

fn get_carrier_name(carrier: i32) -> String {
    match carrier {
        0 => "OP_RETURN".to_string(),
        1 => "Inscription".to_string(),
        2 => "Stamps".to_string(),
        3 => "Taproot Annex".to_string(),
        4 => "Witness Data".to_string(),
        _ => format!("Carrier {}", carrier),
    }
}

async fn exec_sql(docker: &bollard::Docker, query: &str) -> Result<String, String> {
    let exec_options = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(vec![
            "psql",
            "-U", "anchor",
            "-d", "anchor",
            "-t",
            "-A",
            "-c", query,
        ]),
        ..Default::default()
    };

    let exec = match docker.create_exec(POSTGRES_CONTAINER, exec_options).await {
        Ok(exec) => exec,
        Err(e) => return Err(format!("Failed to create exec: {}", e)),
    };

    let start_result = match docker.start_exec(&exec.id, None).await {
        Ok(result) => result,
        Err(e) => return Err(format!("Failed to start exec: {}", e)),
    };

    let mut output = String::new();
    if let StartExecResults::Attached { output: mut stream, .. } = start_result {
        while let Some(result) = stream.next().await {
            match result {
                Ok(chunk) => output.push_str(&chunk.to_string()),
                Err(e) => return Err(format!("Error reading output: {}", e)),
            }
        }
    }

    Ok(output.trim().to_string())
}

/// Get indexer statistics
#[utoipa::path(
    get,
    path = "/indexer/stats",
    tag = "Indexer",
    responses(
        (status = 200, description = "Indexer statistics", body = IndexerStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_indexer_stats(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get total messages count
    let total_messages = exec_sql(&state.docker, "SELECT COUNT(*) FROM messages")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    // Get total blocks with messages
    let total_blocks = exec_sql(&state.docker, "SELECT COUNT(DISTINCT block_height) FROM messages")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    // Get messages by kind
    let kind_query = "SELECT kind, COUNT(*) FROM messages GROUP BY kind ORDER BY count DESC";
    let kind_result = exec_sql(&state.docker, kind_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let messages_by_kind: Vec<MessageKindCount> = kind_result
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                let kind = parts[0].parse::<i32>().ok()?;
                let count = parts[1].parse::<i64>().ok()?;
                Some(MessageKindCount {
                    kind,
                    kind_name: get_kind_name(kind),
                    count,
                })
            } else {
                None
            }
        })
        .collect();

    // Get messages by carrier
    let carrier_query = "SELECT carrier, COUNT(*) FROM messages GROUP BY carrier ORDER BY count DESC";
    let carrier_result = exec_sql(&state.docker, carrier_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let messages_by_carrier: Vec<CarrierCount> = carrier_result
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                let carrier = parts[0].parse::<i32>().ok()?;
                let count = parts[1].parse::<i64>().ok()?;
                Some(CarrierCount {
                    carrier,
                    carrier_name: get_carrier_name(carrier),
                    count,
                })
            } else {
                None
            }
        })
        .collect();

    // Get recent messages (last 24h - approximate by last 144 blocks for regtest)
    let recent_messages = exec_sql(
        &state.docker,
        "SELECT COUNT(*) FROM messages WHERE block_height > (SELECT COALESCE(MAX(block_height), 0) - 144 FROM messages)"
    )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    // Get last indexed block
    let last_block = exec_sql(&state.docker, "SELECT COALESCE(MAX(block_height), 0) FROM messages")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    let last_indexed_block = if last_block.is_empty() || last_block == "" {
        None
    } else {
        last_block.parse::<i64>().ok()
    };

    Ok(Json(IndexerStats {
        total_messages,
        total_blocks_with_messages: total_blocks,
        messages_by_kind,
        messages_by_carrier,
        recent_messages_24h: recent_messages,
        last_indexed_block,
    }))
}
