//! Indexer statistics handlers

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::{interval, Duration};
use utoipa::{IntoParams, ToSchema};

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
    
    let last_indexed_block = if last_block.is_empty() {
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

// ============================================================================
// Message Explorer Types & Endpoints
// ============================================================================

/// Query parameters for message listing
#[derive(Debug, Deserialize, IntoParams)]
pub struct MessageQuery {
    /// Filter by message kind
    pub kind: Option<i32>,
    /// Filter by carrier type
    pub carrier: Option<i32>,
    /// Filter by block height (exact)
    pub block: Option<i32>,
    /// Filter by block range start
    pub block_from: Option<i32>,
    /// Filter by block range end
    pub block_to: Option<i32>,
    /// Search in body (hex encoded)
    pub search: Option<String>,
    /// Number of results (default 50, max 100)
    pub limit: Option<i32>,
    /// Offset for pagination
    pub offset: Option<i32>,
    /// Sort order: "asc" or "desc" (default "desc")
    pub order: Option<String>,
}

/// A message in the explorer list
#[derive(Debug, Serialize, ToSchema)]
pub struct MessageListItem {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub kind: i32,
    pub kind_name: String,
    pub carrier: i32,
    pub carrier_name: String,
    pub body_preview: String,
    pub body_size: i32,
    pub anchor_count: i32,
    pub created_at: String,
}

/// Paginated messages response
#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedMessages {
    pub messages: Vec<MessageListItem>,
    pub total: i64,
    pub limit: i32,
    pub offset: i32,
    pub has_more: bool,
}

/// Anchor information for a message
#[derive(Debug, Serialize, ToSchema)]
pub struct AnchorInfo {
    pub anchor_index: i16,
    pub txid_prefix: String,
    pub vout: i16,
    pub resolved_txid: Option<String>,
    pub resolved_message_id: Option<i32>,
    pub is_ambiguous: bool,
    pub is_orphan: bool,
}

/// Detailed message information
#[derive(Debug, Serialize, ToSchema)]
pub struct MessageDetail {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub block_hash: Option<String>,
    pub kind: i32,
    pub kind_name: String,
    pub carrier: i32,
    pub carrier_name: String,
    pub body_hex: String,
    pub body_text: Option<String>,
    pub body_size: i32,
    pub anchors: Vec<AnchorInfo>,
    pub replies_count: i64,
    pub created_at: String,
}

