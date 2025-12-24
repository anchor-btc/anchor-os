//! Asset aggregation handlers (domains, tokens)

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
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
    pub name: Option<String>,
    pub decimals: i16,
    pub max_supply: Option<String>,
    pub total_minted: Option<String>,
    pub holder_count: Option<i32>,
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

/// Domains API response structure
#[derive(Deserialize)]
struct DomainsApiResponse {
    data: Vec<DomainData>,
    total: i64,
}

#[derive(Deserialize)]
struct DomainData {
    name: String,
    txid: String,
    record_count: Option<i64>,
    block_height: Option<i32>,
    created_at: Option<String>,
}

/// Tokens API response structure
#[derive(Deserialize)]
struct TokensApiResponse {
    data: Vec<TokenData>,
    total: i64,
}

#[derive(Deserialize)]
struct TokenData {
    ticker: String,
    name: Option<String>,
    decimals: Option<i16>,
    max_supply: Option<String>,
    total_minted: Option<String>,
    holder_count: Option<i32>,
    deploy_txid: Option<String>,
}

/// Get all assets owned by the wallet
/// On regtest, this fetches ALL indexed domains and tokens since everything belongs to the user
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

    let locked_set = state.lock_manager.get_locked_set();
    
    let mut domains: Vec<DomainAsset> = Vec::new();
    let mut tokens: Vec<TokenAsset> = Vec::new();

    // Fetch ALL domains from Anchor Domains backend
    // On regtest, all domains belong to the wallet
    let domains_url = format!("{}/domains?per_page=1000", state.config.domains_url);
    
    match reqwest::get(&domains_url).await {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<DomainsApiResponse>().await {
                Ok(data) => {
                    info!("Fetched {} domains from backend (total: {})", data.data.len(), data.total);
                    for domain in data.data {
                        let is_locked = locked_set.contains(&(domain.txid.clone(), 0));
                        
                        domains.push(DomainAsset {
                            name: domain.name,
                            txid: domain.txid,
                            record_count: domain.record_count.unwrap_or(0),
                            block_height: domain.block_height,
                            created_at: domain.created_at,
                            is_locked,
                        });
                    }
                }
                Err(e) => {
                    warn!("Failed to parse domains response: {}", e);
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

    // Fetch ALL tokens from Anchor Tokens backend
    // On regtest, all tokens belong to the wallet
    let tokens_url = format!("{}/tokens?per_page=1000", state.config.tokens_url);

    match reqwest::get(&tokens_url).await {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<TokensApiResponse>().await {
                Ok(data) => {
                    info!("Fetched {} tokens from backend (total: {})", data.data.len(), data.total);
                    for token in data.data {
                        // Check if the deploy txid is locked
                        let is_locked = token.deploy_txid
                            .as_ref()
                            .map(|txid| locked_set.contains(&(txid.clone(), 0)))
                            .unwrap_or(false);
                        
                        tokens.push(TokenAsset {
                            ticker: token.ticker,
                            name: token.name,
                            decimals: token.decimals.unwrap_or(0),
                            max_supply: token.max_supply,
                            total_minted: token.total_minted,
                            holder_count: token.holder_count,
                            is_locked,
                        });
                    }
                }
                Err(e) => {
                    warn!("Failed to parse tokens response: {}", e);
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
    let locked_set = state.lock_manager.get_locked_set();
    let mut domains: Vec<DomainAsset> = Vec::new();

    // Fetch ALL domains from backend
    let domains_url = format!("{}/domains?per_page=1000", state.config.domains_url);

    match reqwest::get(&domains_url).await {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<DomainsApiResponse>().await {
                Ok(data) => {
                    for domain in data.data {
                        let is_locked = locked_set.contains(&(domain.txid.clone(), 0));
                        
                        domains.push(DomainAsset {
                            name: domain.name,
                            txid: domain.txid,
                            record_count: domain.record_count.unwrap_or(0),
                            block_height: domain.block_height,
                            created_at: domain.created_at,
                            is_locked,
                        });
                    }
                }
                Err(e) => {
                    warn!("Failed to parse domains response: {}", e);
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
    let locked_set = state.lock_manager.get_locked_set();
    let mut tokens: Vec<TokenAsset> = Vec::new();

    // Fetch ALL tokens from backend
    let tokens_url = format!("{}/tokens?per_page=1000", state.config.tokens_url);

    match reqwest::get(&tokens_url).await {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<TokensApiResponse>().await {
                Ok(data) => {
                    for token in data.data {
                        let is_locked = token.deploy_txid
                            .as_ref()
                            .map(|txid| locked_set.contains(&(txid.clone(), 0)))
                            .unwrap_or(false);
                        
                        tokens.push(TokenAsset {
                            ticker: token.ticker,
                            name: token.name,
                            decimals: token.decimals.unwrap_or(0),
                            max_supply: token.max_supply,
                            total_minted: token.total_minted,
                            holder_count: token.holder_count,
                            is_locked,
                        });
                    }
                }
                Err(e) => {
                    warn!("Failed to parse tokens response: {}", e);
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

    Ok(Json(tokens))
}
