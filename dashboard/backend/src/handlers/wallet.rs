//! Wallet proxy handlers - forwards requests to the wallet service

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
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

/// Send request (for OpenAPI schema)
#[derive(Debug, Deserialize, ToSchema)]
pub struct SendRequest {
    #[serde(rename = "address")]
    pub _address: String,
    #[serde(rename = "amount")]
    pub _amount: f64,
    #[serde(default = "default_fee_rate", rename = "fee_rate")]
    pub _fee_rate: u64,
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
    let url = state.config.bitcoin_rpc_url.to_string();

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

// ============================================================================
// UTXO Lock Management Proxy Handlers
// ============================================================================

/// Locked UTXO info
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockedUtxo {
    pub txid: String,
    pub vout: u32,
    pub reason: String,
    pub asset_type: Option<String>,
    pub asset_id: Option<String>,
    pub locked_at: String,
}

/// Lock response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockResponse {
    pub success: bool,
    pub message: String,
    pub affected_count: usize,
}

/// Lock settings
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockSettings {
    pub auto_lock_enabled: bool,
    pub total_locked: usize,
    pub last_sync: Option<String>,
}

/// Sync locks response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SyncLocksResponse {
    pub success: bool,
    pub domains_found: usize,
    pub tokens_found: usize,
    pub new_locks_added: usize,
    pub stale_locks_removed: usize,
}

/// Domain asset
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DomainAsset {
    pub name: String,
    pub txid: String,
    pub record_count: i64,
    pub block_height: Option<i32>,
    pub created_at: Option<String>,
    pub is_locked: bool,
}

/// Token asset
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TokenAsset {
    pub ticker: String,
    pub name: Option<String>,
    pub decimals: i16,
    pub max_supply: Option<String>,
    pub total_minted: Option<String>,
    pub holder_count: Option<i32>,
    pub is_locked: bool,
}

/// Assets overview
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetsOverview {
    pub domains: Vec<DomainAsset>,
    pub tokens: Vec<TokenAsset>,
    pub total_domains: usize,
    pub total_token_types: usize,
}

