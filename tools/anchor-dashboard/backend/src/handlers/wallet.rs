//! Wallet proxy handlers - forwards requests to the wallet service

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::AppState;

/// Wallet balance response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct WalletBalance {
    pub confirmed: f64,
    pub unconfirmed: f64,
    #[serde(default)]
    pub immature: f64,
    pub total: f64,
}

/// New address response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AddressResponse {
    pub address: String,
}

/// UTXO info
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    #[serde(default)]
    pub address: Option<String>,
    pub amount: f64,
    pub confirmations: i64,
}

/// Send request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SendRequest {
    pub address: String,
    pub amount: f64,
    #[serde(default = "default_fee_rate")]
    pub fee_rate: u64,
}

fn default_fee_rate() -> u64 {
    1
}

/// Send response
#[derive(Debug, Serialize, ToSchema)]
pub struct SendResponse {
    pub txid: String,
    pub hex: String,
}

/// Transaction info
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TransactionInfo {
    pub txid: String,
    pub amount: f64,
    pub confirmations: u64,
    pub blockhash: Option<String>,
    pub blockheight: Option<u64>,
    pub time: u64,
    pub category: String,
}

/// Get wallet balance
#[utoipa::path(
    get,
    path = "/wallet/balance",
    tag = "Wallet",
    responses(
        (status = 200, description = "Wallet balance", body = WalletBalance),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_balance(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/balance", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let balance: WalletBalance = response.json().await.map_err(|e| {
        error!("Failed to parse wallet balance: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(balance))
}

/// Get new receiving address
#[utoipa::path(
    get,
    path = "/wallet/address",
    tag = "Wallet",
    responses(
        (status = 200, description = "New address", body = AddressResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_new_address(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/address", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let address: AddressResponse = response.json().await.map_err(|e| {
        error!("Failed to parse address response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(address))
}

/// List UTXOs
#[utoipa::path(
    get,
    path = "/wallet/utxos",
    tag = "Wallet",
    responses(
        (status = 200, description = "List of UTXOs", body = Vec<Utxo>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_utxos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let utxos: Vec<Utxo> = response.json().await.map_err(|e| {
        error!("Failed to parse UTXOs: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(utxos))
}

/// Get transaction history using Bitcoin RPC listtransactions
#[utoipa::path(
    get,
    path = "/wallet/transactions",
    tag = "Wallet",
    responses(
        (status = 200, description = "Transaction history", body = Vec<TransactionInfo>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_transactions(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}", state.config.bitcoin_rpc_url);

    let response = state
        .http_client
        .post(&url)
        .basic_auth(
            &state.config.bitcoin_rpc_user,
            Some(&state.config.bitcoin_rpc_password),
        )
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "dashboard",
            "method": "listtransactions",
            "params": ["*", 50, 0, true]
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Bitcoin RPC: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse Bitcoin RPC response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    if let Some(error) = result.get("error").filter(|e| !e.is_null()) {
        error!("Bitcoin RPC error: {:?}", error);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("RPC error: {:?}", error),
        ));
    }

    let transactions: Vec<TransactionInfo> =
        serde_json::from_value(result["result"].clone()).unwrap_or_default();

    Ok(Json(transactions))
}

/// Mine blocks (regtest only)
#[derive(Debug, Deserialize, ToSchema)]
pub struct MineRequest {
    #[serde(default = "default_block_count")]
    pub count: u32,
}

fn default_block_count() -> u32 {
    1
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MineResponse {
    pub blocks: Vec<String>,
}

/// Mine blocks (regtest only)
#[utoipa::path(
    post,
    path = "/wallet/mine",
    tag = "Wallet",
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
    let url = format!("{}/wallet/mine", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&serde_json::json!({ "count": req.count }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: MineResponse = response.json().await.map_err(|e| {
        error!("Failed to parse mine response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

