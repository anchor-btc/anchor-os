//! Proof handlers (list, get, search, my proofs)

use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::{
    GetProofsByAddressResponse, HashAlgorithm, ListParams, PaginatedResponse, Proof,
    ProofListItem, ValidateRequest, ValidationResult,
};

/// List all proofs with pagination
#[utoipa::path(
    get,
    path = "/api/proofs",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default: 50)"),
        ("search" = Option<String>, Query, description = "Search query"),
        ("include_revoked" = Option<bool>, Query, description = "Include revoked proofs")
    ),
    responses(
        (status = 200, description = "List of proofs", body = PaginatedResponse<ProofListItem>)
    ),
    tag = "Proofs"
)]
pub async fn list_proofs(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<ProofListItem>>> {
    let offset = (params.page - 1) * params.per_page;

    let (proofs, total) = if let Some(search) = &params.search {
        state
            .db
            .search_proofs(search, params.per_page, offset)
            .await
            .map_err(AppError::from)?
    } else {
        state
            .db
            .list_proofs(params.per_page, offset, params.include_revoked)
            .await
            .map_err(AppError::from)?
    };

    let total_pages = (total as f64 / params.per_page as f64).ceil() as i32;

    Ok(Json(PaginatedResponse {
        data: proofs,
        total,
        page: params.page,
        per_page: params.per_page,
        total_pages,
    }))
}

/// Get proof by file hash
#[utoipa::path(
    get,
    path = "/api/proof/{hash}",
    params(
        ("hash" = String, Path, description = "File hash (hex)"),
        ("algo" = Option<String>, Query, description = "Hash algorithm (sha256/sha512)")
    ),
    responses(
        (status = 200, description = "Proof found", body = Proof),
        (status = 404, description = "Proof not found")
    ),
    tag = "Proofs"
)]
pub async fn get_proof(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Proof>> {
    let hash_bytes =
        hex::decode(&hash).map_err(|_| AppError::bad_request("Invalid hash format"))?;

    let algo = params.get("algo").and_then(|a| match a.to_lowercase().as_str() {
        "sha256" | "sha-256" => Some(HashAlgorithm::Sha256 as i16),
        "sha512" | "sha-512" => Some(HashAlgorithm::Sha512 as i16),
        _ => None,
    });

    let proof = state
        .db
        .get_proof_by_hash(&hash_bytes, algo)
        .await
        .map_err(AppError::from)?;

    match proof {
        Some(p) => Ok(Json(p)),
        None => Err(AppError::not_found("Proof not found")),
    }
}

/// Get proof by ID
#[utoipa::path(
    get,
    path = "/api/proof/id/{id}",
    params(
        ("id" = i32, Path, description = "Proof ID")
    ),
    responses(
        (status = 200, description = "Proof found", body = Proof),
        (status = 404, description = "Proof not found")
    ),
    tag = "Proofs"
)]
pub async fn get_proof_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<Proof>> {
    let proof = state.db.get_proof_by_id(id).await.map_err(AppError::from)?;

    match proof {
        Some(p) => Ok(Json(p)),
        None => Err(AppError::not_found("Proof not found")),
    }
}

/// Validate a file hash
#[utoipa::path(
    post,
    path = "/api/validate",
    request_body = ValidateRequest,
    responses(
        (status = 200, description = "Validation result", body = ValidationResult)
    ),
    tag = "Validation"
)]
pub async fn validate_hash(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ValidateRequest>,
) -> Result<Json<ValidationResult>> {
    let hash_bytes =
        hex::decode(&req.file_hash).map_err(|_| AppError::bad_request("Invalid hash format"))?;

    let algo = req
        .parse_algorithm()
        .ok_or_else(|| AppError::bad_request("Invalid hash algorithm"))?;

    let proof = state
        .db
        .get_proof_by_hash(&hash_bytes, Some(algo as i16))
        .await
        .map_err(AppError::from)?;

    Ok(Json(ValidationResult {
        is_valid: proof.is_some(),
        proof,
    }))
}

/// Get proofs created by the connected wallet
#[utoipa::path(
    get,
    path = "/api/proofs/my",
    tag = "Proofs",
    params(
        ("per_page" = Option<i32>, Query, description = "Number of proofs to return (default: 100, max: 500)")
    ),
    responses(
        (status = 200, description = "Proofs by wallet", body = GetProofsByAddressResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_my_proofs(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<Json<GetProofsByAddressResponse>> {
    let per_page = params.per_page.min(500).max(1);

    // Fetch all addresses from the wallet
    let addresses = state.wallet.get_wallet_addresses().await?;

    if addresses.is_empty() {
        return Ok(Json(GetProofsByAddressResponse {
            proofs: vec![],
            total_proofs: 0,
            unique_transactions: 0,
            page: params.page,
            per_page,
        }));
    }

    // Get proofs for all addresses
    let proofs = state
        .db
        .get_proofs_by_addresses(&addresses, per_page)
        .await
        .map_err(AppError::from)?;

    // Get stats
    let (total_proofs, unique_transactions) = state
        .db
        .get_proofs_stats_by_addresses(&addresses)
        .await
        .map_err(AppError::from)?;

    Ok(Json(GetProofsByAddressResponse {
        proofs,
        total_proofs,
        unique_transactions,
        page: params.page,
        per_page,
    }))
}

