//! Canvas handlers (tiles, regions, preview)

use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::Response,
};
use std::sync::Arc;
use tracing::error;

use crate::handlers::AppState;
use crate::models::RegionParams;

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
