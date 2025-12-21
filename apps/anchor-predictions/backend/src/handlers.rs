//! API handlers for Anchor Predictions

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::db::Database;
use crate::models::{
    BuyTicketRequest, ClaimPrizeRequest, CreateLotteryRequest,
    Lottery, LotteryStats, PrizeTier, Ticket, Winner,
};

pub type AppState = Arc<Database>;

#[derive(Debug, Deserialize)]
pub struct LimitParam {
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StatusFilter {
    pub status: Option<String>,
}

/// Health check endpoint
pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "service": "anchor-predictions" }))
}

/// Get lottery stats
#[utoipa::path(
    get,
    path = "/api/stats",
    responses(
        (status = 200, description = "Lottery statistics", body = LotteryStats)
    ),
    tag = "stats"
)]
pub async fn get_stats(State(db): State<AppState>) -> impl IntoResponse {
    match db.get_stats().await {
        Ok(stats) => Json(stats).into_response(),
        Err(e) => {
            tracing::error!("Failed to get stats: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// List lotteries
#[utoipa::path(
    get,
    path = "/api/lotteries",
    params(
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "List of lotteries", body = Vec<Lottery>)
    ),
    tag = "lotteries"
)]
pub async fn list_lotteries(
    State(db): State<AppState>,
    Query(params): Query<LimitParam>,
    Query(filter): Query<StatusFilter>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);

    match db.get_lotteries(filter.status.as_deref(), limit).await {
        Ok(lotteries) => Json(lotteries).into_response(),
        Err(e) => {
            tracing::error!("Failed to list lotteries: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Get lottery by ID
#[utoipa::path(
    get,
    path = "/api/lotteries/{id}",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)")
    ),
    responses(
        (status = 200, description = "Lottery details", body = Lottery),
        (status = 404, description = "Lottery not found")
    ),
    tag = "lotteries"
)]
pub async fn get_lottery(
    State(db): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid lottery ID hex").into_response(),
    };

    match db.get_lottery_by_id(&id_bytes).await {
        Ok(Some(lottery)) => Json(lottery).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Lottery not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to get lottery: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Create a new lottery
#[utoipa::path(
    post,
    path = "/api/lotteries/create",
    request_body = CreateLotteryRequest,
    responses(
        (status = 200, description = "Lottery creation request")
    ),
    tag = "lotteries"
)]
pub async fn create_lottery(
    State(_db): State<AppState>,
    Json(req): Json<CreateLotteryRequest>,
) -> impl IntoResponse {
    // Validate request
    if req.number_count < 1 || req.number_count > 10 {
        return (StatusCode::BAD_REQUEST, "number_count must be 1-10").into_response();
    }
    if req.number_max < req.number_count || req.number_max > 100 {
        return (StatusCode::BAD_REQUEST, "number_max must be >= number_count and <= 100").into_response();
    }
    if req.ticket_price_sats < 1000 {
        return (StatusCode::BAD_REQUEST, "ticket_price_sats must be >= 1000").into_response();
    }

    // In production, this would create an unsigned transaction
    Json(serde_json::json!({
        "status": "pending",
        "message": "Sign the lottery creation message",
        "lottery_type": req.lottery_type,
        "number_count": req.number_count,
        "number_max": req.number_max,
        "draw_block": req.draw_block,
        "ticket_price_sats": req.ticket_price_sats,
        "oracle_pubkey": req.oracle_pubkey,
    })).into_response()
}

/// Get lottery tickets
#[utoipa::path(
    get,
    path = "/api/lotteries/{id}/tickets",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "List of tickets", body = Vec<Ticket>)
    ),
    tag = "lotteries"
)]
pub async fn get_lottery_tickets(
    State(db): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<LimitParam>,
) -> impl IntoResponse {
    let id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid lottery ID hex").into_response(),
    };

    let limit = params.limit.unwrap_or(100).min(500);

    match db.get_tickets_by_lottery(&id_bytes, limit).await {
        Ok(tickets) => Json(tickets).into_response(),
        Err(e) => {
            tracing::error!("Failed to get tickets: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Buy a ticket
#[utoipa::path(
    post,
    path = "/api/lotteries/{id}/buy",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)")
    ),
    request_body = BuyTicketRequest,
    responses(
        (status = 200, description = "Ticket purchase request with DLC offer")
    ),
    tag = "lotteries"
)]
pub async fn buy_ticket(
    State(_db): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<BuyTicketRequest>,
) -> impl IntoResponse {
    // Validate numbers are sorted and in range
    for i in 1..req.numbers.len() {
        if req.numbers[i] <= req.numbers[i - 1] {
            return (StatusCode::BAD_REQUEST, "Numbers must be sorted and unique").into_response();
        }
    }

    // In production, this would create a DLC offer
    Json(serde_json::json!({
        "status": "pending",
        "message": "Sign the ticket purchase with DLC",
        "lottery_id": id,
        "numbers": req.numbers,
        "buyer_pubkey": req.buyer_pubkey,
        "dlc_offer": {
            "description": "DLC contract offer would be here"
        }
    })).into_response()
}

