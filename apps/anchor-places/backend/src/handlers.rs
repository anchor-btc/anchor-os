//! HTTP request handlers for the Anchor Places API

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use tracing::error;

use crate::db::Database;
use crate::models::{
    BoundsParams, Category, CreateMarkerRequest, CreateMarkerResponse, 
    CreateReplyRequest, GeoMarkerPayload, HealthResponse, ListParams, 
    MapStats, Marker, MarkerDetail, SearchParams,
};

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub wallet_url: String,
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
        service: "anchor-places-backend".to_string(),
    })
}

/// Get map statistics
#[utoipa::path(
    get,
    path = "/stats",
    tag = "Map",
    responses(
        (status = 200, description = "Map statistics", body = MapStats),
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

/// Get all categories
#[utoipa::path(
    get,
    path = "/categories",
    tag = "Map",
    responses(
        (status = 200, description = "List of categories", body = Vec<Category>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_categories(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.get_categories().await {
        Ok(categories) => Ok(Json(categories)),
        Err(e) => {
            error!("Failed to get categories: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get markers within bounds (for map viewport)
#[utoipa::path(
    get,
    path = "/markers/bounds",
    tag = "Markers",
    params(
        ("lat_min" = f32, Query, description = "Minimum latitude"),
        ("lat_max" = f32, Query, description = "Maximum latitude"),
        ("lng_min" = f32, Query, description = "Minimum longitude"),
        ("lng_max" = f32, Query, description = "Maximum longitude"),
        ("category" = Option<i16>, Query, description = "Filter by category ID"),
        ("limit" = Option<i32>, Query, description = "Maximum number of markers (default 1000)")
    ),
    responses(
        (status = 200, description = "Markers in bounds", body = Vec<Marker>),
        (status = 400, description = "Invalid bounds"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_markers_bounds(
    State(state): State<Arc<AppState>>,
    Query(params): Query<BoundsParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate bounds
    if params.lat_min > params.lat_max || params.lng_min > params.lng_max {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid bounds: min must be less than max".to_string(),
        ));
    }

    let limit = params.limit.unwrap_or(1000).min(5000);

    match state
        .db
        .get_markers_in_bounds(
            params.lat_min,
            params.lat_max,
            params.lng_min,
            params.lng_max,
            params.category,
            limit,
        )
        .await
    {
        Ok(markers) => Ok(Json(markers)),
        Err(e) => {
            error!("Failed to get markers in bounds: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Search markers by message content
#[utoipa::path(
    get,
    path = "/markers/search",
    tag = "Markers",
    params(
        ("q" = String, Query, description = "Search query"),
        ("category" = Option<i16>, Query, description = "Filter by category ID"),
        ("limit" = Option<i32>, Query, description = "Maximum number of results (default 100)")
    ),
    responses(
        (status = 200, description = "Search results", body = Vec<Marker>),
        (status = 400, description = "Empty query"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn search_markers(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if params.q.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Search query cannot be empty".to_string()));
    }

    let limit = params.limit.unwrap_or(100).min(500);

    match state.db.search_markers(&params.q, params.category, limit).await {
        Ok(markers) => Ok(Json(markers)),
        Err(e) => {
            error!("Failed to search markers: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get recent markers
#[utoipa::path(
    get,
    path = "/markers",
    tag = "Markers",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default 100, max 500)"),
        ("category" = Option<i16>, Query, description = "Filter by category ID")
    ),
    responses(
        (status = 200, description = "List of markers", body = Vec<Marker>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_markers(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = params.per_page.min(500);

    match state.db.get_recent_markers(limit).await {
        Ok(markers) => Ok(Json(markers)),
        Err(e) => {
            error!("Failed to get markers: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get a single marker with replies
#[utoipa::path(
    get,
    path = "/markers/{txid}/{vout}",
    tag = "Markers",
    params(
        ("txid" = String, Path, description = "Transaction ID (hex)"),
        ("vout" = i32, Path, description = "Output index")
    ),
    responses(
        (status = 200, description = "Marker with replies", body = MarkerDetail),
        (status = 404, description = "Marker not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_marker(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate txid is valid hex
    if hex::decode(&txid).is_err() {
        return Err((StatusCode::BAD_REQUEST, "Invalid txid hex".to_string()));
    }

    match state.db.get_marker_detail(&txid, vout).await {
        Ok(Some(detail)) => Ok(Json(detail)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Marker not found".to_string())),
        Err(e) => {
            error!("Failed to get marker: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Create a new marker (proxies to wallet service)
#[utoipa::path(
    post,
    path = "/markers",
    tag = "Markers",
    request_body = CreateMarkerRequest,
    responses(
        (status = 200, description = "Marker created", body = CreateMarkerResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_marker(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateMarkerRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate coordinates
    if request.latitude < -90.0 || request.latitude > 90.0 {
        return Err((StatusCode::BAD_REQUEST, "Invalid latitude".to_string()));
    }
    if request.longitude < -180.0 || request.longitude > 180.0 {
        return Err((StatusCode::BAD_REQUEST, "Invalid longitude".to_string()));
    }
    if request.message.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Message cannot be empty".to_string()));
    }
    if request.message.len() > 255 {
        return Err((StatusCode::BAD_REQUEST, "Message too long (max 255 chars)".to_string()));
    }

    // Encode the geo marker payload
    let payload = GeoMarkerPayload {
        category: request.category,
        latitude: request.latitude,
        longitude: request.longitude,
        message: request.message,
    };
    let body_hex = hex::encode(payload.to_bytes());

    // Create the wallet request
    let wallet_request = serde_json::json!({
        "kind": 5,  // Custom(5) for geo markers
        "body": body_hex,
        "body_is_hex": true,
        "carrier": request.carrier.unwrap_or(0),  // Default to OP_RETURN
    });

    // Send to wallet service
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/wallet/create-message", state.wallet_url))
        .json(&wallet_request)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err((StatusCode::INTERNAL_SERVER_ERROR, error_text));
    }

    let response: CreateMarkerResponse = res
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(response))
}

/// Create a reply to a marker (proxies to wallet service)
#[utoipa::path(
    post,
    path = "/markers/{txid}/{vout}/reply",
    tag = "Markers",
    params(
        ("txid" = String, Path, description = "Parent transaction ID (hex)"),
        ("vout" = i32, Path, description = "Parent output index")
    ),
    request_body = CreateReplyRequest,
    responses(
        (status = 200, description = "Reply created", body = CreateMarkerResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Parent marker not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_reply(
    State(state): State<Arc<AppState>>,
    Path((txid, vout)): Path<(String, i32)>,
    Json(request): Json<CreateReplyRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate
    if request.message.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Message cannot be empty".to_string()));
    }
    if request.message.len() > 255 {
        return Err((StatusCode::BAD_REQUEST, "Message too long (max 255 chars)".to_string()));
    }

    // Validate txid format
    if hex::decode(&txid).is_err() {
        return Err((StatusCode::BAD_REQUEST, "Invalid txid hex".to_string()));
    }

    // Verify parent marker exists
    let exists = state.db.marker_exists(&txid, vout).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !exists {
        return Err((StatusCode::NOT_FOUND, "Parent marker not found".to_string()));
    }

    // Create the wallet request with anchor to parent
    let wallet_request = serde_json::json!({
        "kind": 1,  // Text for replies
        "body": request.message,
        "parent_txid": txid,
        "parent_vout": vout,
        "carrier": 0,
    });

    // Send to wallet service
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/wallet/create-message", state.wallet_url))
        .json(&wallet_request)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !res.status().is_success() {
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err((StatusCode::INTERNAL_SERVER_ERROR, error_text));
    }

    let response: CreateMarkerResponse = res
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(response))
}

