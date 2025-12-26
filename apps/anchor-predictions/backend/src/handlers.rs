//! HTTP API handlers for Anchor Predictions

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::amm::AmmState;
use crate::db::Database;
use crate::models::*;

pub type AppState = Arc<Database>;

// ==================== Health ====================

pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

// ==================== Stats ====================

#[derive(Deserialize)]
pub struct StatsQuery {}

#[utoipa::path(
    get,
    path = "/api/stats",
    responses(
        (status = 200, description = "Market statistics", body = MarketStats)
    ),
    tag = "stats"
)]
pub async fn get_stats(State(db): State<AppState>) -> impl IntoResponse {
    match db.get_stats().await {
        Ok(stats) => Json(stats).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Markets ====================

#[derive(Deserialize)]
pub struct ListMarketsQuery {
    pub status: Option<String>,
    pub limit: Option<i32>,
}

#[utoipa::path(
    get,
    path = "/api/markets",
    params(
        ("status" = Option<String>, Query, description = "Filter by status: open, resolved, cancelled"),
        ("limit" = Option<i32>, Query, description = "Max results to return")
    ),
    responses(
        (status = 200, description = "List of markets", body = Vec<Market>)
    ),
    tag = "markets"
)]
pub async fn list_markets(
    State(db): State<AppState>,
    Query(params): Query<ListMarketsQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50);
    match db.list_markets(params.status.as_deref(), limit).await {
        Ok(markets) => Json(markets).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/api/markets/{id}",
    params(
        ("id" = String, Path, description = "Market ID (hex)")
    ),
    responses(
        (status = 200, description = "Market details", body = Market),
        (status = 404, description = "Market not found")
    ),
    tag = "markets"
)]
pub async fn get_market(State(db): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match db.get_market(&id).await {
        Ok(Some(market)) => Json(market).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Market not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/api/markets/create",
    request_body = CreateMarketRequest,
    responses(
        (status = 200, description = "Market creation request accepted")
    ),
    tag = "markets"
)]
pub async fn create_market(
    State(db): State<AppState>,
    Json(req): Json<CreateMarketRequest>,
) -> impl IntoResponse {
    use rand::Rng;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    // Generate a unique market_id
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let random_bytes: [u8; 16] = rand::thread_rng().gen();
    let mut market_id_bytes = Vec::with_capacity(32);
    market_id_bytes.extend_from_slice(&timestamp.to_be_bytes()[..16]);
    market_id_bytes.extend_from_slice(&random_bytes);
    let market_id_hex = hex::encode(&market_id_bytes);
    
    // Create market object matching the API model
    let initial_pool = req.initial_liquidity_sats.unwrap_or(1_000_000_000);
    let yes_price = 0.5;
    let no_price = 0.5;
    
    let market = crate::models::Market {
        id: 0, // Will be assigned by DB
        market_id: market_id_hex.clone(),
        question: req.question.clone(),
        description: req.description.clone(),
        resolution_block: req.resolution_block,
        oracle_pubkey: req.oracle_pubkey.clone(),
        creator_pubkey: "0".repeat(64), // Placeholder
        status: "open".to_string(),
        resolution: None,
        resolution_name: "pending".to_string(),
        yes_pool: initial_pool,
        no_pool: initial_pool,
        yes_price,
        no_price,
        total_volume_sats: 0,
        total_yes_sats: 0,
        total_no_sats: 0,
        position_count: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    
    // Insert into database
    match db.create_market(&market).await {
        Ok(_) => {
            Json(serde_json::json!({
                "status": "success",
                "message": format!("Market created successfully! ID: {}", &market_id_hex[..16]),
                "market_id": market_id_hex,
                "question": req.question,
                "description": req.description,
                "resolution_block": req.resolution_block,
                "oracle_pubkey": req.oracle_pubkey,
                "initial_liquidity_sats": initial_pool,
            })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to create market: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to create market: {}", e),
            }))).into_response()
        }
    }
}

// ==================== Betting ====================

#[derive(Deserialize)]
pub struct GetPositionsQuery {
    pub limit: Option<i32>,
}

