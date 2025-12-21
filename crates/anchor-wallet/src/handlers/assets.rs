//! Asset aggregation handlers (domains, tokens)

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use std::sync::Arc;
use tracing::{error, info, warn};
use utoipa::ToSchema;

use crate::AppState;

/// Domain asset
#[derive(Serialize, ToSchema)]
pub struct DomainAsset {
    pub name: String,
    pub txid: String,
    pub record_count: i64,
    pub block_height: Option<i32>,
    pub created_at: Option<String>,
    pub is_locked: bool,
}

/// Token asset
#[derive(Serialize, ToSchema)]
pub struct TokenAsset {
    pub ticker: String,
    pub balance: String,
    pub decimals: i16,
    pub utxo_count: i32,
    pub is_locked: bool,
}

/// Aggregated asset overview
#[derive(Serialize, ToSchema)]
pub struct AssetsOverview {
    pub domains: Vec<DomainAsset>,
    pub tokens: Vec<TokenAsset>,
    pub total_domains: usize,
    pub total_token_types: usize,
}

/// Get all assets owned by the wallet
#[utoipa::path(
    get,
    path = "/wallet/assets",
    tag = "Assets",
    responses(
        (status = 200, description = "All assets owned by the wallet", body = AssetsOverview),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Fetching all wallet assets...");

    // Get current wallet UTXOs
    let wallet_utxos = match state.wallet.list_utxos() {
        Ok(utxos) => utxos,
        Err(e) => {
            error!("Failed to list wallet UTXOs: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let locked_set = state.lock_manager.get_locked_set();
    let utxo_txids: Vec<String> = wallet_utxos.iter().map(|u| u.txid.clone()).collect();

    let mut domains: Vec<DomainAsset> = Vec::new();
    let mut tokens: Vec<TokenAsset> = Vec::new();

    // Fetch domains from Anchor Domains backend
    if !utxo_txids.is_empty() {
        let domains_url = format!("{}/my-domains", state.config.domains_url);
        let params = format!("owner_txids={}", utxo_txids.join(","));
        let full_url = format!("{}?{}", domains_url, params);

        match reqwest::get(&full_url).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(domain_list) = data.get("data").and_then(|d| d.as_array()) {
                        for domain in domain_list {
                            let txid = domain.get("txid").and_then(|t| t.as_str()).unwrap_or("");
                            let is_locked = locked_set.contains(&(txid.to_string(), 0));
                            
                            domains.push(DomainAsset {
                                name: domain.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string(),
                                txid: txid.to_string(),
                                record_count: domain.get("record_count").and_then(|r| r.as_i64()).unwrap_or(0),
                                block_height: domain.get("block_height").and_then(|b| b.as_i64()).map(|b| b as i32),
                                created_at: domain.get("created_at").and_then(|c| c.as_str()).map(String::from),
                                is_locked,
                            });
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

    // Fetch tokens from Anchor Tokens backend
    // Query token balances for each address in wallet
    let tokens_url = format!("{}/address", state.config.tokens_url);
    for utxo in &wallet_utxos {
        // Get address from Bitcoin Core for this UTXO
        if let Ok(addr) = state.wallet.get_new_address() {
            let full_url = format!("{}/{}/balances", tokens_url, addr);
            match reqwest::get(&full_url).await {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if let Some(balance_list) = data.as_array() {
                            for balance in balance_list {
                                let ticker = balance.get("ticker").and_then(|t| t.as_str()).unwrap_or("").to_string();
                                
                                // Skip if we already have this token
                                if tokens.iter().any(|t| t.ticker == ticker) {
                                    continue;
                                }

                                tokens.push(TokenAsset {
                                    ticker,
                                    balance: balance.get("balance").and_then(|b| b.as_str()).unwrap_or("0").to_string(),
                                    decimals: balance.get("decimals").and_then(|d| d.as_i64()).unwrap_or(0) as i16,
                                    utxo_count: balance.get("utxo_count").and_then(|u| u.as_i64()).unwrap_or(0) as i32,
                                    is_locked: locked_set.contains(&(utxo.txid.clone(), utxo.vout)),
                                });
                            }
                        }
                    }
                }
                _ => {}
            }
            break; // Only need to query once per wallet (addresses are aggregated)
        }
    }

    let total_domains = domains.len();
    let total_token_types = tokens.len();

    info!(
        "Found {} domains and {} token types",
        total_domains, total_token_types
    );

    Ok(Json(AssetsOverview {
        domains,
        tokens,
        total_domains,
        total_token_types,
    }))
}

/// Get domains owned by the wallet
#[utoipa::path(
    get,
    path = "/wallet/assets/domains",
    tag = "Assets",
    responses(
        (status = 200, description = "Domains owned by the wallet", body = Vec<DomainAsset>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets_domains(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get current wallet UTXOs
    let _wallet_utxos = match state.wallet.list_utxos() {
        Ok(utxos) => utxos,
        Err(e) => {
            error!("Failed to list wallet UTXOs: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let locked_set = state.lock_manager.get_locked_set();
    
    // Only query with locked domain UTXOs (not all wallet UTXOs - that would be too many!)
    let locked_domain_txids: Vec<String> = state.lock_manager
        .list_locked()
        .into_iter()
        .filter(|u| u.reason.is_domain())
        .map(|u| u.txid)
        .collect();

    let mut domains: Vec<DomainAsset> = Vec::new();

    if !locked_domain_txids.is_empty() {
        let domains_url = format!("{}/my-domains", state.config.domains_url);
        let params = format!("owner_txids={}", locked_domain_txids.join(","));
        let full_url = format!("{}?{}", domains_url, params);

        match reqwest::get(&full_url).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(domain_list) = data.get("data").and_then(|d| d.as_array()) {
                        for domain in domain_list {
                            let txid = domain.get("txid").and_then(|t| t.as_str()).unwrap_or("");
                            let is_locked = locked_set.contains(&(txid.to_string(), 0));
                            
                            domains.push(DomainAsset {
                                name: domain.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string(),
                                txid: txid.to_string(),
                                record_count: domain.get("record_count").and_then(|r| r.as_i64()).unwrap_or(0),
                                block_height: domain.get("block_height").and_then(|b| b.as_i64()).map(|b| b as i32),
                                created_at: domain.get("created_at").and_then(|c| c.as_str()).map(String::from),
                                is_locked,
                            });
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

    Ok(Json(domains))
}

/// Get tokens owned by the wallet
#[utoipa::path(
    get,
    path = "/wallet/assets/tokens",
    tag = "Assets",
    responses(
        (status = 200, description = "Tokens owned by the wallet", body = Vec<TokenAsset>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_assets_tokens(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get current wallet UTXOs
    let wallet_utxos = match state.wallet.list_utxos() {
        Ok(utxos) => utxos,
        Err(e) => {
            error!("Failed to list wallet UTXOs: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    let locked_set = state.lock_manager.get_locked_set();
    let mut tokens: Vec<TokenAsset> = Vec::new();

    // Query token balances
    let tokens_url = format!("{}/address", state.config.tokens_url);
    if let Ok(addr) = state.wallet.get_new_address() {
        let full_url = format!("{}/{}/balances", tokens_url, addr);
        match reqwest::get(&full_url).await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    if let Some(balance_list) = data.as_array() {
                        for balance in balance_list {
                            let ticker = balance.get("ticker").and_then(|t| t.as_str()).unwrap_or("").to_string();
                            
                            tokens.push(TokenAsset {
                                ticker,
                                balance: balance.get("balance").and_then(|b| b.as_str()).unwrap_or("0").to_string(),
                                decimals: balance.get("decimals").and_then(|d| d.as_i64()).unwrap_or(0) as i16,
                                utxo_count: balance.get("utxo_count").and_then(|u| u.as_i64()).unwrap_or(0) as i32,
                                is_locked: wallet_utxos.iter().any(|u| locked_set.contains(&(u.txid.clone(), u.vout))),
                            });
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

    Ok(Json(tokens))
}

