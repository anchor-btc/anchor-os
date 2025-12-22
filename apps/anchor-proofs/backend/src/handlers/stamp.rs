//! Stamp and revoke handlers

use axum::{extract::State, Json};
use std::sync::Arc;
use tracing::info;

use anchor_specs::proof::ProofSpec;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::{
    BatchStampRequest, CreateTxResponse, ProofEntry, ProofMetadata, RevokeRequest, StampRequest,
};
use crate::services::AnchorRef;

/// Create a new proof of existence
#[utoipa::path(
    post,
    path = "/api/stamp",
    request_body = StampRequest,
    responses(
        (status = 200, description = "Transaction created", body = CreateTxResponse),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Hash already registered")
    ),
    tag = "Stamp"
)]
pub async fn stamp(
    State(state): State<Arc<AppState>>,
    Json(req): Json<StampRequest>,
) -> Result<Json<CreateTxResponse>> {
    // Parse and validate entry
    let entry = req
        .to_proof_entry()
        .ok_or_else(|| AppError::bad_request("Invalid hash or algorithm"))?;

    // Check if hash already exists
    if state
        .db
        .hash_exists(&entry.hash, entry.algorithm as i16)
        .await
        .map_err(AppError::from)?
    {
        return Err(AppError::conflict("Hash already registered"));
    }

    // Create spec using anchor-specs
    let spec = ProofSpec::stamp(entry);

    // Create transaction via wallet service
    let carrier = req.carrier.unwrap_or(0);
    let response = state.wallet.create_proof(&spec, carrier).await?;

    info!("Created stamp transaction: {}", response.txid);

    Ok(Json(response))
}

/// Create batch proof of existence
#[utoipa::path(
    post,
    path = "/api/stamp/batch",
    request_body = BatchStampRequest,
    responses(
        (status = 200, description = "Transaction created", body = CreateTxResponse),
        (status = 400, description = "Invalid request")
    ),
    tag = "Stamp"
)]
pub async fn stamp_batch(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BatchStampRequest>,
) -> Result<Json<CreateTxResponse>> {
    if req.entries.is_empty() {
        return Err(AppError::bad_request("No entries provided"));
    }

    if req.entries.len() > 100 {
        return Err(AppError::bad_request("Too many entries (max 100)"));
    }

    // Parse and validate entries
    let mut entries = Vec::new();
    for (i, entry_req) in req.entries.iter().enumerate() {
        let entry = entry_req.to_proof_entry().ok_or_else(|| {
            AppError::bad_request(format!("Invalid hash or algorithm for entry {}", i))
        })?;
        entries.push(entry);
    }

    // Create spec using anchor-specs
    let spec = ProofSpec::batch(entries);

    // Create transaction via wallet service
    let carrier = req.carrier.unwrap_or(0);
    let response = state.wallet.create_proof(&spec, carrier).await?;

    info!(
        "Created batch stamp transaction with {} entries: {}",
        req.entries.len(),
        response.txid
    );

    Ok(Json(response))
}

/// Revoke an existing proof
#[utoipa::path(
    post,
    path = "/api/revoke",
    request_body = RevokeRequest,
    responses(
        (status = 200, description = "Transaction created", body = CreateTxResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Proof not found")
    ),
    tag = "Revoke"
)]
pub async fn revoke(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RevokeRequest>,
) -> Result<Json<CreateTxResponse>> {
    let hash_bytes =
        hex::decode(&req.file_hash).map_err(|_| AppError::bad_request("Invalid hash format"))?;

    let algo = req
        .parse_algorithm()
        .ok_or_else(|| AppError::bad_request("Invalid hash algorithm"))?;

    // Find original proof
    let proof = state
        .db
        .get_proof_by_hash(&hash_bytes, Some(algo as i16))
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::not_found("Proof not found"))?;

    if proof.is_revoked {
        return Err(AppError::conflict("Proof already revoked"));
    }

    // Create revoke spec
    let spec = ProofSpec::revoke(ProofEntry {
        algorithm: algo,
        hash: hash_bytes,
        metadata: ProofMetadata::default(),
    });

    // Get anchor info from original proof
    let txid_prefix =
        hex::decode(&proof.txid_prefix).map_err(|_| AppError::internal("Invalid txid prefix"))?;

    let anchor = AnchorRef {
        txid_prefix,
        vout: proof.vout as u8,
    };

    // Create transaction via wallet service with anchor
    let carrier = req.carrier.unwrap_or(0);
    let response = state
        .wallet
        .create_proof_with_anchor(&spec, &anchor, carrier)
        .await?;

    info!("Created revoke transaction: {}", response.txid);

    Ok(Json(response))
}

