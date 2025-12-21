//! Pixel handlers (get_pixel, get_recent, get_pixels_by_txids, get_pixels_by_address)

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::{error, info};

use crate::config::{CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::handlers::AppState;
use crate::models::{
    GetPixelsByAddressParams, GetPixelsByAddressResponse, GetPixelsByAddressesRequest,
    GetPixelsByTxidsRequest, GetPixelsByTxidsResponse, ListParams, PixelInfo, RecentPixel,
};

/// Get a single pixel's info
#[utoipa::path(
    get,
    path = "/pixel/{x}/{y}",
    tag = "Pixels",
    params(
        ("x" = i32, Path, description = "X coordinate"),
        ("y" = i32, Path, description = "Y coordinate")
    ),
    responses(
        (status = 200, description = "Pixel info with history", body = PixelInfo),
        (status = 400, description = "Invalid coordinates"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_pixel(
    State(state): State<Arc<AppState>>,
    Path((x, y)): Path<(i32, i32)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate coordinates
    if x < 0 || x >= CANVAS_WIDTH as i32 || y < 0 || y >= CANVAS_HEIGHT as i32 {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Coordinates out of bounds: ({}, {}). Canvas is {}x{}",
                x, y, CANVAS_WIDTH, CANVAS_HEIGHT
            ),
        ));
    }

    match state.db.get_pixel_info(x, y).await {
        Ok(info) => Ok(Json(info)),
        Err(e) => {
            error!("Failed to get pixel info: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get recent pixel changes
#[utoipa::path(
    get,
    path = "/recent",
    tag = "Pixels",
    params(
        ("per_page" = Option<i32>, Query, description = "Number of recent changes (max 100)")
    ),
    responses(
        (status = 200, description = "Recent pixel changes", body = Vec<RecentPixel>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_recent(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let limit = params.per_page.min(100);
    match state.db.get_recent_pixels(limit).await {
        Ok(pixels) => Ok(Json(pixels)),
        Err(e) => {
            error!("Failed to get recent pixels: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get pixels painted by specific transaction IDs
#[utoipa::path(
    post,
    path = "/pixels/by-txids",
    tag = "Pixels",
    request_body = GetPixelsByTxidsRequest,
    responses(
        (status = 200, description = "Pixels painted by the given txids", body = GetPixelsByTxidsResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_pixels_by_txids(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GetPixelsByTxidsRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Convert hex txids to bytes
    let txids_bytes: Result<Vec<Vec<u8>>, _> = payload
        .txids
        .iter()
        .map(|txid_hex| hex::decode(txid_hex))
        .collect();

    let txids_bytes = match txids_bytes {
        Ok(bytes) => bytes,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Invalid txid hex: {}", e),
            ));
        }
    };

    // Get pixels
    let pixels = match state.db.get_pixels_by_txids(&txids_bytes).await {
        Ok(pixels) => pixels,
        Err(e) => {
            error!("Failed to get pixels by txids: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Get stats
    let (total_pixels, unique_transactions) = match state.db.get_pixels_stats_by_txids(&txids_bytes).await {
        Ok(stats) => stats,
        Err(e) => {
            error!("Failed to get pixels stats: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    Ok(Json(GetPixelsByTxidsResponse {
        pixels,
        total_pixels,
        unique_transactions,
    }))
}

/// Get pixels painted by a specific address
#[utoipa::path(
    get,
    path = "/pixels/by-address",
    tag = "Pixels",
    params(
        ("address" = String, Query, description = "Bitcoin address"),
        ("per_page" = Option<i32>, Query, description = "Number of pixels per page (default: 100, max: 500)"),
        ("page" = Option<i32>, Query, description = "Page number (default: 0)")
    ),
    responses(
        (status = 200, description = "Pixels painted by the given address", body = GetPixelsByAddressResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_pixels_by_address(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GetPixelsByAddressParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate address (basic check)
    if params.address.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Address is required".to_string(),
        ));
    }

    let per_page = params.per_page.min(500).max(1);
    let page = params.page.max(0);
    let offset = page * per_page;

    // Get pixels
    let pixels = match state.db.get_pixels_by_address(&params.address, per_page, offset).await {
        Ok(pixels) => pixels,
        Err(e) => {
            error!("Failed to get pixels by address: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Get stats
    let (total_pixels, unique_transactions, unique_positions) = match state.db.get_pixels_stats_by_address(&params.address).await {
        Ok(stats) => stats,
        Err(e) => {
            error!("Failed to get pixels stats by address: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    Ok(Json(GetPixelsByAddressResponse {
        pixels,
        total_pixels,
        unique_transactions,
        unique_positions,
        page,
        per_page,
    }))
}

/// Get pixels painted by multiple addresses
#[utoipa::path(
    post,
    path = "/pixels/by-addresses",
    tag = "Pixels",
    request_body = GetPixelsByAddressesRequest,
    responses(
        (status = 200, description = "Pixels painted by the given addresses", body = GetPixelsByAddressResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_pixels_by_addresses(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GetPixelsByAddressesRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if payload.addresses.is_empty() {
        return Ok(Json(GetPixelsByAddressResponse {
            pixels: vec![],
            total_pixels: 0,
            unique_transactions: 0,
            unique_positions: 0,
            page: 0,
            per_page: 0,
        }));
    }

    let per_page = payload.per_page.min(500).max(1);

    // Get pixels
    let pixels = match state.db.get_pixels_by_addresses(&payload.addresses, per_page).await {
        Ok(pixels) => pixels,
        Err(e) => {
            error!("Failed to get pixels by addresses: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Get stats
    let (total_pixels, unique_transactions, unique_positions) = match state.db.get_pixels_stats_by_addresses(&payload.addresses).await {
        Ok(stats) => stats,
        Err(e) => {
            error!("Failed to get pixels stats by addresses: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    Ok(Json(GetPixelsByAddressResponse {
        pixels,
        total_pixels,
        unique_transactions,
        unique_positions,
        page: 0,
        per_page,
    }))
}

/// Response from wallet addresses endpoint
#[derive(Debug, Deserialize)]
struct WalletAddressesResponse {
    addresses: Vec<String>,
}

/// Get pixels painted by the connected wallet (fetches addresses from wallet service)
#[utoipa::path(
    get,
    path = "/pixels/my",
    tag = "Pixels",
    params(
        ("per_page" = Option<i32>, Query, description = "Number of pixels to return (default: 100, max: 500)")
    ),
    responses(
        (status = 200, description = "Pixels painted by the connected wallet", body = GetPixelsByAddressResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_my_pixels(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Allow up to 50000 pixels for my pixels page (user's own pixels)
    let per_page = params.per_page.min(50000).max(1);
    
    // Get wallet URL from environment
    let wallet_url = std::env::var("WALLET_URL").unwrap_or_else(|_| "http://core-wallet:3001".to_string());
    
    // Fetch all addresses from the wallet
    let client = reqwest::Client::new();
    let wallet_response = client
        .get(format!("{}/wallet/addresses", wallet_url))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::SERVICE_UNAVAILABLE, format!("Wallet service unavailable: {}", e))
        })?;
    
    if !wallet_response.status().is_success() {
        error!("Wallet service returned error: {}", wallet_response.status());
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Wallet service error".to_string()));
    }
    
    let wallet_data: WalletAddressesResponse = wallet_response
        .json()
        .await
        .map_err(|e| {
            error!("Failed to parse wallet response: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse wallet response: {}", e))
        })?;
    
    info!("Fetched {} addresses from wallet", wallet_data.addresses.len());
    
    if wallet_data.addresses.is_empty() {
        return Ok(Json(GetPixelsByAddressResponse {
            pixels: vec![],
            total_pixels: 0,
            unique_transactions: 0,
            unique_positions: 0,
            page: 0,
            per_page,
        }));
    }
    
    // Get pixels for all addresses
    let pixels = match state.db.get_pixels_by_addresses(&wallet_data.addresses, per_page).await {
        Ok(pixels) => pixels,
        Err(e) => {
            error!("Failed to get pixels by addresses: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Get stats
    let (total_pixels, unique_transactions, unique_positions) = match state.db.get_pixels_stats_by_addresses(&wallet_data.addresses).await {
        Ok(stats) => stats,
        Err(e) => {
            error!("Failed to get pixels stats by addresses: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    Ok(Json(GetPixelsByAddressResponse {
        pixels,
        total_pixels,
        unique_transactions,
        unique_positions,
        page: 0,
        per_page,
    }))
}

