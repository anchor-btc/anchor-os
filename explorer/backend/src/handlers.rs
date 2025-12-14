//! HTTP request handlers for the explorer API

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::models::{ListParams, FilterParams, PaginatedResponse};
use crate::AppState;

/// Health check response
#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

/// Convert display format txid (hex string) to internal format bytes
/// Bitcoin txids are displayed in reverse byte order, so we need to reverse
/// when converting from display format to internal format for database queries.
fn display_txid_to_internal(txid_hex: &str) -> Result<Vec<u8>, String> {
    let mut bytes = hex::decode(txid_hex).map_err(|e| format!("Invalid txid hex: {}", e))?;
    bytes.reverse();
    Ok(bytes)
}

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/health",
    tag = "System",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    )
)]
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "explorer-backend".to_string(),
    })
}

/// Get protocol statistics
#[utoipa::path(
    get,
    path = "/stats",
    tag = "Statistics",
    responses(
        (status = 200, description = "Protocol statistics", body = crate::models::StatsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_stats(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.get_stats().await {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            error!("Failed to get stats: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// List messages with pagination
#[utoipa::path(
    get,
    path = "/messages",
    tag = "Messages",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default: 20)"),
        ("kind" = Option<i16>, Query, description = "Filter by message kind")
    ),
    responses(
        (status = 200, description = "Paginated list of messages"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_messages(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.list_messages(&params).await {
        Ok((messages, total)) => {
            let total_pages = ((total as f64) / (params.per_page as f64)).ceil() as i32;
            Ok(Json(PaginatedResponse {
                data: messages,
                total,
                page: params.page,
                per_page: params.per_page,
                total_pages,
            }))
        }
        Err(e) => {
            error!("Failed to list messages: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// List root messages (thread starts)
#[utoipa::path(
    get,
    path = "/roots",
    tag = "Threads",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default: 20)")
    ),
    responses(
        (status = 200, description = "Paginated list of root messages"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_roots(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.list_roots(&params).await {
        Ok((messages, total)) => {
            let total_pages = ((total as f64) / (params.per_page as f64)).ceil() as i32;
            Ok(Json(PaginatedResponse {
                data: messages,
                total,
                page: params.page,
                per_page: params.per_page,
                total_pages,
            }))
        }
        Err(e) => {
            error!("Failed to list roots: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// List roots with advanced filters
#[utoipa::path(
    get,
    path = "/roots/filter",
    tag = "Threads",
    params(
        ("page" = Option<i32>, Query, description = "Page number"),
        ("per_page" = Option<i32>, Query, description = "Items per page"),
        ("txid" = Option<String>, Query, description = "Filter by transaction ID (partial match)"),
        ("block_height" = Option<i32>, Query, description = "Filter by exact block height"),
        ("block_min" = Option<i32>, Query, description = "Minimum block height"),
        ("block_max" = Option<i32>, Query, description = "Maximum block height"),
        ("kind" = Option<i16>, Query, description = "Filter by message kind"),
        ("text" = Option<String>, Query, description = "Filter by text content"),
        ("from_date" = Option<String>, Query, description = "Filter by minimum timestamp (ISO 8601)"),
        ("to_date" = Option<String>, Query, description = "Filter by maximum timestamp (ISO 8601)"),
        ("min_size" = Option<i32>, Query, description = "Minimum body size in bytes"),
        ("max_size" = Option<i32>, Query, description = "Maximum body size in bytes"),
        ("min_replies" = Option<i32>, Query, description = "Minimum reply count"),
        ("sort" = Option<String>, Query, description = "Sort order: newest, oldest, replies, size")
    ),
    responses(
        (status = 200, description = "Paginated list of filtered root messages"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_roots_filtered(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FilterParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.list_roots_filtered(&params).await {
        Ok((messages, total)) => {
            let total_pages = ((total as f64) / (params.per_page as f64)).ceil() as i32;
            Ok(Json(PaginatedResponse {
                data: messages,
                total,
                page: params.page,
                per_page: params.per_page,
                total_pages,
            }))
        }
        Err(e) => {
            error!("Failed to list filtered roots: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get a specific message
#[utoipa::path(
    get,
    path = "/messages/{txid}/{vout}",
    tag = "Messages",
    params(
        ("txid" = String, Path, description = "Transaction ID (hex)"),
        ("vout" = i32, Path, description = "Output index")
    ),
    responses(
        (status = 200, description = "Message details", body = crate::models::MessageResponse),
        (status = 404, description = "Message not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_message(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let txid_bytes = display_txid_to_internal(&txid).map_err(|e| {
        (StatusCode::BAD_REQUEST, e)
    })?;

    match state.db.get_message(&txid_bytes, vout).await {
        Ok(Some(message)) => Ok(Json(message)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Message not found".to_string())),
        Err(e) => {
            error!("Failed to get message: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get replies to a message
#[utoipa::path(
    get,
    path = "/replies/{txid}/{vout}",
    tag = "Threads",
    params(
        ("txid" = String, Path, description = "Parent transaction ID (hex)"),
        ("vout" = i32, Path, description = "Parent output index")
    ),
    responses(
        (status = 200, description = "List of replies", body = Vec<crate::models::MessageResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_replies(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let txid_bytes = display_txid_to_internal(&txid).map_err(|e| {
        (StatusCode::BAD_REQUEST, e)
    })?;

    match state.db.get_replies(&txid_bytes, vout).await {
        Ok(replies) => Ok(Json(replies)),
        Err(e) => {
            error!("Failed to get replies: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get popular threads sorted by total message count
#[utoipa::path(
    get,
    path = "/popular",
    tag = "Threads",
    params(
        ("per_page" = Option<i32>, Query, description = "Number of threads to return (max: 20)")
    ),
    responses(
        (status = 200, description = "List of popular threads", body = Vec<crate::models::PopularThreadResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_popular_threads(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = params.per_page.min(20); // Max 20 popular threads
    match state.db.get_popular_threads(limit).await {
        Ok(threads) => Ok(Json(threads)),
        Err(e) => {
            error!("Failed to get popular threads: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get a full thread
#[utoipa::path(
    get,
    path = "/threads/{txid}/{vout}",
    tag = "Threads",
    params(
        ("txid" = String, Path, description = "Root transaction ID (hex)"),
        ("vout" = i32, Path, description = "Root output index")
    ),
    responses(
        (status = 200, description = "Full thread with replies"),
        (status = 404, description = "Thread not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_thread(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let txid_bytes = display_txid_to_internal(&txid).map_err(|e| {
        (StatusCode::BAD_REQUEST, e)
    })?;

    match state.db.get_thread(&txid_bytes, vout).await {
        Ok(Some(thread)) => Ok(Json(thread)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Thread not found".to_string())),
        Err(e) => {
            error!("Failed to get thread: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
