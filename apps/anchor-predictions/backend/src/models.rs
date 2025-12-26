//! Data models for Anchor Predictions - Binary Prediction Markets

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Outcome names
pub fn outcome_name(outcome: i16) -> String {
    match outcome {
        0 => "NO".to_string(),
        1 => "YES".to_string(),
        _ => format!("Unknown({})", outcome),
    }
}

/// Resolution status names
pub fn resolution_name(resolution: Option<i16>) -> String {
    match resolution {
        None => "Pending".to_string(),
        Some(0) => "NO".to_string(),
        Some(1) => "YES".to_string(),
        Some(2) => "Invalid".to_string(),
        Some(n) => format!("Unknown({})", n),
    }
}

/// Prediction Market
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Market {
    pub id: i32,
    pub market_id: String,
    pub question: String,
    pub description: Option<String>,
    pub resolution_block: i32,
    pub oracle_pubkey: String,
    pub creator_pubkey: String,
    pub status: String,
    pub resolution: Option<i16>,
    pub resolution_name: String,
    // AMM State
    pub yes_pool: i64,
    pub no_pool: i64,
    pub yes_price: f64,
    pub no_price: f64,
    // Volume
    pub total_volume_sats: i64,
    pub total_yes_sats: i64,
    pub total_no_sats: i64,
    pub position_count: i32,
    // Timestamps
    pub created_at: String,
}

/// User Position (bet on a market)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Position {
    pub id: i32,
    pub market_id: String,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub user_pubkey: String,
    pub outcome: i16,
    pub outcome_name: String,
    pub amount_sats: i64,
    pub shares: i64,
    pub avg_price: f32,
    pub is_winner: bool,
    pub payout_sats: i64,
    pub claimed: bool,
    pub created_at: String,
}

/// Market Statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MarketStats {
    pub total_markets: i32,
    pub active_markets: i32,
    pub resolved_markets: i32,
    pub total_positions: i32,
    pub total_volume_sats: i64,
    pub total_payouts_sats: i64,
    pub largest_market_sats: i64,
}

/// Create Market Request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateMarketRequest {
    pub question: String,
    pub description: Option<String>,
    pub resolution_block: i32,
    pub oracle_pubkey: String,
    pub initial_liquidity_sats: Option<i64>,
}

/// Place Bet Request
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct PlaceBetRequest {
    pub outcome: i16, // 0=NO, 1=YES
    pub amount_sats: i64,
    pub user_pubkey: String,
    /// Bitcoin address for the bet transaction output (required for real tx)
    pub bet_address: Option<String>,
    pub min_shares: Option<i64>, // Slippage protection
}

/// Place Bet Response with quote
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PlaceBetQuote {
    pub outcome: i16,
    pub outcome_name: String,
    pub amount_sats: i64,
    pub shares_out: i64,
    pub avg_price: f64,
    pub price_impact: f64,
    pub new_yes_price: f64,
    pub new_no_price: f64,
}

/// Claim Winnings Request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ClaimWinningsRequest {
    pub position_id: i32,
    /// Bitcoin address to receive the payout
    pub payout_address: String,
}

/// Winner info
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Winner {
    pub position_id: i32,
    pub user_pubkey: String,
    pub outcome: i16,
    pub outcome_name: String,
    pub amount_sats: i64,
    pub shares: i64,
    pub payout_sats: i64,
    pub claimed: bool,
}

/// Market with calculated AMM prices
impl Market {
    pub fn calculate_prices(yes_pool: i64, no_pool: i64) -> (f64, f64) {
        let total = yes_pool + no_pool;
        if total == 0 {
            return (0.5, 0.5);
        }
        let yes_price = no_pool as f64 / total as f64;
        let no_price = yes_pool as f64 / total as f64;
        (yes_price, no_price)
    }
}
