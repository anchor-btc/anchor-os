//! Pending transaction handlers

use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

use crate::error::AppResult;
use crate::models::{PendingStatusResponse, PendingTransaction};
use crate::services::validation::validate_domain_name;
use crate::AppState;

/// Get pending transaction status for a domain
#[utoipa::path(
    get,
    path = "/pending/{name}",
    tag = "Pending",
    params(
        ("name" = String, Path, description = "Domain name to check for pending transactions")
    ),
    responses(
        (status = 200, description = "Pending status", body = PendingStatusResponse),
        (status = 400, description = "Invalid domain name"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_pending_status(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> AppResult<Json<PendingStatusResponse>> {
    validate_domain_name(&name)?;

    let pending = state.db.get_pending_transaction(&name).await?;
    
    Ok(Json(PendingStatusResponse {
        name: name.clone(),
        has_pending: pending.is_some(),
        pending,
    }))
}

/// Get all pending transactions
#[utoipa::path(
    get,
    path = "/pending",
    tag = "Pending",
    responses(
        (status = 200, description = "List of pending transactions", body = Vec<PendingTransaction>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_pending_transactions(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Vec<PendingTransaction>>> {
    let pending = state.db.list_pending_transactions().await?;
    Ok(Json(pending))
}

