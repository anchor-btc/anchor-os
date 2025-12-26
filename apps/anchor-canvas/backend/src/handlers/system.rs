//! System handlers (health, stats)

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use std::sync::Arc;
use tracing::error;

use crate::handlers::AppState;
use crate::models::{CanvasStats, HealthResponse};

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
        service: "anchor-canvas-backend".to_string(),
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
