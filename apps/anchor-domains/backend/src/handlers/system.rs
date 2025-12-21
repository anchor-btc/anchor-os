//! System handlers: health check and statistics

use axum::{
    extract::State,
    Json,
};
use std::sync::Arc;

use crate::error::AppResult;
use crate::models::{DnsStats, HealthResponse};
use crate::AppState;

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
        service: "anchor-domains-backend".to_string(),
    })
}

/// Get Anchor Domains statistics
#[utoipa::path(
    get,
    path = "/stats",
    tag = "Statistics",
    responses(
        (status = 200, description = "DNS statistics", body = DnsStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_stats(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<DnsStats>> {
    let stats = state.db.get_stats().await?;
    Ok(Json(stats))
}