/// List locked UTXOs
#[utoipa::path(
    get,
    path = "/wallet/utxos/locked",
    tag = "Locks",
    responses(
        (status = 200, description = "List of locked UTXOs", body = Vec<LockedUtxo>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_locked_utxos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos/locked", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let utxos: Vec<LockedUtxo> = response.json().await.map_err(|e| {
        error!("Failed to parse locked UTXOs: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(utxos))
}

/// List unlocked UTXOs
#[utoipa::path(
    get,
    path = "/wallet/utxos/unlocked",
    tag = "Locks",
    responses(
        (status = 200, description = "List of unlocked UTXOs", body = Vec<Utxo>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_unlocked_utxos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos/unlocked", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let utxos: Vec<Utxo> = response.json().await.map_err(|e| {
        error!("Failed to parse unlocked UTXOs: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(utxos))
}

/// Lock UTXOs request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockRequest {
    pub utxos: Vec<UtxoRef>,
}

/// UTXO reference
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UtxoRef {
    pub txid: String,
    pub vout: u32,
}

/// Lock UTXOs
#[utoipa::path(
    post,
    path = "/wallet/utxos/lock",
    tag = "Locks",
    request_body = LockRequest,
    responses(
        (status = 200, description = "UTXOs locked", body = LockResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn lock_utxos(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LockRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos/lock", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: LockResponse = response.json().await.map_err(|e| {
        error!("Failed to parse lock response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

/// Unlock UTXOs request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UnlockRequest {
    pub utxos: Vec<UtxoRef>,
}

/// Unlock UTXOs
#[utoipa::path(
    post,
    path = "/wallet/utxos/unlock",
    tag = "Locks",
    request_body = UnlockRequest,
    responses(
        (status = 200, description = "UTXOs unlocked", body = LockResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn unlock_utxos(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UnlockRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos/unlock", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: LockResponse = response.json().await.map_err(|e| {
        error!("Failed to parse unlock response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

/// Sync locks with app backends
#[utoipa::path(
    post,
    path = "/wallet/utxos/sync-locks",
    tag = "Locks",
    responses(
        (status = 200, description = "Locks synced", body = SyncLocksResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn sync_locks(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/utxos/sync-locks", state.config.wallet_url);

    let response = state.http_client.post(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let result: SyncLocksResponse = response.json().await.map_err(|e| {
        error!("Failed to parse sync response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

/// Get lock settings
#[utoipa::path(
    get,
    path = "/wallet/locks/settings",
    tag = "Locks",
    responses(
        (status = 200, description = "Lock settings", body = LockSettings),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_lock_settings(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/locks/settings", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let settings: LockSettings = response.json().await.map_err(|e| {
        error!("Failed to parse lock settings: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(settings))
}

/// Set auto-lock request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SetAutoLockRequest {
    pub enabled: bool,
}

/// Set auto-lock enabled/disabled
#[utoipa::path(
    post,
    path = "/wallet/locks/auto-lock",
    tag = "Locks",
    request_body = SetAutoLockRequest,
    responses(
        (status = 200, description = "Auto-lock setting updated", body = LockResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn set_auto_lock(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SetAutoLockRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/locks/auto-lock", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: LockResponse = response.json().await.map_err(|e| {
        error!("Failed to parse auto-lock response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

/// Get all wallet assets
#[utoipa::path(
    get,
    path = "/wallet/assets",
    tag = "Assets",
    responses(
        (status = 200, description = "All wallet assets", body = AssetsOverview),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/assets", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let assets: AssetsOverview = response.json().await.map_err(|e| {
        error!("Failed to parse assets: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(assets))
}

/// Get wallet domains
#[utoipa::path(
    get,
    path = "/wallet/assets/domains",
    tag = "Assets",
    responses(
        (status = 200, description = "Wallet domains", body = Vec<DomainAsset>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets_domains(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/assets/domains", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let domains: Vec<DomainAsset> = response.json().await.map_err(|e| {
        error!("Failed to parse domains: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(domains))
}

/// Get wallet tokens
#[utoipa::path(
    get,
    path = "/wallet/assets/tokens",
    tag = "Assets",
    responses(
        (status = 200, description = "Wallet tokens", body = Vec<TokenAsset>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets_tokens(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/assets/tokens", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let tokens: Vec<TokenAsset> = response.json().await.map_err(|e| {
        error!("Failed to parse tokens: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(tokens))
}

// ============================================================================
// Wallet Backup Proxy Handlers
// ============================================================================

/// Wallet info response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct WalletInfoResponse {
    pub fingerprint: String,
    pub network: String,
    pub external_descriptor: String,
    pub internal_descriptor: String,
    pub derivation_path: String,
    pub address_type: String,
    pub has_mnemonic: bool,
    pub addresses_used: u32,
    pub bdk_enabled: bool,
}

/// Mnemonic response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MnemonicResponse {
    pub available: bool,
    pub words: Vec<String>,
    pub word_count: u32,
    pub warning: String,
}

/// Descriptors response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DescriptorsResponse {
    pub external: String,
    pub internal: String,
}

/// Export backup request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ExportBackupRequest {
    pub password: String,
}

/// Export backup response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ExportBackupResponse {
    pub success: bool,
    pub backup: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Verify backup response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct VerifyBackupResponse {
    pub valid: bool,
    pub error: Option<String>,
}

/// Migration status response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MigrationStatusResponse {
    pub status: serde_json::Value,
    pub notification: Option<serde_json::Value>,
}

/// Locked assets overview
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockedAssetsOverview {
    pub summary: LockedAssetsSummary,
    pub items: Vec<LockedAssetItem>,
}

/// Locked assets summary
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockedAssetsSummary {
    pub domains: LockedAssetCount,
    pub tokens: LockedAssetCount,
    pub manual: LockedAssetCount,
    pub total: LockedAssetCount,
}

/// Locked asset count
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockedAssetCount {
    pub count: u32,
    pub total_sats: u64,
}

/// Locked asset item
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LockedAssetItem {
    pub txid: String,
    pub vout: u32,
    pub amount_sats: u64,
    pub lock_type: String,
    pub asset_name: Option<String>,
    pub locked_at: String,
}

/// Get wallet backup info
#[utoipa::path(
    get,
    path = "/wallet/backup/info",
    tag = "Backup",
    responses(
        (status = 200, description = "Wallet info", body = WalletInfoResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_backup_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/info", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let info: WalletInfoResponse = response.json().await.map_err(|e| {
        error!("Failed to parse wallet info: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(info))
}

/// Get wallet mnemonic
#[utoipa::path(
    get,
    path = "/wallet/backup/mnemonic",
    tag = "Backup",
    responses(
        (status = 200, description = "Mnemonic phrase", body = MnemonicResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_backup_mnemonic(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/mnemonic", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mnemonic: MnemonicResponse = response.json().await.map_err(|e| {
        error!("Failed to parse mnemonic: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(mnemonic))
}

/// Get wallet descriptors
#[utoipa::path(
    get,
    path = "/wallet/backup/descriptors",
    tag = "Backup",
    responses(
        (status = 200, description = "Wallet descriptors", body = DescriptorsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_backup_descriptors(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/descriptors", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let descriptors: DescriptorsResponse = response.json().await.map_err(|e| {
        error!("Failed to parse descriptors: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(descriptors))
}

/// Export encrypted backup
#[utoipa::path(
    post,
    path = "/wallet/backup/export",
    tag = "Backup",
    request_body = ExportBackupRequest,
    responses(
        (status = 200, description = "Encrypted backup", body = ExportBackupResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn export_backup(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExportBackupRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/export", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let backup: ExportBackupResponse = response.json().await.map_err(|e| {
        error!("Failed to parse backup: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(backup))
}

/// Verify backup request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct VerifyBackupRequest {
    pub backup: serde_json::Value,
    pub password: String,
}

/// Verify encrypted backup
#[utoipa::path(
    post,
    path = "/wallet/backup/verify",
    tag = "Backup",
    request_body = VerifyBackupRequest,
    responses(
        (status = 200, description = "Verification result", body = VerifyBackupResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn verify_backup(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyBackupRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/verify-backup", state.config.wallet_url);

    let response = state
        .http_client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: VerifyBackupResponse = response.json().await.map_err(|e| {
        error!("Failed to parse verification result: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(result))
}

/// Get migration status
#[utoipa::path(
    get,
    path = "/wallet/backup/migration-status",
    tag = "Backup",
    responses(
        (status = 200, description = "Migration status", body = MigrationStatusResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_migration_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}/wallet/backup/migration-status", state.config.wallet_url);

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let status: MigrationStatusResponse = response.json().await.map_err(|e| {
        error!("Failed to parse migration status: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(status))
}

/// Query parameters for locked assets
#[derive(Debug, Deserialize)]
pub struct LockedAssetsQuery {
    /// Filter by lock type: "domain", "token", "manual", or "all"
    pub filter: Option<String>,
}

/// Get locked assets overview
#[utoipa::path(
    get,
    path = "/wallet/locked-assets",
    tag = "Locks",
    params(
        ("filter" = Option<String>, Query, description = "Filter by type: domain, token, manual, or all")
    ),
    responses(
        (status = 200, description = "Locked assets overview", body = LockedAssetsOverview),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_locked_assets(
    State(state): State<Arc<AppState>>,
    Query(query): Query<LockedAssetsQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut url = format!("{}/wallet/locked-assets", state.config.wallet_url);

    // Pass the filter parameter to the wallet service
    if let Some(filter) = &query.filter {
        url = format!("{}?filter={}", url, filter);
    }

    let response = state.http_client.get(&url).send().await.map_err(|e| {
        error!("Failed to connect to wallet service: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let assets: LockedAssetsOverview = response.json().await.map_err(|e| {
        error!("Failed to parse locked assets: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(assets))
}
