//! UTXO lock management handlers

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tracing::{error, info, warn};
use utoipa::ToSchema;

use crate::locked::LockReason;
use crate::AppState;

/// UTXO reference for lock/unlock operations
#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct UtxoRef {
    pub txid: String,
    pub vout: u32,
}

/// Request to lock UTXOs
#[derive(Debug, Deserialize, ToSchema)]
pub struct LockRequest {
    /// List of UTXOs to lock
    pub utxos: Vec<UtxoRef>,
    /// Reason for locking (optional, defaults to "manual")
    /// Note: Currently unused but kept for API compatibility
    #[allow(dead_code)]
    pub reason: Option<String>,
}

/// Request to unlock UTXOs
#[derive(Debug, Deserialize, ToSchema)]
pub struct UnlockRequest {
    /// List of UTXOs to unlock
    pub utxos: Vec<UtxoRef>,
}

/// Response for lock/unlock operations
#[derive(Serialize, ToSchema)]
pub struct LockResponse {
    pub success: bool,
    pub message: String,
    pub affected_count: usize,
}

/// Locked UTXO response
#[derive(Serialize, ToSchema)]
pub struct LockedUtxoResponse {
    pub txid: String,
    pub vout: u32,
    pub reason: String,
    pub asset_type: Option<String>,
    pub asset_id: Option<String>,
    pub locked_at: DateTime<Utc>,
}

/// Lock settings response
#[derive(Serialize, ToSchema)]
pub struct LockSettingsResponse {
    pub auto_lock_enabled: bool,
    pub total_locked: usize,
    pub last_sync: Option<DateTime<Utc>>,
}

/// Request to set auto-lock
#[derive(Debug, Deserialize, ToSchema)]
pub struct SetAutoLockRequest {
    pub enabled: bool,
}

/// Response for sync locks operation
#[derive(Serialize, ToSchema)]
pub struct SyncLocksResponse {
    pub success: bool,
    pub domains_found: usize,
    pub tokens_found: usize,
    pub new_locks_added: usize,
    pub stale_locks_removed: usize,
}