#[utoipa::path(
    get,
    path = "/api/markets/{id}/positions",
    params(
        ("id" = String, Path, description = "Market ID (hex)"),
        ("limit" = Option<i32>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "Market positions", body = Vec<Position>)
    ),
    tag = "markets"
)]
pub async fn get_market_positions(
    State(db): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<GetPositionsQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(100);
    match db.get_market_positions(&id, limit).await {
        Ok(positions) => Json(positions).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/api/markets/{id}/quote",
    request_body = PlaceBetRequest,
    responses(
        (status = 200, description = "Bet quote", body = PlaceBetQuote)
    ),
    tag = "markets"
)]
pub async fn get_bet_quote(
    State(db): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PlaceBetRequest>,
) -> impl IntoResponse {
    // Get market AMM state
    let market_id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    };

    match db.get_market_amm_state(&market_id_bytes).await {
        Ok(Some(amm)) => {
            let result = amm.quote(req.outcome, req.amount_sats);
            Json(PlaceBetQuote {
                outcome: req.outcome,
                outcome_name: outcome_name(req.outcome),
                amount_sats: req.amount_sats,
                shares_out: result.shares_out,
                avg_price: result.avg_price,
                price_impact: result.price_impact,
                new_yes_price: result.new_yes_price,
                new_no_price: result.new_no_price,
            })
            .into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Market not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/api/markets/{id}/bet",
    request_body = PlaceBetRequest,
    responses(
        (status = 200, description = "Bet placement request accepted")
    ),
    tag = "markets"
)]
pub async fn place_bet(
    State(db): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PlaceBetRequest>,
) -> impl IntoResponse {
    // Get market to verify it exists and get quote
    let market_id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(e) => return (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    };

    // Decode user pubkey
    let user_pubkey_bytes = match hex::decode(&req.user_pubkey) {
        Ok(b) => b,
        Err(e) => return (StatusCode::BAD_REQUEST, format!("Invalid user_pubkey: {}", e)).into_response(),
    };

    match db.get_market_amm_state(&market_id_bytes).await {
        Ok(Some(amm)) => {
            let result = amm.quote(req.outcome, req.amount_sats);
            let outcome_str = if req.outcome == 1 { "YES" } else { "NO" };

            // Create real Bitcoin transaction if bet_address is provided
            let (txid_bytes, is_real_tx) = if let Some(ref bet_address) = req.bet_address {
                // Create bet transaction via wallet API
                let wallet_url = std::env::var("WALLET_SERVICE_URL").unwrap_or_else(|_| "http://core-wallet:8001".to_string());
                let client = reqwest::Client::new();
                
                // Build body: market_id (32 bytes) + outcome (1 byte) + user_pubkey (first 32 bytes)
                let mut body_bytes = market_id_bytes.clone();
                body_bytes.push(req.outcome as u8);
                body_bytes.extend_from_slice(&user_pubkey_bytes[..std::cmp::min(32, user_pubkey_bytes.len())]);
                
                let bet_request = serde_json::json!({
                    "kind": 41, // PlaceBet
                    "body": hex::encode(&body_bytes),
                    "body_is_hex": true,
                    "outputs": [{
                        "address": bet_address,
                        "value": req.amount_sats
                    }],
                    "fee_rate": 1
                });

                let response = match client
                    .post(format!("{}/wallet/create-message", wallet_url))
                    .json(&bet_request)
                    .send()
                    .await
                {
                    Ok(resp) => resp,
                    Err(e) => {
                        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                            "status": "error",
                            "message": format!("Failed to create bet transaction: {}", e)
                        }))).into_response();
                    }
                };

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "status": "error",
                        "message": format!("Wallet error: {}", error_text)
                    }))).into_response();
                }

                let wallet_response: serde_json::Value = match response.json().await {
                    Ok(v) => v,
                    Err(e) => {
                        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                            "status": "error",
                            "message": format!("Failed to parse wallet response: {}", e)
                        }))).into_response();
                    }
                };

                let txid = wallet_response["txid"].as_str().unwrap_or("unknown").to_string();
                let txid_bytes = hex::decode(&txid).unwrap_or_else(|_| txid.as_bytes().to_vec());
                (txid_bytes, true)
            } else {
                // Demo mode: Generate a pseudo-txid for demo purposes
                let demo_txid = format!("demo_{}_{}", id, chrono::Utc::now().timestamp_millis());
                (demo_txid.as_bytes().to_vec(), false)
            };
            
            // Insert position into database
            match db.insert_position(
                &market_id_bytes,
                &txid_bytes,
                0, // vout
                0, // block_height (will be updated by indexer for real tx)
                &user_pubkey_bytes,
                req.outcome,
                req.amount_sats,
                result.shares_out,
                result.avg_price as f32,
            ).await {
                Ok(_) => {
                    // Update market AMM pools
                    let new_yes_pool = if req.outcome == 1 {
                        amm.yes_pool - result.shares_out
                    } else {
                        amm.yes_pool + req.amount_sats
                    };
                    let new_no_pool = if req.outcome == 0 {
                        amm.no_pool - result.shares_out
                    } else {
                        amm.no_pool + req.amount_sats
                    };
                    
                    let _ = db.update_market_after_bet(
                        &market_id_bytes,
                        new_yes_pool,
                        new_no_pool,
                        req.amount_sats,
                        req.outcome,
                    ).await;

                    let txid_hex = if is_real_tx {
                        hex::encode(&txid_bytes)
                    } else {
                        String::from_utf8_lossy(&txid_bytes).to_string()
                    };

                    Json(serde_json::json!({
                        "status": "success",
                        "message": "Bet placed successfully!",
                        "market_id": id,
                        "outcome": outcome_str,
                        "amount_sats": req.amount_sats,
                        "shares": result.shares_out,
                        "avg_price": result.avg_price,
                        "price_impact": result.price_impact,
                        "txid": txid_hex,
                        "is_real_tx": is_real_tx,
                    }))
                    .into_response()
                }
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save bet: {}", e)).into_response(),
            }
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Market not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Resolution ====================

