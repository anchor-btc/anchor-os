//! Marker handlers

use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::{
    BoundsParams, CreateMarkerRequest, CreateMarkerResponse, CreateReplyRequest, ListParams,
    Marker, MarkerDetail, MyPlacesParams, SearchParams,
};

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
) -> Result<Json<Vec<Marker>>> {
    // Validate bounds
    if params.lat_min > params.lat_max || params.lng_min > params.lng_max {
        return Err(AppError::bad_request(
            "Invalid bounds: min must be less than max",
        ));
    }

    let limit = params.limit.unwrap_or(1000).min(5000);

    let markers = state
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
        .map_err(AppError::from)?;

    Ok(Json(markers))
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
) -> Result<Json<Vec<Marker>>> {
    if params.q.trim().is_empty() {
        return Err(AppError::bad_request("Search query cannot be empty"));
    }

    let limit = params.limit.unwrap_or(100).min(500);

    let markers = state
        .db
        .search_markers(&params.q, params.category, limit)
        .await
        .map_err(AppError::from)?;

    Ok(Json(markers))
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
) -> Result<Json<Vec<Marker>>> {
    let limit = params.per_page.min(500);

    let markers = state
        .db
        .get_recent_markers(limit)
        .await
        .map_err(AppError::from)?;

    Ok(Json(markers))
}

/// Get markers created by a specific address (My Places)
#[utoipa::path(
    get,
    path = "/markers/my",
    tag = "Markers",
    params(
        ("address" = String, Query, description = "Creator Bitcoin address"),
        ("category" = Option<i16>, Query, description = "Filter by category ID"),
        ("limit" = Option<i32>, Query, description = "Maximum number of markers (default 100, max 500)")
    ),
    responses(
        (status = 200, description = "Markers created by address", body = Vec<Marker>),
        (status = 400, description = "Missing address parameter"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_my_markers(
    State(state): State<Arc<AppState>>,
    Query(params): Query<MyPlacesParams>,
) -> Result<Json<Vec<Marker>>> {
    if params.address.is_empty() {
        return Err(AppError::bad_request("Address parameter is required"));
    }

    let limit = params.limit.unwrap_or(100).min(500);

    let markers = state
        .db
        .get_markers_by_creator(&params.address, params.category, limit)
        .await
        .map_err(AppError::from)?;

    Ok(Json(markers))
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
) -> Result<Json<MarkerDetail>> {
    // Validate txid is valid hex
    if hex::decode(&txid).is_err() {
        return Err(AppError::bad_request("Invalid txid hex"));
    }

    match state
        .db
        .get_marker_detail(&txid, vout)
        .await
        .map_err(AppError::from)?
    {
        Some(detail) => Ok(Json(detail)),
        None => Err(AppError::not_found("Marker not found")),
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
) -> Result<Json<CreateMarkerResponse>> {
    // Validate coordinates
    if request.latitude < -90.0 || request.latitude > 90.0 {
        return Err(AppError::validation("Invalid latitude"));
    }
    if request.longitude < -180.0 || request.longitude > 180.0 {
        return Err(AppError::validation("Invalid longitude"));
    }
    if request.message.is_empty() {
        return Err(AppError::validation("Message cannot be empty"));
    }
    if request.message.len() > 255 {
        return Err(AppError::validation("Message too long (max 255 chars)"));
    }

    // Create marker via wallet service
    let response = state
        .wallet
        .create_geomarker(
            request.category,
            request.latitude,
            request.longitude,
            &request.message,
            request.carrier.unwrap_or(0),
        )
        .await?;

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
) -> Result<Json<CreateMarkerResponse>> {
    // Validate
    if request.message.is_empty() {
        return Err(AppError::validation("Message cannot be empty"));
    }
    if request.message.len() > 255 {
        return Err(AppError::validation("Message too long (max 255 chars)"));
    }

    // Validate txid format
    if hex::decode(&txid).is_err() {
        return Err(AppError::bad_request("Invalid txid hex"));
    }

    // Verify parent marker exists
    let exists = state
        .db
        .marker_exists(&txid, vout)
        .await
        .map_err(AppError::from)?;

    if !exists {
        return Err(AppError::not_found("Parent marker not found"));
    }

    // Create reply via wallet service
    let response = state
        .wallet
        .create_reply(&txid, vout, &request.message)
        .await?;

    Ok(Json(response))
}
