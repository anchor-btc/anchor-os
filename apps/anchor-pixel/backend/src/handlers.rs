//! HTTP request handlers for the PixelMap API

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use std::sync::Arc;
use tracing::error;

use crate::canvas::CanvasManager;
use crate::config::{CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::db::Database;
use crate::models::{CanvasStats, HealthResponse, ListParams, PixelInfo, RecentPixel, RegionParams};

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub canvas: CanvasManager,
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
        service: "pixelmap-backend".to_string(),
    })
}

/// Get canvas statistics
#[utoipa::path(
    get,
    path = "/stats",
    tag = "Canvas",
    responses(
        (status = 200, description = "Canvas statistics", body = CanvasStats),
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

/// Get canvas tile (PNG image)
#[utoipa::path(
    get,
    path = "/canvas/tile/{z}/{x}/{y}",
    tag = "Canvas",
    params(
        ("z" = u32, Path, description = "Zoom level (0 = full canvas)"),
        ("x" = u32, Path, description = "Tile X coordinate"),
        ("y" = u32, Path, description = "Tile Y coordinate")
    ),
    responses(
        (status = 200, description = "Tile PNG image", content_type = "image/png"),
        (status = 400, description = "Invalid tile coordinates"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_tile(
    State(state): State<Arc<AppState>>,
    Path((z, x, y)): Path<(u32, u32, u32)>,
) -> Result<Response, (StatusCode, String)> {
    // Validate tile coordinates
    let max_tiles = 1u32 << z;
    if x >= max_tiles || y >= max_tiles {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Tile coordinates out of bounds: ({}, {}) at zoom {}. Max tiles: {}",
                x, y, z, max_tiles
            ),
        ));
    }

    match state.canvas.generate_tile(z, x, y).await {
        Ok(png_data) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "image/png")
                .header(header::CACHE_CONTROL, "public, max-age=60")
                .body(Body::from(png_data))
                .unwrap();
            Ok(response)
        }
        Err(e) => {
            error!("Failed to generate tile: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get canvas region (PNG image)
#[utoipa::path(
    get,
    path = "/canvas/region",
    tag = "Canvas",
    params(
        ("x" = i32, Query, description = "X coordinate"),
        ("y" = i32, Query, description = "Y coordinate"),
        ("w" = i32, Query, description = "Width"),
        ("h" = i32, Query, description = "Height")
    ),
    responses(
        (status = 200, description = "Region PNG image", content_type = "image/png"),
        (status = 400, description = "Invalid region"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_region(
    State(state): State<Arc<AppState>>,
    Query(params): Query<RegionParams>,
) -> Result<Response, (StatusCode, String)> {
    // Validate region
    if params.w <= 0 || params.h <= 0 || params.w > 1024 || params.h > 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Region dimensions must be between 1 and 1024".to_string(),
        ));
    }

    if params.x < 0 || params.y < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Coordinates cannot be negative".to_string(),
        ));
    }

    match state
        .canvas
        .generate_region(params.x, params.y, params.w as u32, params.h as u32)
        .await
    {
        Ok(png_data) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "image/png")
                .header(header::CACHE_CONTROL, "public, max-age=30")
                .body(Body::from(png_data))
                .unwrap();
            Ok(response)
        }
        Err(e) => {
            error!("Failed to generate region: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get canvas preview (small PNG)
#[utoipa::path(
    get,
    path = "/canvas/preview",
    tag = "Canvas",
    responses(
        (status = 200, description = "Canvas preview PNG", content_type = "image/png"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_preview(
    State(state): State<Arc<AppState>>,
) -> Result<Response, (StatusCode, String)> {
    match state.canvas.generate_preview(512).await {
        Ok(png_data) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "image/png")
                .header(header::CACHE_CONTROL, "public, max-age=60")
                .body(Body::from(png_data))
                .unwrap();
            Ok(response)
        }
        Err(e) => {
            error!("Failed to generate preview: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get full canvas data as binary
#[utoipa::path(
    get,
    path = "/canvas",
    tag = "Canvas",
    responses(
        (status = 200, description = "Canvas binary data", content_type = "application/octet-stream"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_canvas(
    State(state): State<Arc<AppState>>,
) -> Result<Response, (StatusCode, String)> {
    match state.canvas.get_canvas_binary().await {
        Ok(data) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "application/octet-stream")
                .header(header::CACHE_CONTROL, "public, max-age=30")
                .body(Body::from(data))
                .unwrap();
            Ok(response)
        }
        Err(e) => {
            error!("Failed to get canvas data: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}