#[utoipa::path(
    get,
    path = "/api/markets/{id}/resolution",
    params(
        ("id" = String, Path, description = "Market ID (hex)")
    ),
    responses(
        (status = 200, description = "Market resolution status")
    ),
    tag = "markets"
)]
pub async fn get_resolution(
    State(db): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match db.get_market(&id).await {
        Ok(Some(market)) => Json(serde_json::json!({
            "market_id": market.market_id,
            "question": market.question,
            "status": market.status,
            "resolution": market.resolution,
            "resolution_name": market.resolution_name,
            "resolution_block": market.resolution_block,
        }))
        .into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Market not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    get,
    path = "/api/markets/{id}/winners",
    params(
        ("id" = String, Path, description = "Market ID (hex)")
    ),
    responses(
        (status = 200, description = "Market winners", body = Vec<Winner>)
    ),
    tag = "markets"
)]
pub async fn get_market_winners(
    State(db): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match db.get_market_winners(&id).await {
        Ok(winners) => Json(winners).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[utoipa::path(
    post,
    path = "/api/markets/{id}/claim",
    request_body = ClaimWinningsRequest,
    responses(
        (status = 200, description = "Claim request accepted")
    ),
    tag = "markets"
)]
pub async fn claim_winnings(
    State(db): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ClaimWinningsRequest>,
) -> impl IntoResponse {
    // First, get the position to check eligibility and get payout amount
    let position = match db.get_position_by_id(req.position_id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "status": "error",
                "message": "Position not found"
            }))).into_response();
        }
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
        }
    };

    // Check if position is eligible for claiming
    if !position.is_winner {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "status": "error",
            "message": "Position is not a winner"
        }))).into_response();
    }
    if position.claimed {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "status": "error",
            "message": "Position already claimed"
        }))).into_response();
    }

    let payout_sats = position.payout_sats;
    
    // Create payout transaction via wallet API
    let wallet_url = std::env::var("WALLET_SERVICE_URL").unwrap_or_else(|_| "http://core-wallet:8001".to_string());
    let client = reqwest::Client::new();
    
    // Create a payout message with outputs
    let payout_request = serde_json::json!({
        "kind": 0,
        "body": format!("Prediction Market Payout - Position {}", req.position_id),
        "outputs": [{
            "address": req.payout_address,
            "value": payout_sats
        }],
        "fee_rate": 1
    });

    let response = match client
        .post(format!("{}/wallet/create-message", wallet_url))
        .json(&payout_request)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to create payout transaction: {}", e)
            }))).into_response();
        }
    };

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "status": "error",
            "message": format!("Wallet error: {}", error_text)
        }))).into_response();
    }

    // Parse the response to get the txid
    let wallet_response: serde_json::Value = match response.json().await {
        Ok(v) => v,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to parse wallet response: {}", e)
            }))).into_response();
        }
    };

    let claim_txid = wallet_response["txid"].as_str().unwrap_or("unknown").to_string();
    let claim_txid_bytes = hex::decode(&claim_txid).unwrap_or_else(|_| claim_txid.as_bytes().to_vec());
    
    // Mark position as claimed in database
    match db.claim_winnings(req.position_id, &claim_txid_bytes).await {
        Ok(claimed) => {
            if claimed {
                Json(serde_json::json!({
                    "status": "success",
                    "message": format!("Winnings of {} sats sent to {}!", payout_sats, req.payout_address),
                    "market_id": id,
                    "position_id": req.position_id,
                    "payout_sats": payout_sats,
                    "payout_address": req.payout_address,
                    "claim_txid": claim_txid,
                })).into_response()
            } else {
                (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                    "status": "error",
                    "message": "Failed to mark position as claimed"
                }))).into_response()
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== User ====================

#[derive(Deserialize)]
pub struct GetMyPositionsQuery {
    pub pubkey: String,
    pub limit: Option<i32>,
}

#[utoipa::path(
    get,
    path = "/api/my/positions",
    params(
        ("pubkey" = String, Query, description = "User public key (hex)"),
        ("limit" = Option<i32>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "User positions", body = Vec<Position>)
    ),
    tag = "user"
)]
pub async fn get_my_positions(
    State(db): State<AppState>,
    Query(params): Query<GetMyPositionsQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50);
    match db.get_user_positions(&params.pubkey, limit).await {
        Ok(positions) => Json(positions).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// List all positions (for demo)
#[derive(Deserialize)]
pub struct AllPositionsQuery {
    pub limit: Option<i32>,
}

#[utoipa::path(
    get,
    path = "/api/positions",
    params(
        ("limit" = Option<i32>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "All positions", body = Vec<Position>)
    ),
    tag = "positions"
)]
pub async fn get_all_positions(
    State(db): State<AppState>,
    Query(params): Query<AllPositionsQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50);
    match db.get_all_positions(limit).await {
        Ok(positions) => Json(positions).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== History ====================

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i32>,
}

#[utoipa::path(
    get,
    path = "/api/history",
    params(
        ("limit" = Option<i32>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "Resolved markets", body = Vec<Market>)
    ),
    tag = "history"
)]
pub async fn get_history(
    State(db): State<AppState>,
    Query(params): Query<HistoryQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(20);
    match db.get_resolved_markets(limit).await {
        Ok(markets) => Json(markets).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
