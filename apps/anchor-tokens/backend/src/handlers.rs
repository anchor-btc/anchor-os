//! HTTP API handlers for Anchor Tokens

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::error;

use anchor_specs::KindSpec;
use crate::db::Database;
use crate::models::{
    BurnTokenRequest, CreateTxResponse, DeployTokenRequest, HealthResponse, ListParams,
    MintTokenRequest, Token, TokenAllocation, TokenBalance, TokenHolder, TokenOperation, 
    TokenOperationResponse, TokenSpec, TokenStats, TokenUtxo, TransferTokenRequest, PaginatedResponse,
};

/// Application state
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub wallet_url: String,
}

// ============================================================================
// Health & Stats
// ============================================================================

/// Health check endpoint
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "anchor-tokens".to_string(),
    })
}

/// Get protocol statistics
pub async fn get_stats(State(state): State<AppState>) -> Result<Json<TokenStats>, AppError> {
    let stats = state.db.get_stats().await?;
    Ok(Json(stats))
}

// ============================================================================
// Token Endpoints
// ============================================================================

/// List all tokens
pub async fn list_tokens(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<Token>>, AppError> {
    let result = state
        .db
        .list_tokens(params.page, params.per_page, params.search.as_deref())
        .await?;
    Ok(Json(result))
}

/// Get token by ticker
pub async fn get_token(
    State(state): State<AppState>,
    Path(ticker): Path<String>,
) -> Result<Json<Token>, AppError> {
    let token = state
        .db
        .get_token_by_ticker(&ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", ticker)))?;
    Ok(Json(token))
}

/// Get token holders
pub async fn get_token_holders(
    State(state): State<AppState>,
    Path(ticker): Path<String>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<TokenHolder>>, AppError> {
    let token = state
        .db
        .get_token_by_ticker(&ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", ticker)))?;

    let result = state
        .db
        .get_token_holders(token.id, params.page, params.per_page)
        .await?;
    Ok(Json(result))
}

/// Get token operation history
pub async fn get_token_history(
    State(state): State<AppState>,
    Path(ticker): Path<String>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<TokenOperationResponse>>, AppError> {
    let token = state
        .db
        .get_token_by_ticker(&ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", ticker)))?;

    let result = state
        .db
        .get_token_history(token.id, params.page, params.per_page)
        .await?;
    Ok(Json(result))
}

// ============================================================================
// Address Endpoints
// ============================================================================

/// Get address token balances
pub async fn get_address_balances(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<Vec<TokenBalance>>, AppError> {
    let balances = state.db.get_address_balances(&address).await?;
    Ok(Json(balances))
}

/// Get address token UTXOs
pub async fn get_address_utxos(
    State(state): State<AppState>,
    Path(address): Path<String>,
    Query(params): Query<UtxoParams>,
) -> Result<Json<Vec<TokenUtxo>>, AppError> {
    let token_id = if let Some(ticker) = params.ticker {
        let token = state
            .db
            .get_token_by_ticker(&ticker)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Token {} not found", ticker)))?;
        Some(token.id)
    } else {
        None
    };

    let utxos = state.db.get_address_utxos(&address, token_id).await?;
    Ok(Json(utxos))
}

#[derive(Debug, serde::Deserialize)]
pub struct UtxoParams {
    pub ticker: Option<String>,
}

/// Get address operation history
pub async fn get_address_history(
    State(_state): State<AppState>,
    Path(_address): Path<String>,
    Query(params): Query<ListParams>,
) -> Result<Json<PaginatedResponse<TokenOperationResponse>>, AppError> {
    // For now, return empty - would need to query by address across all tokens
    Ok(Json(PaginatedResponse {
        data: vec![],
        total: 0,
        page: params.page,
        per_page: params.per_page,
        total_pages: 0,
    }))
}

// ============================================================================
// Wallet Endpoints
// ============================================================================

/// Get all token holdings for the connected wallet
/// This gets all unspent token UTXOs and checks if their addresses are controlled by the wallet
pub async fn get_wallet_tokens(
    State(state): State<AppState>,
) -> Result<Json<WalletTokensResponse>, AppError> {
    // Get all unspent token UTXOs
    let all_token_utxos = state.db.get_all_unspent_token_utxos().await?;
    
    if all_token_utxos.is_empty() {
        return Ok(Json(WalletTokensResponse {
            balances: vec![],
            utxos: vec![],
            total_utxos: 0,
        }));
    }

    // Get the network from Bitcoin RPC
    let bitcoin_rpc_url = std::env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://core-bitcoin:18443".to_string());
    let bitcoin_rpc_user = std::env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "anchor".to_string());
    let bitcoin_rpc_password = std::env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "anchor".to_string());
    
    // Check if we're in regtest mode
    let client = reqwest::Client::new();
    let is_regtest = {
        let response = client
            .post(&bitcoin_rpc_url)
            .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
            .json(&serde_json::json!({
                "jsonrpc": "1.0",
                "id": "getblockchaininfo",
                "method": "getblockchaininfo",
                "params": []
            }))
            .send()
            .await;
        
        if let Ok(resp) = response {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                json["result"]["chain"].as_str() == Some("regtest")
            } else {
                false
            }
        } else {
            false
        }
    };

    // In regtest mode, assume all tokens belong to the user (single wallet environment)
    // In other networks, we would check address ownership via Bitcoin RPC
    let wallet_utxos: Vec<TokenUtxo> = if is_regtest {
        tracing::info!("Regtest mode: returning all {} token UTXOs as wallet-owned", all_token_utxos.len());
        all_token_utxos
    } else {
        // Get unique addresses
        let addresses: Vec<String> = all_token_utxos
            .iter()
            .filter_map(|u| u.owner_address.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        let mut wallet_addresses: std::collections::HashSet<String> = std::collections::HashSet::new();
        
        // Use wallet-specific URL for getaddressinfo (required for multi-wallet Bitcoin Core)
        let wallet_rpc_url = format!("{}/wallet/anchor_wallet", bitcoin_rpc_url);

        let num_addresses = addresses.len();
        tracing::info!("Checking {} unique addresses for wallet ownership", num_addresses);
        
        for addr in addresses {
            // Call Bitcoin RPC getaddressinfo to check if address is ours
            let response = client
                .post(&wallet_rpc_url)
                .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
                .json(&serde_json::json!({
                    "jsonrpc": "1.0",
                    "id": "wallet_tokens",
                    "method": "getaddressinfo",
                    "params": [&addr]
                }))
                .send()
                .await;

            if let Ok(resp) = response {
                if let Ok(result) = resp.json::<serde_json::Value>().await {
                    if result["result"]["ismine"].as_bool() == Some(true) {
                        wallet_addresses.insert(addr.clone());
                        tracing::debug!("Address {} is owned by wallet", addr);
                    }
                }
            }
        }
        
        tracing::info!("Found {} wallet-owned addresses out of {}", wallet_addresses.len(), num_addresses);

        // Filter token UTXOs to only those owned by wallet
        all_token_utxos
            .into_iter()
            .filter(|u| {
                u.owner_address
                    .as_ref()
                    .map(|a| wallet_addresses.contains(a))
                    .unwrap_or(false)
            })
            .collect()
    };

    // Aggregate balances
    let mut token_balances: std::collections::HashMap<i32, (String, i16, i128)> = std::collections::HashMap::new();
    
    for utxo in &wallet_utxos {
        let amount: i128 = utxo.amount.parse().unwrap_or(0);
        let entry = token_balances
            .entry(utxo.token_id)
            .or_insert_with(|| (utxo.ticker.clone(), utxo.decimals, 0));
        entry.2 += amount;
    }

    // Convert to response format
    let balances: Vec<TokenBalance> = token_balances
        .into_iter()
        .map(|(token_id, (ticker, decimals, balance))| TokenBalance {
            token_id,
            ticker,
            balance: balance.to_string(),
            decimals,
            utxo_count: wallet_utxos.iter().filter(|u| u.token_id == token_id).count() as i32,
        })
        .collect();

    let total_utxos = wallet_utxos.len() as i32;
    
    Ok(Json(WalletTokensResponse {
        balances,
        utxos: wallet_utxos,
        total_utxos,
    }))
}

/// Response for wallet tokens endpoint
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletTokensResponse {
    pub balances: Vec<TokenBalance>,
    pub utxos: Vec<TokenUtxo>,
    pub total_utxos: i32,
}

// ============================================================================
// Transaction Endpoints
// ============================================================================

/// Create a deploy transaction
pub async fn create_deploy_tx(
    State(state): State<AppState>,
    Json(request): Json<DeployTokenRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    // Validate ticker
    if !crate::models::is_valid_ticker(&request.ticker) {
        return Err(AppError::BadRequest("Invalid ticker format".to_string()));
    }

    // Check if ticker is available
    if !state.db.is_ticker_available(&request.ticker).await? {
        return Err(AppError::BadRequest(format!(
            "Ticker {} is already registered",
            request.ticker
        )));
    }

    // Build flags
    let mut flags = 0u8;
    if request.open_mint {
        flags |= 0x01;
    }
    if request.burnable {
        flags |= 0x04;
    }

    // Create the token operation
    let operation = TokenOperation::Deploy {
        ticker: request.ticker.to_uppercase(),
        decimals: request.decimals,
        max_supply: request.max_supply.parse().map_err(|_| {
            AppError::BadRequest("Invalid max_supply".to_string())
        })?,
        mint_limit: request.mint_limit.as_ref().map(|s| s.parse()).transpose().map_err(|_| {
            AppError::BadRequest("Invalid mint_limit".to_string())
        })?,
        flags,
    };

    // Encode the payload using anchor-specs
    let spec = TokenSpec::new(operation);
    let payload = spec.to_bytes();

    // Call wallet service to create transaction
    let carrier = request.carrier.unwrap_or(4); // Default to WitnessData
    let fee_rate = request.fee_rate.unwrap_or(1.0);

    let response = create_wallet_tx(&state.wallet_url, &payload, carrier, fee_rate, 20).await?;

    Ok(Json(response))
}

/// Create a mint transaction
pub async fn create_mint_tx(
    State(state): State<AppState>,
    Json(request): Json<MintTokenRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    // Get token
    let token = state
        .db
        .get_token_by_ticker(&request.ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", request.ticker)))?;

    // Check if minting is allowed
    if token.flags & 0x02 != 0 {
        return Err(AppError::BadRequest("Token has fixed supply".to_string()));
    }

    // Create the token operation
    let operation = TokenOperation::Mint {
        token_id: token.id as u64,
        amount: request.amount.parse().map_err(|_| {
            AppError::BadRequest("Invalid amount".to_string())
        })?,
        output_index: 0, // Mint to first output
    };

    // Encode the payload using anchor-specs
    let spec = TokenSpec::new(operation);
    let payload = spec.to_bytes();

    let carrier = request.carrier.unwrap_or(4);
    let fee_rate = request.fee_rate.unwrap_or(1.0);

    let response = create_wallet_tx(&state.wallet_url, &payload, carrier, fee_rate, 20).await?;

    // Lock the newly minted token UTXO to prevent it from being spent by other transactions
    if let Err(e) = lock_utxo(&response.txid, 0).await {
        tracing::warn!("Failed to lock minted UTXO: {:?}", e);
    }

    Ok(Json(response))
}

/// Reverse txid hex string bytes (convert between internal and display format)
/// Bitcoin txids are stored in internal format (reversed) but displayed/used in API in reverse
fn reverse_txid_hex(txid: &str) -> String {
    let bytes: Vec<_> = (0..txid.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&txid[i..i+2], 16).ok())
        .collect();
    bytes.iter().rev().map(|b| format!("{:02x}", b)).collect()
}

/// Lock a UTXO to prevent it from being spent by other wallet transactions
async fn lock_utxo(txid: &str, vout: u32) -> Result<(), AppError> {
    let client = reqwest::Client::new();
    let bitcoin_rpc_url = std::env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://bitcoin:18443".to_string());
    let bitcoin_rpc_user = std::env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "anchor".to_string());
    let bitcoin_rpc_password = std::env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "anchor".to_string());
    
    // Use wallet-specific URL for lockunspent
    let wallet_rpc_url = format!("{}/wallet/anchor_wallet", bitcoin_rpc_url);

    let response = client
        .post(&wallet_rpc_url)
        .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "lock",
            "method": "lockunspent",
            "params": [false, [{"txid": txid, "vout": vout}]]
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Bitcoin RPC failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Lock UTXO failed: {}", error_text)));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse lock response: {}", e)))?;

    if result["error"].is_null() && result["result"].as_bool() == Some(true) {
        tracing::info!("Locked UTXO: {}:{}", txid, vout);
        Ok(())
    } else {
        Err(AppError::Internal(format!("Failed to lock UTXO: {}", result)))
    }
}

