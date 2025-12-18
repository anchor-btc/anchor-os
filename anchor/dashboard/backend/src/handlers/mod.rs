//! HTTP request handlers

pub mod auth;
pub mod bitcoin;
pub mod cloudflare;
pub mod docker;
pub mod indexer;
pub mod node;
pub mod settings;
pub mod tailscale;
pub mod tor;
pub mod wallet;

use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

/// Health check response
#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
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
        service: "dashboard-backend".to_string(),
    })
}

