//! Resolution handlers: domain name lookup

use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

use crate::error::{AppError, AppResult};
use crate::models::{is_txid_prefix, ResolveResponse, SUPPORTED_TLDS};
use crate::services::validation::{validate_domain_name, validate_txid_prefix};
use crate::AppState;

/// Resolve a domain by name
#[utoipa::path(
    get,
    path = "/resolve/{name}",
    tag = "Resolution",
    params(
        ("name" = String, Path, description = "Domain name (e.g., mysite.btc, mysite.sat)")
    ),
    responses(
        (status = 200, description = "Domain records", body = ResolveResponse),
        (status = 404, description = "Domain not found"),
        (status = 400, description = "Invalid domain name")
    )
)]
pub async fn resolve_domain(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> AppResult<Json<ResolveResponse>> {
    // Check if it's a txid prefix lookup (16 hex chars, optionally with TLD suffix)
    let clean_name = SUPPORTED_TLDS.iter()
        .find(|tld| name.ends_with(*tld))
        .map(|tld| &name[..name.len() - tld.len()])
        .unwrap_or(&name);
    
    if is_txid_prefix(clean_name) {
        // Resolve by txid prefix
        let response = state.db.resolve_by_txid_prefix(clean_name).await?
            .ok_or_else(|| AppError::not_found("Domain not found"))?;
        return Ok(Json(response));
    }
    
    // Validate domain name - must already include a supported TLD
    validate_domain_name(&name)?;

    let response = state.db.resolve_by_name(&name).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;
    
    Ok(Json(response))
}

/// Resolve a domain by txid prefix
#[utoipa::path(
    get,
    path = "/resolve/txid/{prefix}",
    tag = "Resolution",
    params(
        ("prefix" = String, Path, description = "TxID prefix (16 hex chars)")
    ),
    responses(
        (status = 200, description = "Domain records", body = ResolveResponse),
        (status = 404, description = "Domain not found"),
        (status = 400, description = "Invalid txid prefix")
    )
)]
pub async fn resolve_by_txid(
    State(state): State<Arc<AppState>>,
    Path(prefix): Path<String>,
) -> AppResult<Json<ResolveResponse>> {
    validate_txid_prefix(&prefix)?;

    let response = state.db.resolve_by_txid_prefix(&prefix).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;
    
    Ok(Json(response))
}