/// Get paginated messages with filters
#[utoipa::path(
    get,
    path = "/indexer/messages",
    tag = "Indexer",
    params(MessageQuery),
    responses(
        (status = 200, description = "Paginated messages", body = PaginatedMessages),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Query(params): Query<MessageQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = params.limit.unwrap_or(50).min(100).max(1);
    let offset = params.offset.unwrap_or(0).max(0);
    let order = params.order.as_deref().unwrap_or("desc");
    let order_sql = if order == "asc" { "ASC" } else { "DESC" };

    // Build WHERE clause
    let mut conditions = Vec::new();
    if let Some(kind) = params.kind {
        conditions.push(format!("kind = {}", kind));
    }
    if let Some(carrier) = params.carrier {
        conditions.push(format!("carrier = {}", carrier));
    }
    if let Some(block) = params.block {
        conditions.push(format!("block_height = {}", block));
    }
    if let Some(block_from) = params.block_from {
        conditions.push(format!("block_height >= {}", block_from));
    }
    if let Some(block_to) = params.block_to {
        conditions.push(format!("block_height <= {}", block_to));
    }
    if let Some(ref search) = params.search {
        // Search in body hex
        let clean_search = search.replace('\'', "''");
        conditions.push(format!("encode(body, 'hex') ILIKE '%{}%'", clean_search));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Get total count
    let count_query = format!("SELECT COUNT(*) FROM messages {}", where_clause);
    let total = exec_sql(&state.docker, &count_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    // Get messages with anchor count
    let query = format!(
        r#"
        SELECT 
            m.id, 
            encode(m.txid, 'hex') as txid, 
            m.vout, 
            m.block_height, 
            m.kind, 
            m.carrier,
            encode(substring(m.body from 1 for 50), 'hex') as body_preview,
            length(m.body) as body_size,
            (SELECT COUNT(*) FROM anchors a WHERE a.message_id = m.id) as anchor_count,
            to_char(m.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
        FROM messages m
        {}
        ORDER BY m.created_at {}
        LIMIT {} OFFSET {}
        "#,
        where_clause, order_sql, limit, offset
    );

    let result = exec_sql(&state.docker, &query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let messages: Vec<MessageListItem> = result
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 10 {
                let id = parts[0].parse::<i32>().ok()?;
                let txid = parts[1].to_string();
                let vout = parts[2].parse::<i32>().ok()?;
                let block_height = parts[3].parse::<i32>().ok();
                let kind = parts[4].parse::<i32>().ok()?;
                let carrier = parts[5].parse::<i32>().ok()?;
                let body_preview = parts[6].to_string();
                let body_size = parts[7].parse::<i32>().unwrap_or(0);
                let anchor_count = parts[8].parse::<i32>().unwrap_or(0);
                let created_at = parts[9].to_string();

                Some(MessageListItem {
                    id,
                    txid,
                    vout,
                    block_height,
                    kind,
                    kind_name: get_kind_name(kind),
                    carrier,
                    carrier_name: get_carrier_name(carrier),
                    body_preview,
                    body_size,
                    anchor_count,
                    created_at,
                })
            } else {
                None
            }
        })
        .collect();

    Ok(Json(PaginatedMessages {
        messages,
        total,
        limit,
        offset,
        has_more: (offset + limit) < total as i32,
    }))
}

/// Get detailed message by txid and vout
#[utoipa::path(
    get,
    path = "/indexer/messages/{txid}/{vout}",
    tag = "Indexer",
    params(
        ("txid" = String, Path, description = "Transaction ID (hex)"),
        ("vout" = i32, Path, description = "Output index")
    ),
    responses(
        (status = 200, description = "Message details", body = MessageDetail),
        (status = 404, description = "Message not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_message_detail(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get message
    let query = format!(
        r#"
        SELECT 
            m.id,
            encode(m.txid, 'hex') as txid,
            m.vout,
            m.block_height,
            encode(m.block_hash, 'hex') as block_hash,
            m.kind,
            m.carrier,
            encode(m.body, 'hex') as body_hex,
            length(m.body) as body_size,
            to_char(m.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
        FROM messages m
        WHERE encode(m.txid, 'hex') = '{}'
        AND m.vout = {}
        "#,
        txid, vout
    );

    let result = exec_sql(&state.docker, &query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    if result.is_empty() {
        return Err((StatusCode::NOT_FOUND, "Message not found".to_string()));
    }

    let parts: Vec<&str> = result.split('|').collect();
    if parts.len() < 10 {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Invalid response".to_string()));
    }

    let id = parts[0].parse::<i32>().map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Parse error".to_string()))?;
    let body_hex = parts[7].to_string();
    
    // Try to decode body as UTF-8 text
    let body_text = hex::decode(&body_hex)
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok());

    // Get anchors
    let anchors_query = format!(
        r#"
        SELECT 
            anchor_index,
            encode(txid_prefix, 'hex') as txid_prefix,
            vout,
            encode(resolved_txid, 'hex') as resolved_txid,
            resolved_message_id,
            is_ambiguous,
            is_orphan
        FROM anchors
        WHERE message_id = {}
        ORDER BY anchor_index
        "#,
        id
    );

    let anchors_result = exec_sql(&state.docker, &anchors_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let anchors: Vec<AnchorInfo> = anchors_result
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 7 {
                Some(AnchorInfo {
                    anchor_index: parts[0].parse().ok()?,
                    txid_prefix: parts[1].to_string(),
                    vout: parts[2].parse().ok()?,
                    resolved_txid: if parts[3].is_empty() { None } else { Some(parts[3].to_string()) },
                    resolved_message_id: parts[4].parse().ok(),
                    is_ambiguous: parts[5] == "t",
                    is_orphan: parts[6] == "t",
                })
            } else {
                None
            }
        })
        .collect();

    // Get replies count
    let replies_query = format!(
        r#"
        SELECT COUNT(*) FROM messages m2
        INNER JOIN anchors a ON a.message_id = m2.id
        WHERE a.resolved_message_id = {}
        "#,
        id
    );
    let replies_count = exec_sql(&state.docker, &replies_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    Ok(Json(MessageDetail {
        id,
        txid: parts[1].to_string(),
        vout: parts[2].parse().unwrap_or(0),
        block_height: parts[3].parse().ok(),
        block_hash: if parts[4].is_empty() { None } else { Some(parts[4].to_string()) },
        kind: parts[5].parse().unwrap_or(0),
        kind_name: get_kind_name(parts[5].parse().unwrap_or(0)),
        carrier: parts[6].parse().unwrap_or(0),
        carrier_name: get_carrier_name(parts[6].parse().unwrap_or(0)),
        body_hex,
        body_text,
        body_size: parts[8].parse().unwrap_or(0),
        anchors,
        replies_count,
        created_at: parts[9].to_string(),
    }))
}

// ============================================================================
// Time-Series Analytics Types & Endpoints
// ============================================================================

/// Query parameters for time-series data
#[derive(Debug, Deserialize, IntoParams)]
pub struct TimeseriesQuery {
    /// Time period: "hour", "day", "week" (default "day")
    pub period: Option<String>,
    /// Number of periods to fetch (default 30)
    pub count: Option<i32>,
}

/// Time-series data point
#[derive(Debug, Serialize, ToSchema)]
pub struct TimeseriesPoint {
    pub timestamp: String,
    pub total: i64,
    pub by_kind: Vec<KindDataPoint>,
    pub by_carrier: Vec<CarrierDataPoint>,
}

/// Kind data point for time-series
#[derive(Debug, Serialize, ToSchema)]
pub struct KindDataPoint {
    pub kind: i32,
    pub kind_name: String,
    pub count: i64,
}

/// Carrier data point for time-series
#[derive(Debug, Serialize, ToSchema)]
pub struct CarrierDataPoint {
    pub carrier: i32,
    pub carrier_name: String,
    pub count: i64,
}

/// Time-series response
#[derive(Debug, Serialize, ToSchema)]
pub struct TimeseriesData {
    pub period: String,
    pub points: Vec<TimeseriesPoint>,
}

/// Get time-series analytics data
#[utoipa::path(
    get,
    path = "/indexer/stats/timeseries",
    tag = "Indexer",
    params(TimeseriesQuery),
    responses(
        (status = 200, description = "Time-series data", body = TimeseriesData),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_timeseries(
    State(state): State<Arc<AppState>>,
    Query(params): Query<TimeseriesQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let period = params.period.as_deref().unwrap_or("day");
    let count = params.count.unwrap_or(30).min(365).max(1);

    let truncate_fn = match period {
        "hour" => "hour",
        "week" => "week",
        _ => "day",
    };

    // Get totals by period
    let totals_query = format!(
        r#"
        SELECT 
            to_char(date_trunc('{}', created_at), 'YYYY-MM-DD HH24:MI:SS') as ts,
            COUNT(*) as total
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '{} {}s'
        GROUP BY date_trunc('{}', created_at)
        ORDER BY ts ASC
        "#,
        truncate_fn, count, period, truncate_fn
    );

    let totals_result = exec_sql(&state.docker, &totals_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Get by kind
    let by_kind_query = format!(
        r#"
        SELECT 
            to_char(date_trunc('{}', created_at), 'YYYY-MM-DD HH24:MI:SS') as ts,
            kind,
            COUNT(*) as count
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '{} {}s'
        GROUP BY date_trunc('{}', created_at), kind
        ORDER BY ts ASC
        "#,
        truncate_fn, count, period, truncate_fn
    );

    let by_kind_result = exec_sql(&state.docker, &by_kind_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Get by carrier
    let by_carrier_query = format!(
        r#"
        SELECT 
            to_char(date_trunc('{}', created_at), 'YYYY-MM-DD HH24:MI:SS') as ts,
            carrier,
            COUNT(*) as count
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '{} {}s'
        GROUP BY date_trunc('{}', created_at), carrier
        ORDER BY ts ASC
        "#,
        truncate_fn, count, period, truncate_fn
    );

    let by_carrier_result = exec_sql(&state.docker, &by_carrier_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Build points map
    let mut points_map: std::collections::HashMap<String, TimeseriesPoint> = std::collections::HashMap::new();

    // Parse totals
    for line in totals_result.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            let ts = parts[0].to_string();
            let total = parts[1].parse::<i64>().unwrap_or(0);
            points_map.insert(ts.clone(), TimeseriesPoint {
                timestamp: ts,
                total,
                by_kind: Vec::new(),
                by_carrier: Vec::new(),
            });
        }
    }

    // Parse by kind
    for line in by_kind_result.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            let ts = parts[0].to_string();
            if let Some(point) = points_map.get_mut(&ts) {
                if let (Some(kind), Some(count)) = (parts[1].parse::<i32>().ok(), parts[2].parse::<i64>().ok()) {
                    point.by_kind.push(KindDataPoint {
                        kind,
                        kind_name: get_kind_name(kind),
                        count,
                    });
                }
            }
        }
    }

    // Parse by carrier
    for line in by_carrier_result.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            let ts = parts[0].to_string();
            if let Some(point) = points_map.get_mut(&ts) {
                if let (Some(carrier), Some(count)) = (parts[1].parse::<i32>().ok(), parts[2].parse::<i64>().ok()) {
                    point.by_carrier.push(CarrierDataPoint {
                        carrier,
                        carrier_name: get_carrier_name(carrier),
                        count,
                    });
                }
            }
        }
    }

    // Convert to sorted vec
    let mut points: Vec<TimeseriesPoint> = points_map.into_values().collect();
    points.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    Ok(Json(TimeseriesData {
        period: period.to_string(),
        points,
    }))
}

// ============================================================================
// Anchor Analytics Types & Endpoints
// ============================================================================

/// Anchor statistics
#[derive(Debug, Serialize, ToSchema)]
pub struct AnchorStats {
    pub total: i64,
    pub resolved: i64,
    pub orphaned: i64,
    pub ambiguous: i64,
    pub pending: i64,
    pub resolution_rate: f64,
}

/// Orphan anchor info
#[derive(Debug, Serialize, ToSchema)]
pub struct OrphanAnchor {
    pub id: i32,
    pub message_id: i32,
    pub message_txid: String,
    pub anchor_index: i16,
    pub txid_prefix: String,
    pub vout: i16,
}

/// Get anchor statistics
#[utoipa::path(
    get,
    path = "/indexer/anchors/stats",
    tag = "Indexer",
    responses(
        (status = 200, description = "Anchor statistics", body = AnchorStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_anchor_stats(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let query = r#"
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE resolved_txid IS NOT NULL) as resolved,
            COUNT(*) FILTER (WHERE is_orphan = TRUE) as orphaned,
            COUNT(*) FILTER (WHERE is_ambiguous = TRUE) as ambiguous,
            COUNT(*) FILTER (WHERE resolved_txid IS NULL AND is_orphan = FALSE AND is_ambiguous = FALSE) as pending
        FROM anchors
    "#;

    let result = exec_sql(&state.docker, query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let parts: Vec<&str> = result.split('|').collect();
    if parts.len() < 5 {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Invalid response".to_string()));
    }

    let total = parts[0].parse::<i64>().unwrap_or(0);
    let resolved = parts[1].parse::<i64>().unwrap_or(0);
    let orphaned = parts[2].parse::<i64>().unwrap_or(0);
    let ambiguous = parts[3].parse::<i64>().unwrap_or(0);
    let pending = parts[4].parse::<i64>().unwrap_or(0);

    let resolution_rate = if total > 0 {
        (resolved as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(AnchorStats {
        total,
        resolved,
        orphaned,
        ambiguous,
        pending,
        resolution_rate,
    }))
}

/// Query params for orphans
#[derive(Debug, Deserialize, IntoParams)]
pub struct OrphansQuery {
    /// Limit results (default 20, max 100)
    pub limit: Option<i32>,
}

/// Get recent orphan anchors
#[utoipa::path(
    get,
    path = "/indexer/anchors/orphans",
    tag = "Indexer",
    params(OrphansQuery),
    responses(
        (status = 200, description = "Orphan anchors list", body = Vec<OrphanAnchor>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_orphan_anchors(
    State(state): State<Arc<AppState>>,
    Query(params): Query<OrphansQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = params.limit.unwrap_or(20).min(100).max(1);

    let query = format!(
        r#"
        SELECT 
            a.id,
            a.message_id,
            encode(m.txid, 'hex') as message_txid,
            a.anchor_index,
            encode(a.txid_prefix, 'hex') as txid_prefix,
            a.vout
        FROM anchors a
        INNER JOIN messages m ON m.id = a.message_id
        WHERE a.is_orphan = TRUE
        ORDER BY a.id DESC
        LIMIT {}
        "#,
        limit
    );

    let result = exec_sql(&state.docker, &query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let orphans: Vec<OrphanAnchor> = result
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 6 {
                Some(OrphanAnchor {
                    id: parts[0].parse().ok()?,
                    message_id: parts[1].parse().ok()?,
                    message_txid: parts[2].to_string(),
                    anchor_index: parts[3].parse().ok()?,
                    txid_prefix: parts[4].to_string(),
                    vout: parts[5].parse().ok()?,
                })
            } else {
                None
            }
        })
        .collect();

    Ok(Json(orphans))
}

// ============================================================================
// Performance Metrics Types & Endpoints
// ============================================================================

/// Performance metrics
#[derive(Debug, Serialize, ToSchema)]
pub struct PerformanceStats {
    pub is_synced: bool,
    pub last_indexed_block: i32,
    pub current_chain_height: Option<i32>,
    pub blocks_behind: i32,
    pub messages_per_block: f64,
    pub total_messages: i64,
    pub indexer_status: String,
    pub last_update: String,
}

/// Get performance metrics
#[utoipa::path(
    get,
    path = "/indexer/stats/performance",
    tag = "Indexer",
    responses(
        (status = 200, description = "Performance statistics", body = PerformanceStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_performance(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get indexer state
    let state_query = r#"
        SELECT 
            last_block_height,
            to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
        FROM indexer_state 
        WHERE id = 1
    "#;

    let state_result = exec_sql(&state.docker, state_query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let parts: Vec<&str> = state_result.split('|').collect();
    let last_indexed_block = parts.first().and_then(|s| s.parse::<i32>().ok()).unwrap_or(0);
    let last_update = parts.get(1).map(|s| s.to_string()).unwrap_or_default();

    // Get total messages
    let total_messages = exec_sql(&state.docker, "SELECT COUNT(*) FROM messages")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    // Get blocks with messages count
    let blocks_with_messages = exec_sql(&state.docker, "SELECT COUNT(DISTINCT block_height) FROM messages WHERE block_height IS NOT NULL")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .parse::<i64>()
        .unwrap_or(0);

    let messages_per_block = if blocks_with_messages > 0 {
        total_messages as f64 / blocks_with_messages as f64
    } else {
        0.0
    };

    // Try to get current chain height from bitcoin container
    let chain_height: Option<i32> = None; // Would need RPC call

    let blocks_behind = 0; // Would calculate from chain_height - last_indexed_block
    let is_synced = blocks_behind <= 1;

    // Check if indexer container is running
    let indexer_status = match state.docker.inspect_container("anchor-core-indexer", None).await {
        Ok(info) => {
            if info.state.as_ref().and_then(|s| s.running).unwrap_or(false) {
                "running".to_string()
            } else {
                "stopped".to_string()
            }
        }
        Err(_) => "unknown".to_string(),
    };

    Ok(Json(PerformanceStats {
        is_synced,
        last_indexed_block,
        current_chain_height: chain_height,
        blocks_behind,
        messages_per_block,
        total_messages,
        indexer_status,
        last_update,
    }))
}

// ============================================================================
// WebSocket Live Feed
// ============================================================================

/// Live message event
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct LiveMessageEvent {
    pub event_type: String,
    pub message: Option<LiveMessage>,
    pub stats: Option<LiveStats>,
    pub timestamp: String,
}

/// Live message data
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct LiveMessage {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub kind: i32,
    pub kind_name: String,
    pub carrier: i32,
    pub carrier_name: String,
    pub body_preview: String,
}

/// Live stats update
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct LiveStats {
    pub total_messages: i64,
    pub last_indexed_block: i32,
}

/// WebSocket live feed handler
pub async fn ws_live_feed(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_live_feed(socket, state))
}

async fn handle_live_feed(mut socket: WebSocket, state: Arc<AppState>) {
    let mut last_message_id: i32 = 0;
    let mut poll_interval = interval(Duration::from_secs(2));

    // Get initial last message ID
    if let Ok(result) = exec_sql(&state.docker, "SELECT COALESCE(MAX(id), 0) FROM messages").await {
        last_message_id = result.parse().unwrap_or(0);
    }

    // Send initial stats
    if let Ok(stats_event) = get_live_stats(&state.docker).await {
        let msg = serde_json::to_string(&stats_event).unwrap_or_default();
        if socket.send(Message::Text(msg.into())).await.is_err() {
            return;
        }
    }

    loop {
        poll_interval.tick().await;

        // Check for new messages
        let query = format!(
            r#"
            SELECT 
                id,
                encode(txid, 'hex') as txid,
                vout,
                block_height,
                kind,
                carrier,
                encode(substring(body from 1 for 30), 'hex') as body_preview
            FROM messages
            WHERE id > {}
            ORDER BY id ASC
            LIMIT 50
            "#,
            last_message_id
        );

        match exec_sql(&state.docker, &query).await {
            Ok(result) => {
                for line in result.lines() {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 7 {
                        if let Some(id) = parts[0].parse::<i32>().ok() {
                            let kind = parts[4].parse::<i32>().unwrap_or(0);
                            let carrier = parts[5].parse::<i32>().unwrap_or(0);

                            let event = LiveMessageEvent {
                                event_type: "new_message".to_string(),
                                message: Some(LiveMessage {
                                    id,
                                    txid: parts[1].to_string(),
                                    vout: parts[2].parse().unwrap_or(0),
                                    block_height: parts[3].parse().ok(),
                                    kind,
                                    kind_name: get_kind_name(kind),
                                    carrier,
                                    carrier_name: get_carrier_name(carrier),
                                    body_preview: parts[6].to_string(),
                                }),
                                stats: None,
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };

                            let msg = serde_json::to_string(&event).unwrap_or_default();
                            if socket.send(Message::Text(msg.into())).await.is_err() {
                                return;
                            }

                            last_message_id = id;
                        }
                    }
                }
            }
            Err(_) => {
                // Send error event
                let event = LiveMessageEvent {
                    event_type: "error".to_string(),
                    message: None,
                    stats: None,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                };
                let msg = serde_json::to_string(&event).unwrap_or_default();
                let _ = socket.send(Message::Text(msg.into())).await;
            }
        }

        // Send periodic stats update
        if let Ok(stats_event) = get_live_stats(&state.docker).await {
            let msg = serde_json::to_string(&stats_event).unwrap_or_default();
            if socket.send(Message::Text(msg.into())).await.is_err() {
                return;
            }
        }

        // Check if client disconnected
        if socket.send(Message::Ping(vec![].into())).await.is_err() {
            return;
        }
    }
}

async fn get_live_stats(docker: &bollard::Docker) -> Result<LiveMessageEvent, String> {
    let total = exec_sql(docker, "SELECT COUNT(*) FROM messages")
        .await?
        .parse::<i64>()
        .unwrap_or(0);

    let last_block = exec_sql(docker, "SELECT COALESCE(last_block_height, 0) FROM indexer_state WHERE id = 1")
        .await?
        .parse::<i32>()
        .unwrap_or(0);

    Ok(LiveMessageEvent {
        event_type: "stats".to_string(),
        message: None,
        stats: Some(LiveStats {
            total_messages: total,
            last_indexed_block: last_block,
        }),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
