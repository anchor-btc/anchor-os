//! Basic wallet operations: balance, address, UTXOs

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::AppState;

/// Response for new address
#[derive(Serialize, ToSchema)]
pub struct AddressResponse {
    /// Bitcoin address
    pub address: String,
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

/// List unlocked UTXOs only (for spending)
#[utoipa::path(
    get,
    path = "/wallet/utxos/unlocked",
    tag = "Wallet",
    responses(
        (status = 200, description = "List of unlocked UTXOs available for spending"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_utxos_unlocked(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.list_utxos() {
        Ok(utxos) => {
            let locked_set = state.lock_manager.get_locked_set();
            let unlocked: Vec<_> = utxos
                .into_iter()
                .filter(|u| !locked_set.contains(&(u.txid.clone(), u.vout)))
                .collect();
            Ok(Json(unlocked))
        }
        Err(e) => {
            error!("Failed to list UTXOs: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Response for addresses list
#[derive(Serialize, ToSchema)]
pub struct AddressesResponse {
    /// List of unique addresses in the wallet
    pub addresses: Vec<String>,
}

/// List all addresses that have ever received funds (including those with 0 balance)
#[utoipa::path(
    get,
    path = "/wallet/addresses",
    tag = "Wallet",
    responses(
        (status = 200, description = "List of all addresses that have received funds", body = AddressesResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_addresses(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.wallet.list_received_addresses() {
        Ok(addresses) => Ok(Json(AddressesResponse { addresses })),
        Err(e) => {
            error!("Failed to list addresses: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