/// Unlock a UTXO so it can be spent
async fn unlock_utxo(txid: &str, vout: u32) -> Result<(), AppError> {
    let client = reqwest::Client::new();
    let bitcoin_rpc_url = std::env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://bitcoin:18443".to_string());
    let bitcoin_rpc_user = std::env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "anchor".to_string());
    let bitcoin_rpc_password = std::env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "anchor".to_string());
    
    // Use wallet-specific URL for lockunspent
    let wallet_rpc_url = format!("{}/wallet/anchor_wallet", bitcoin_rpc_url);

    let response = client
        .post(&wallet_rpc_url)
        .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "unlock",
            "method": "lockunspent",
            "params": [true, [{"txid": txid, "vout": vout}]]
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Bitcoin RPC failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Unlock UTXO failed: {}", error_text)));
    }

    Ok(())
}

/// Create a transfer transaction
pub async fn create_transfer_tx(
    State(state): State<AppState>,
    Json(request): Json<TransferTokenRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    // Get token
    let token = state
        .db
        .get_token_by_ticker(&request.ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", request.ticker)))?;

    // Calculate total amount needed
    let total_amount: u128 = request
        .allocations
        .iter()
        .map(|a| a.amount.parse::<u128>().unwrap_or(0))
        .sum();

    if total_amount == 0 {
        return Err(AppError::BadRequest("Total transfer amount must be greater than 0".to_string()));
    }

    // Get wallet's token UTXOs for this token
    let all_token_utxos = state.db.get_all_unspent_token_utxos().await?;
    
    // Filter to only this token's UTXOs (we need to check wallet ownership)
    let token_utxos: Vec<_> = all_token_utxos
        .into_iter()
        .filter(|u| u.token_id == token.id)
        .collect();

    if token_utxos.is_empty() {
        return Err(AppError::BadRequest("No token UTXOs available for transfer".to_string()));
    }

    // Check which UTXOs are owned by wallet using Bitcoin RPC
    let client = reqwest::Client::new();
    let bitcoin_rpc_url = std::env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://bitcoin:18443".to_string());
    let bitcoin_rpc_user = std::env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "anchor".to_string());
    let bitcoin_rpc_password = std::env::var("BITCOIN_RPC_PASSWORD").unwrap_or_else(|_| "anchor".to_string());

    let mut wallet_utxos: Vec<TokenUtxo> = Vec::new();
    
    for utxo in token_utxos {
        if let Some(addr) = &utxo.owner_address {
            let response = client
                .post(&bitcoin_rpc_url)
                .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
                .json(&serde_json::json!({
                    "jsonrpc": "1.0",
                    "id": "transfer",
                    "method": "getaddressinfo",
                    "params": [addr]
                }))
                .send()
                .await;

            if let Ok(resp) = response {
                if let Ok(result) = resp.json::<serde_json::Value>().await {
                    if result["result"]["ismine"].as_bool() == Some(true) {
                        // Also verify the UTXO still exists on the blockchain using gettxout
                        let display_txid = reverse_txid_hex(&utxo.txid);
                        let utxo_check = client
                            .post(&bitcoin_rpc_url)
                            .basic_auth(&bitcoin_rpc_user, Some(&bitcoin_rpc_password))
                            .json(&serde_json::json!({
                                "jsonrpc": "1.0",
                                "id": "utxo_check",
                                "method": "gettxout",
                                "params": [display_txid, utxo.vout]
                            }))
                            .send()
                            .await;

                        if let Ok(utxo_resp) = utxo_check {
                            if let Ok(utxo_result) = utxo_resp.json::<serde_json::Value>().await {
                                // Check if UTXO exists (result is not null)
                                if !utxo_result["result"].is_null() {
                                    wallet_utxos.push(utxo);
                                } else {
                                    tracing::debug!("Token UTXO {}:{} no longer exists on blockchain (already spent)", display_txid, utxo.vout);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if wallet_utxos.is_empty() {
        return Err(AppError::BadRequest("No spendable token UTXOs available. All token UTXOs have been spent as Bitcoin outputs.".to_string()));
    }

    // Select UTXOs to cover the transfer amount (greedy selection)
    let mut selected_utxos: Vec<TokenUtxo> = Vec::new();
    let mut selected_amount: u128 = 0;

    // Sort by amount descending for better selection
    wallet_utxos.sort_by(|a, b| {
        let a_amt: u128 = a.amount.parse().unwrap_or(0);
        let b_amt: u128 = b.amount.parse().unwrap_or(0);
        b_amt.cmp(&a_amt)
    });

    for utxo in wallet_utxos {
        let utxo_amount: u128 = utxo.amount.parse().unwrap_or(0);
        selected_utxos.push(utxo);
        selected_amount += utxo_amount;
        
        if selected_amount >= total_amount {
            break;
        }
    }

    if selected_amount < total_amount {
        return Err(AppError::BadRequest(format!(
            "Insufficient balance. Have {} but need {}",
            selected_amount, total_amount
        )));
    }

    // Build allocations for the transfer
    // Output 0 = change (if any), subsequent outputs = recipients
    let change_amount = selected_amount - total_amount;
    let mut allocations: Vec<TokenAllocation> = Vec::new();
    
    // Add change allocation if there's any (goes to output 0)
    if change_amount > 0 {
        allocations.push(TokenAllocation {
            output_index: 0,
            amount: change_amount,
        });
    }

    // Add recipient allocations (outputs 1, 2, 3, etc. if there's change, otherwise 0, 1, 2...)
    let output_offset = if change_amount > 0 { 1 } else { 0 };
    for (i, alloc) in request.allocations.iter().enumerate() {
        allocations.push(TokenAllocation {
            output_index: (i + output_offset) as u8,
            amount: alloc.amount.parse().unwrap_or(0),
        });
    }

    // Create the token operation
    let operation = TokenOperation::Transfer {
        token_id: token.id as u64,
        allocations,
    };

    // Encode the payload using anchor-specs
    let spec = TokenSpec::new(operation);
    let payload = spec.to_bytes();

    let carrier = request.carrier.unwrap_or(4);
    let fee_rate = request.fee_rate.unwrap_or(1.0);

    // Unlock selected UTXOs before transfer (they might have been locked to protect them)
    // Note: txid stored in DB is in internal format (reversed), need display format for RPC
    for utxo in &selected_utxos {
        let display_txid = reverse_txid_hex(&utxo.txid);
        if let Err(e) = unlock_utxo(&display_txid, utxo.vout as u32).await {
            tracing::debug!("Failed to unlock UTXO {}:{}: {:?}", display_txid, utxo.vout, e);
        }
    }

    // Build required inputs from selected UTXOs (these will be spent)
    // Use display format txid for wallet API
    let required_inputs: Vec<serde_json::Value> = selected_utxos
        .iter()
        .map(|u| serde_json::json!({
            "txid": reverse_txid_hex(&u.txid),
            "vout": u.vout
        }))
        .collect();

    // Build additional anchors (same as required inputs for token protocol)
    let additional_anchors: Vec<serde_json::Value> = required_inputs.clone();

    // Build custom outputs (recipient addresses with dust amounts)
    let custom_outputs: Vec<serde_json::Value> = request
        .allocations
        .iter()
        .map(|a| serde_json::json!({
            "address": a.address,
            "value": 546  // Dust amount for token-bearing output
        }))
        .collect();

    // Create transaction with source UTXO inputs and recipient outputs
    let response = create_wallet_tx_with_inputs(
        &state.wallet_url, 
        &payload, 
        carrier, 
        fee_rate, 
        20,
        &additional_anchors,
        &required_inputs,
        &custom_outputs,
    ).await?;

    // Lock the new token UTXOs created by this transfer
    // Output 0 is change (if any), outputs 1+ are recipients
    let num_outputs = custom_outputs.len() + if change_amount > 0 { 1 } else { 0 };
    for vout in 0..num_outputs {
        if let Err(e) = lock_utxo(&response.txid, vout as u32).await {
            tracing::debug!("Failed to lock transfer output {}:{}: {:?}", response.txid, vout, e);
        }
    }

    Ok(Json(response))
}

/// Create a burn transaction
pub async fn create_burn_tx(
    State(state): State<AppState>,
    Json(request): Json<BurnTokenRequest>,
) -> Result<Json<CreateTxResponse>, AppError> {
    // Get token
    let token = state
        .db
        .get_token_by_ticker(&request.ticker)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Token {} not found", request.ticker)))?;

    // Check if burning is allowed
    if token.flags & 0x04 == 0 {
        return Err(AppError::BadRequest("Token is not burnable".to_string()));
    }

    // Create the token operation
    let operation = TokenOperation::Burn {
        token_id: token.id as u64,
        amount: request.amount.parse().map_err(|_| {
            AppError::BadRequest("Invalid amount".to_string())
        })?,
    };

    // Encode the payload using anchor-specs
    let spec = TokenSpec::new(operation);
    let payload = spec.to_bytes();

    let carrier = request.carrier.unwrap_or(4);
    let fee_rate = request.fee_rate.unwrap_or(1.0);

    let response = create_wallet_tx(&state.wallet_url, &payload, carrier, fee_rate, 20).await?;

    Ok(Json(response))
}

// ============================================================================
// Wallet Integration
// ============================================================================

async fn create_wallet_tx(
    wallet_url: &str,
    body: &[u8],
    carrier: u8,
    fee_rate: f64,
    kind: u8,
) -> Result<CreateTxResponse, AppError> {
    let client = reqwest::Client::new();

    // Convert fee_rate to sat/vB as u64 (wallet expects integer)
    let fee_rate_sats = (fee_rate.max(1.0)) as u64;

    let response = client
        .post(format!("{}/wallet/create-message", wallet_url))
        .json(&json!({
            "kind": kind,
            "body": hex::encode(body),
            "body_is_hex": true,
            "carrier": carrier,
            "fee_rate": fee_rate_sats,
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Wallet request failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Wallet error: {}", error_text)));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse wallet response: {}", e)))?;

    parse_wallet_response(result, carrier)
}

/// Create a wallet transaction with required inputs and custom outputs for token transfers
async fn create_wallet_tx_with_inputs(
    wallet_url: &str,
    body: &[u8],
    carrier: u8,
    fee_rate: f64,
    kind: u8,
    additional_anchors: &[serde_json::Value],
    required_inputs: &[serde_json::Value],
    custom_outputs: &[serde_json::Value],
) -> Result<CreateTxResponse, AppError> {
    let client = reqwest::Client::new();
    let fee_rate_sats = (fee_rate.max(1.0)) as u64;

    let request_body = json!({
        "kind": kind,
        "body": hex::encode(body),
        "body_is_hex": true,
        "carrier": carrier,
        "fee_rate": fee_rate_sats,
        "additional_anchors": additional_anchors,
        "required_inputs": required_inputs,
        "outputs": custom_outputs,
    });

    let response = client
        .post(format!("{}/wallet/create-message", wallet_url))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Wallet request failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Wallet error: {}", error_text)));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse wallet response: {}", e)))?;

    parse_wallet_response(result, carrier)
}

fn parse_wallet_response(result: serde_json::Value, carrier: u8) -> Result<CreateTxResponse, AppError> {
    let carrier_names = ["op_return", "inscription", "stamps", "taproot_annex", "witness_data"];

    Ok(CreateTxResponse {
        txid: result["txid"].as_str().unwrap_or_default().to_string(),
        vout: result["vout"].as_i64().unwrap_or(0) as i32,
        hex: result["hex"].as_str().unwrap_or_default().to_string(),
        carrier: carrier as i32,
        carrier_name: carrier_names
            .get(carrier as usize)
            .unwrap_or(&"unknown")
            .to_string(),
    })
}

// ============================================================================
// Error Handling
// ============================================================================

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Internal(msg) => {
                error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}