/// List all locked UTXOs
#[utoipa::path(
    get,
    path = "/wallet/utxos/locked",
    tag = "Locks",
    responses(
        (status = 200, description = "List of locked UTXOs", body = Vec<LockedUtxoResponse>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_locked_utxos(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let locked = state.lock_manager.list_locked();
    let response: Vec<LockedUtxoResponse> = locked
        .into_iter()
        .map(|u| {
            let (reason_str, asset_type, asset_id) = match &u.reason {
                LockReason::Manual => ("manual".to_string(), None, None),
                LockReason::Domain { name } => {
                    ("domain".to_string(), Some("domain".to_string()), Some(name.clone()))
                }
                LockReason::Token { ticker, amount } => {
                    ("token".to_string(), Some("token".to_string()), Some(format!("{} {}", amount, ticker)))
                }
                LockReason::Asset { asset_type, asset_id } => {
                    ("asset".to_string(), Some(asset_type.clone()), Some(asset_id.clone()))
                }
            };
            LockedUtxoResponse {
                txid: u.txid,
                vout: u.vout,
                reason: reason_str,
                asset_type,
                asset_id,
                locked_at: u.locked_at,
            }
        })
        .collect();

    Ok(Json(response))
}

/// Lock specific UTXOs
#[utoipa::path(
    post,
    path = "/wallet/utxos/lock",
    tag = "Locks",
    request_body = LockRequest,
    responses(
        (status = 200, description = "UTXOs locked successfully", body = LockResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn lock_utxos(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LockRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut locked_count = 0;

    for utxo in req.utxos {
        match state.lock_manager.lock(utxo.txid.clone(), utxo.vout, LockReason::Manual) {
            Ok(true) => locked_count += 1,
            Ok(false) => {} // Already locked
            Err(e) => {
                error!("Failed to lock UTXO {}:{}: {}", utxo.txid, utxo.vout, e);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
            }
        }
    }

    info!("Locked {} UTXOs", locked_count);
    Ok(Json(LockResponse {
        success: true,
        message: format!("Locked {} UTXOs", locked_count),
        affected_count: locked_count,
    }))
}

/// Unlock specific UTXOs
#[utoipa::path(
    post,
    path = "/wallet/utxos/unlock",
    tag = "Locks",
    request_body = UnlockRequest,
    responses(
        (status = 200, description = "UTXOs unlocked successfully", body = LockResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn unlock_utxos(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UnlockRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut unlocked_count = 0;

    for utxo in req.utxos {
        match state.lock_manager.unlock(&utxo.txid, utxo.vout) {
            Ok(true) => unlocked_count += 1,
            Ok(false) => {} // Was not locked
            Err(e) => {
                error!("Failed to unlock UTXO {}:{}: {}", utxo.txid, utxo.vout, e);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
            }
        }
    }

    info!("Unlocked {} UTXOs", unlocked_count);
    Ok(Json(LockResponse {
        success: true,
        message: format!("Unlocked {} UTXOs", unlocked_count),
        affected_count: unlocked_count,
    }))
}

/// Sync locks with app backends (auto-detect ownership UTXOs)
#[utoipa::path(
    post,
    path = "/wallet/utxos/sync-locks",
    tag = "Locks",
    responses(
        (status = 200, description = "Locks synced with app backends", body = SyncLocksResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn sync_locks(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Starting lock sync with app backends...");

    // Get current wallet UTXOs
    let wallet_utxos = match state.wallet.list_utxos() {
        Ok(utxos) => utxos,
        Err(e) => {
            error!("Failed to list wallet UTXOs: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let wallet_utxo_set: HashSet<(String, u32)> = wallet_utxos
        .iter()
        .map(|u| (u.txid.clone(), u.vout))
        .collect();

    let mut domains_found = 0;
    let mut tokens_found = 0;
    let mut new_locks: Vec<(String, u32, LockReason)> = Vec::new();

    // Query Anchor Domains backend
    let domains_url = format!("{}/my-domains", state.config.domains_url);
    let utxo_txids: Vec<String> = wallet_utxos.iter().map(|u| u.txid.clone()).collect();
    
    if !utxo_txids.is_empty() {
        let params = format!("owner_txids={}", utxo_txids.join(","));
        let full_url = format!("{}?{}", domains_url, params);
        
        match reqwest::get(&full_url).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(domains) = data.get("data").and_then(|d| d.as_array()) {
                        for domain in domains {
                            if let (Some(name), Some(txid)) = (
                                domain.get("name").and_then(|n| n.as_str()),
                                domain.get("txid").and_then(|t| t.as_str()),
                            ) {
                                domains_found += 1;
                                // Find the UTXO in wallet (vout 0 is typically the ownership output)
                                if wallet_utxo_set.contains(&(txid.to_string(), 0)) {
                                    new_locks.push((
                                        txid.to_string(),
                                        0,
                                        LockReason::Domain { name: name.to_string() },
                                    ));
                                }
                            }
                        }
                    }
                }
            }
            Ok(resp) => {
                warn!("Domains backend returned status {}", resp.status());
            }
            Err(e) => {
                warn!("Failed to query domains backend: {}", e);
            }
        }
    }

    // Query Anchor Tokens backend for user's token UTXOs
    let tokens_url = format!("{}/wallet/utxos", state.config.tokens_url);
    // For each wallet address, query token UTXOs
    if let Ok(addr) = state.wallet.get_new_address() {
        let full_url = format!("{}?address={}", tokens_url, addr);
        match reqwest::get(&full_url).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(utxos) = data.as_array() {
                        for utxo in utxos {
                            if let (Some(txid), Some(vout), Some(ticker), Some(amount)) = (
                                utxo.get("txid").and_then(|t| t.as_str()),
                                utxo.get("vout").and_then(|v| v.as_u64()),
                                utxo.get("ticker").and_then(|t| t.as_str()),
                                utxo.get("amount").and_then(|a| a.as_str()),
                            ) {
                                tokens_found += 1;
                                if wallet_utxo_set.contains(&(txid.to_string(), vout as u32)) {
                                    new_locks.push((
                                        txid.to_string(),
                                        vout as u32,
                                        LockReason::Token {
                                            ticker: ticker.to_string(),
                                            amount: amount.to_string(),
                                        },
                                    ));
                                }
                            }
                        }
                    }
                }
            }
            Ok(resp) => {
                warn!("Tokens backend returned status {}", resp.status());
            }
            Err(e) => {
                warn!("Failed to query tokens backend: {}", e);
            }
        }
    }

    // Add new locks
    let new_locks_added = match state.lock_manager.bulk_lock(new_locks) {
        Ok(count) => count,
        Err(e) => {
            error!("Failed to bulk lock: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Prune stale locks (UTXOs that no longer exist in wallet)
    let stale_locks_removed = match state.lock_manager.prune_stale_locks(&wallet_utxo_set) {
        Ok(count) => count,
        Err(e) => {
            error!("Failed to prune stale locks: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Update last sync timestamp
    if let Err(e) = state.lock_manager.update_last_sync() {
        warn!("Failed to update last sync timestamp: {}", e);
    }

    info!(
        "Lock sync complete: {} domains, {} tokens, {} new locks, {} stale removed",
        domains_found, tokens_found, new_locks_added, stale_locks_removed
    );

    Ok(Json(SyncLocksResponse {
        success: true,
        domains_found,
        tokens_found,
        new_locks_added,
        stale_locks_removed,
    }))
}

/// Get lock settings
#[utoipa::path(
    get,
    path = "/wallet/locks/settings",
    tag = "Locks",
    responses(
        (status = 200, description = "Lock settings", body = LockSettingsResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_lock_settings(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    Ok(Json(LockSettingsResponse {
        auto_lock_enabled: state.lock_manager.is_auto_lock_enabled(),
        total_locked: state.lock_manager.list_locked().len(),
        last_sync: state.lock_manager.get_last_sync(),
    }))
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
    match state.lock_manager.set_auto_lock(req.enabled) {
        Ok(()) => {
            info!("Auto-lock set to: {}", req.enabled);
            Ok(Json(LockResponse {
                success: true,
                message: format!("Auto-lock set to: {}", req.enabled),
                affected_count: 0,
            }))
        }
        Err(e) => {
            error!("Failed to set auto-lock: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

