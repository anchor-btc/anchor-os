//! System handlers (health, stats)

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::{HealthResponse, MapStats};

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
pub async fn get_stats(State(state): State<Arc<AppState>>) -> Result<Json<MapStats>> {
    let stats = state.db.get_stats().await.map_err(AppError::from)?;
    Ok(Json(stats))
}

