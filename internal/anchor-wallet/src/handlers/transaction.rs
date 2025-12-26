//! Transaction operations: broadcast, mine, get raw tx

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::AppState;

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

/// Response for raw transaction
#[derive(Serialize, ToSchema)]
pub struct RawTxResponse {
    /// Transaction ID
    pub txid: String,
    /// Raw transaction hex
    pub hex: String,
    /// Decoded transaction info
    pub decoded: Option<serde_json::Value>,
    /// Transaction fee in satoshis
    pub fee_sats: Option<u64>,
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

/// Get raw transaction by txid
#[utoipa::path(
    get,
    path = "/wallet/rawtx/{txid}",
    tag = "Transaction",
    params(
        ("txid" = String, Path, description = "Transaction ID")
    ),
    responses(
        (status = 200, description = "Raw transaction", body = RawTxResponse),
        (status = 404, description = "Transaction not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_raw_tx(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(txid): axum::extract::Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.get_raw_transaction(&txid) {
        Ok((hex, decoded, fee_sats)) => Ok(Json(RawTxResponse {
            txid,
            hex,
            decoded: Some(decoded),
            fee_sats,
        })),
        Err(e) => {
            error!("Failed to get raw tx {}: {}", txid, e);
            if e.to_string().contains("not found") {
                Err((StatusCode::NOT_FOUND, "Transaction not found".to_string()))
            } else {
                Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}