/// Get lottery draw result
#[utoipa::path(
    get,
    path = "/api/lotteries/{id}/draw",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)")
    ),
    responses(
        (status = 200, description = "Draw result with winning numbers")
    ),
    tag = "lotteries"
)]
pub async fn get_draw_result(
    State(db): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid lottery ID hex").into_response(),
    };

    match db.get_lottery_by_id(&id_bytes).await {
        Ok(Some(lottery)) => {
            if lottery.status != "completed" {
                return Json(serde_json::json!({
                    "status": lottery.status,
                    "message": "Draw not yet complete",
                    "draw_block": lottery.draw_block,
                })).into_response();
            }

            let winners = db.get_winners(&id_bytes).await.unwrap_or_default();

            Json(serde_json::json!({
                "status": "completed",
                "winning_numbers": lottery.winning_numbers,
                "total_pool": lottery.total_pool_sats,
                "winners": winners,
            })).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Lottery not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Get lottery winners
#[utoipa::path(
    get,
    path = "/api/lotteries/{id}/winners",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)")
    ),
    responses(
        (status = 200, description = "List of winners", body = Vec<Winner>)
    ),
    tag = "lotteries"
)]
pub async fn get_lottery_winners(
    State(db): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let id_bytes = match hex::decode(&id) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid lottery ID hex").into_response(),
    };

    match db.get_winners(&id_bytes).await {
        Ok(winners) => Json(winners).into_response(),
        Err(e) => {
            tracing::error!("Failed to get winners: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Claim prize
#[utoipa::path(
    post,
    path = "/api/lotteries/{id}/claim",
    params(
        ("id" = String, Path, description = "Lottery ID (hex)")
    ),
    request_body = ClaimPrizeRequest,
    responses(
        (status = 200, description = "Claim request with DLC settlement")
    ),
    tag = "lotteries"
)]
pub async fn claim_prize(
    State(_db): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ClaimPrizeRequest>,
) -> impl IntoResponse {
    // In production, this would verify the DLC signature and settle
    Json(serde_json::json!({
        "status": "pending",
        "message": "Processing claim with DLC settlement",
        "lottery_id": id,
        "ticket_id": req.ticket_id,
    }))
}

/// Get user's tickets
#[utoipa::path(
    get,
    path = "/api/my/tickets",
    params(
        ("pubkey" = String, Query, description = "Buyer public key (hex)"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "User's tickets", body = Vec<Ticket>)
    ),
    tag = "user"
)]
pub async fn get_my_tickets(
    State(db): State<AppState>,
    Query(params): Query<MyTicketsParams>,
) -> impl IntoResponse {
    let pubkey_bytes = match hex::decode(&params.pubkey) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid pubkey hex").into_response(),
    };

    let limit = params.limit.unwrap_or(50).min(100);

    match db.get_tickets_by_buyer(&pubkey_bytes, limit).await {
        Ok(tickets) => Json(tickets).into_response(),
        Err(e) => {
            tracing::error!("Failed to get user tickets: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct MyTicketsParams {
    pub pubkey: String,
    pub limit: Option<i64>,
}

/// Get prize tiers for lottery type
#[utoipa::path(
    get,
    path = "/api/prize-tiers/{lottery_type}",
    params(
        ("lottery_type" = i32, Path, description = "Lottery type (0=daily, 1=weekly, 2=jackpot)")
    ),
    responses(
        (status = 200, description = "Prize tier configuration", body = Vec<PrizeTier>)
    ),
    tag = "config"
)]
pub async fn get_prize_tiers(
    State(db): State<AppState>,
    Path(lottery_type): Path<i32>,
) -> impl IntoResponse {
    match db.get_prize_tiers(lottery_type).await {
        Ok(tiers) => Json(tiers).into_response(),
        Err(e) => {
            tracing::error!("Failed to get prize tiers: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Get history of completed lotteries
#[utoipa::path(
    get,
    path = "/api/history",
    params(
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "Completed lotteries", body = Vec<Lottery>)
    ),
    tag = "history"
)]
pub async fn get_history(
    State(db): State<AppState>,
    Query(params): Query<LimitParam>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(20).min(100);

    match db.get_lotteries(Some("completed"), limit).await {
        Ok(lotteries) => Json(lotteries).into_response(),
        Err(e) => {
            tracing::error!("Failed to get history: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

