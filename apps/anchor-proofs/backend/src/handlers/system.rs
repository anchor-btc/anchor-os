//! System handlers (health check, stats)

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::{HealthResponse, ProofStats};

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/api/health",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    ),
    tag = "Health"
)]
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "anchor-proofs-api".to_string(),
    })
}

/// Get protocol statistics
#[utoipa::path(
    get,
    path = "/api/stats",
    responses(
        (status = 200, description = "Protocol statistics", body = ProofStats)
    ),
    tag = "Stats"
)]
pub async fn get_stats(State(state): State<Arc<AppState>>) -> Result<Json<ProofStats>> {
    let stats = state.db.get_stats().await.map_err(AppError::from)?;
    Ok(Json(stats))
}
