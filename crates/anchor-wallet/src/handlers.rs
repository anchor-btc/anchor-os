//! HTTP request handlers for the wallet API

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

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
        service: "anchor-wallet".to_string(),
    })
}

/// Get wallet balance
#[utoipa::path(
    get,
    path = "/wallet/balance",
    tag = "Wallet",
    responses(
        (status = 200, description = "Wallet balance information"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_balance(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.get_balance() {
        Ok(balance) => Ok(Json(balance)),
        Err(e) => {
            error!("Failed to get balance: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get a new receiving address
#[utoipa::path(
    get,
    path = "/wallet/address",
    tag = "Wallet",
    responses(
        (status = 200, description = "New receiving address", body = AddressResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_new_address(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.get_new_address() {
        Ok(address) => Ok(Json(serde_json::json!({ "address": address }))),
        Err(e) => {
            error!("Failed to get new address: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// List UTXOs
#[utoipa::path(
    get,
    path = "/wallet/utxos",
    tag = "Wallet",
    responses(
        (status = 200, description = "List of unspent transaction outputs"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_utxos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.list_utxos() {
        Ok(utxos) => Ok(Json(utxos)),
        Err(e) => {
            error!("Failed to list UTXOs: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Request body for creating an ANCHOR message
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateMessageRequest {
    /// Message kind (0=generic, 1=text, etc.)
    #[serde(default = "default_kind")]
    pub kind: u8,
    /// Message body (text for kind=1, or hex-encoded binary)
    pub body: String,
    /// Whether body is hex-encoded (default: false, treated as UTF-8 text)
    #[serde(default)]
    pub body_is_hex: bool,
    /// Parent transaction ID (for replies)
    pub parent_txid: Option<String>,
    /// Parent output index (for replies)
    pub parent_vout: Option<u8>,
    /// Additional anchor references [(txid, vout), ...]
    #[serde(default)]
    pub additional_anchors: Vec<AnchorRef>,
}

fn default_kind() -> u8 {
    1 // Text
}

/// Anchor reference for additional message references
#[derive(Debug, Deserialize, ToSchema)]
pub struct AnchorRef {
    /// Transaction ID (hex)
    pub txid: String,
    /// Output index
    pub vout: u8,
}

/// Response for new address
#[derive(Serialize, ToSchema)]
pub struct AddressResponse {
    /// Bitcoin address
    pub address: String,
}

/// Response for created message
#[derive(Serialize, ToSchema)]
pub struct CreateMessageResponse {
    pub txid: String,
    pub vout: u32,
    pub hex: String,
}

/// Create and broadcast an ANCHOR message
#[utoipa::path(
    post,
    path = "/wallet/create-message",
    tag = "ANCHOR",
    request_body = CreateMessageRequest,
    responses(
        (status = 200, description = "Message created and broadcast", body = CreateMessageResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_message(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateMessageRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Parse body
    let body = if req.body_is_hex {
        hex::decode(&req.body).map_err(|e| {
            (StatusCode::BAD_REQUEST, format!("Invalid hex body: {}", e))
        })?
    } else {
        req.body.as_bytes().to_vec()
    };

    // Convert additional anchors
    let additional_anchors: Vec<(String, u8)> = req
        .additional_anchors
        .into_iter()
        .map(|a| (a.txid, a.vout))
        .collect();

    info!(
        "Creating ANCHOR message: kind={}, body_len={}, parent={:?}",
        req.kind,
        body.len(),
        req.parent_txid
    );

    match state.wallet.create_anchor_transaction(
        req.kind,
        body,
        req.parent_txid,
        req.parent_vout,
        additional_anchors,
    ) {
        Ok(result) => {
            info!("Created transaction: {}", result.txid);
            Ok(Json(CreateMessageResponse {
                txid: result.txid,
                vout: result.anchor_vout,
                hex: result.hex,
            }))
        }
        Err(e) => {
            error!("Failed to create message: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Request body for broadcasting a transaction
#[derive(Debug, Deserialize, ToSchema)]
pub struct BroadcastRequest {
    /// Raw transaction hex
    pub hex: String,
}

/// Response for broadcast transaction
#[derive(Serialize, ToSchema)]
pub struct BroadcastResponse {
    /// Transaction ID
    pub txid: String,
}

/// Broadcast a raw transaction
#[utoipa::path(
    post,
    path = "/wallet/broadcast",
    tag = "Transactions",
    request_body = BroadcastRequest,
    responses(
        (status = 200, description = "Transaction broadcast", body = BroadcastResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn broadcast(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BroadcastRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.broadcast(&req.hex) {
        Ok(txid) => Ok(Json(serde_json::json!({ "txid": txid }))),
        Err(e) => {
            error!("Failed to broadcast: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Request body for mining blocks (regtest only)
#[derive(Debug, Deserialize, ToSchema)]
pub struct MineRequest {
    #[serde(default = "default_block_count")]
    pub count: u32,
}

fn default_block_count() -> u32 {
    1
}

/// Response for mined blocks
#[derive(Serialize, ToSchema)]
pub struct MineResponse {
    /// Block hashes of mined blocks
    pub blocks: Vec<String>,
}

/// Mine blocks (regtest only)
#[utoipa::path(
    post,
    path = "/wallet/mine",
    tag = "Mining",
    request_body = MineRequest,
    responses(
        (status = 200, description = "Blocks mined", body = MineResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn mine_blocks(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MineRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.mine_blocks(req.count) {
        Ok(hashes) => {
            info!("Mined {} blocks", hashes.len());
            Ok(Json(serde_json::json!({ "blocks": hashes })))
        }
        Err(e) => {
            error!("Failed to mine: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

