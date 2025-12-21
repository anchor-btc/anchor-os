//! HTTP handlers for the AnchorProofs API

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::{error, info};

use anchor_specs::KindSpec;
use crate::db::Database;
use crate::models::{
    BatchStampRequest, CreateTxResponse, HashAlgorithm, HealthResponse, ListParams,
    PaginatedResponse, Proof, ProofEntry, ProofListItem, ProofMetadata, ProofOperation,
    ProofPayload, ProofStats, RevokeRequest, StampRequest, ValidateRequest, ValidationResult,
};

/// App state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub wallet_url: String,
}

// ============================================================================
// Health Check
// ============================================================================

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
        service: "anchorproof-api".to_string(),
    })
}

// ============================================================================
// Statistics
// ============================================================================

/// Get protocol statistics
#[utoipa::path(
    get,
    path = "/api/stats",
    responses(
        (status = 200, description = "Protocol statistics", body = ProofStats)
    ),
    tag = "Stats"
)]
pub async fn get_stats(State(state): State<AppState>) -> Result<Json<ProofStats>, AppError> {
    let stats = state.db.get_stats().await?;
    Ok(Json(stats))
}

// ============================================================================
// Proofs
// ============================================================================

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
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<ProofListItem>>, AppError> {
    let offset = (params.page - 1) * params.per_page;

    let (proofs, total) = if let Some(search) = &params.search {
        state
            .db
            .search_proofs(search, params.per_page, offset)
            .await?
    } else {
        state
            .db
            .list_proofs(params.per_page, offset, params.include_revoked)
            .await?
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
    State(state): State<AppState>,
    Path(hash): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Proof>, AppError> {
    let hash_bytes = hex::decode(&hash).map_err(|_| AppError::BadRequest("Invalid hash format".to_string()))?;

    let algo = params.get("algo").and_then(|a| {
        match a.to_lowercase().as_str() {
            "sha256" | "sha-256" => Some(HashAlgorithm::Sha256 as i16),
            "sha512" | "sha-512" => Some(HashAlgorithm::Sha512 as i16),
            _ => None,
        }
    });

    let proof = state.db.get_proof_by_hash(&hash_bytes, algo).await?;

    match proof {
        Some(p) => Ok(Json(p)),
        None => Err(AppError::NotFound("Proof not found".to_string())),
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
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<Proof>, AppError> {
    let proof = state.db.get_proof_by_id(id).await?;

    match proof {
        Some(p) => Ok(Json(p)),
        None => Err(AppError::NotFound("Proof not found".to_string())),
    }
}

// ============================================================================
// Validation
// ============================================================================

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
    State(state): State<AppState>,
    Json(req): Json<ValidateRequest>,
) -> Result<Json<ValidationResult>, AppError> {
    let hash_bytes = hex::decode(&req.file_hash)
        .map_err(|_| AppError::BadRequest("Invalid hash format".to_string()))?;

    let algo = match req.hash_algo.to_lowercase().as_str() {
        "sha256" | "sha-256" => HashAlgorithm::Sha256 as i16,
        "sha512" | "sha-512" => HashAlgorithm::Sha512 as i16,
        _ => return Err(AppError::BadRequest("Invalid hash algorithm".to_string())),
    };

    let proof = state.db.get_proof_by_hash(&hash_bytes, Some(algo)).await?;

    Ok(Json(ValidationResult {
        is_valid: proof.is_some(),
        proof,
    }))
}

// ============================================================================
// Stamp (Create Proof)
// ============================================================================

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
    State(state): State<AppState>,
    Json(req): Json<StampRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    // Parse and validate entry
    let entry = req
        .to_proof_entry()
        .ok_or_else(|| AppError::BadRequest("Invalid hash or algorithm".to_string()))?;

    // Check if hash already exists
    if state
        .db
        .hash_exists(&entry.hash, entry.algorithm as i16)
        .await?
    {
        return Err(AppError::Conflict("Hash already registered".to_string()));
    }

    // Create payload
    let payload = ProofPayload {
        operation: ProofOperation::Stamp,
        entries: vec![entry],
    };

    // Create transaction via wallet service
    let response = create_anchor_tx(&state.wallet_url, &payload, req.carrier).await?;

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
    State(state): State<AppState>,
    Json(req): Json<BatchStampRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    if req.entries.is_empty() {
        return Err(AppError::BadRequest("No entries provided".to_string()));
    }

    if req.entries.len() > 100 {
        return Err(AppError::BadRequest("Too many entries (max 100)".to_string()));
    }

    // Parse and validate entries
    let mut entries = Vec::new();
    for (i, entry_req) in req.entries.iter().enumerate() {
        let entry = entry_req.to_proof_entry().ok_or_else(|| {
            AppError::BadRequest(format!("Invalid hash or algorithm for entry {}", i))
        })?;
        entries.push(entry);
    }

    // Create payload
    let payload = ProofPayload {
        operation: ProofOperation::Batch,
        entries,
    };

    // Create transaction via wallet service
    let response = create_anchor_tx(&state.wallet_url, &payload, req.carrier).await?;

    info!(
        "Created batch stamp transaction with {} entries: {}",
        req.entries.len(),
        response.txid
    );

    Ok(Json(response))
}

// ============================================================================
// Revoke
// ============================================================================

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
    State(state): State<AppState>,
    Json(req): Json<RevokeRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    let hash_bytes = hex::decode(&req.file_hash)
        .map_err(|_| AppError::BadRequest("Invalid hash format".to_string()))?;

    let algo = match req.hash_algo.to_lowercase().as_str() {
        "sha256" | "sha-256" => HashAlgorithm::Sha256,
        "sha512" | "sha-512" => HashAlgorithm::Sha512,
        _ => return Err(AppError::BadRequest("Invalid hash algorithm".to_string())),
    };

    // Find original proof
    let proof = state
        .db
        .get_proof_by_hash(&hash_bytes, Some(algo as i16))
        .await?
        .ok_or_else(|| AppError::NotFound("Proof not found".to_string()))?;

    if proof.is_revoked {
        return Err(AppError::Conflict("Proof already revoked".to_string()));
    }

    // Create payload
    let payload = ProofPayload {
        operation: ProofOperation::Revoke,
        entries: vec![ProofEntry {
            algorithm: algo,
            hash: hash_bytes,
            metadata: ProofMetadata::default(),
        }],
    };

    // Get anchor info from original proof
    let txid_prefix = hex::decode(&proof.txid_prefix)
        .map_err(|_| AppError::Internal("Invalid txid prefix".to_string()))?;

    // Create transaction via wallet service with anchor
    let response =
        create_anchor_tx_with_anchor(&state.wallet_url, &payload, &txid_prefix, proof.vout as u8, req.carrier)
            .await?;

    info!("Created revoke transaction: {}", response.txid);

    Ok(Json(response))
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create an Anchor transaction via the wallet service
async fn create_anchor_tx(
    wallet_url: &str,
    payload: &ProofPayload,
    carrier: Option<u8>,
) -> Result<CreateTxResponse, AppError> {
    let body = payload.to_bytes();
    let carrier_type = carrier.unwrap_or(0); // 0 = auto-select

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/wallet/create-message", wallet_url))
        .json(&json!({
            "kind": 11, // Proof of Existence kind
            "body": hex::encode(&body),
            "body_is_hex": true,
            "carrier": carrier_type,
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Wallet request failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        error!("Wallet error: {}", error_text);
        return Err(AppError::Internal(format!("Wallet error: {}", error_text)));
    }

    let tx_response: CreateTxResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Invalid wallet response: {}", e)))?;

    Ok(tx_response)
}

/// Create an Anchor transaction with an anchor reference
async fn create_anchor_tx_with_anchor(
    wallet_url: &str,
    payload: &ProofPayload,
    txid_prefix: &[u8],
    vout: u8,
    carrier: Option<u8>,
) -> Result<CreateTxResponse, AppError> {
    let body = payload.to_bytes();
    let carrier_type = carrier.unwrap_or(0);

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/wallet/create-message", wallet_url))
        .json(&json!({
            "kind": 11,
            "body": hex::encode(&body),
            "body_is_hex": true,
            "carrier": carrier_type,
            "anchors": [{
                "txid_prefix": hex::encode(txid_prefix),
                "vout": vout,
            }],
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Wallet request failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        error!("Wallet error: {}", error_text);
        return Err(AppError::Internal(format!("Wallet error: {}", error_text)));
    }

    let tx_response: CreateTxResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Invalid wallet response: {}", e)))?;

    Ok(tx_response)
}

// ============================================================================
// Error Handling
// ============================================================================

/// Application error type
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    NotFound(String),
    Conflict(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        error!("Internal error: {}", err);
        AppError::Internal(err.to_string())
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        error!("Database error: {}", err);
        AppError::Internal("Database error".to_string())
    }
}
