//! Data models for Anchor Predictions

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub fn lottery_type_name(lt: i32) -> String {
    match lt {
        0 => "Daily".to_string(),
        1 => "Weekly".to_string(),
        2 => "Jackpot".to_string(),
        _ => format!("Unknown({})", lt),
    }
}

pub fn token_type_name(tt: i32) -> String {
    match tt {
        0 => "BTC".to_string(),
        1 => "Anchor Token".to_string(),
        _ => format!("Unknown({})", tt),
    }
}

/// Lottery
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Lottery {
    pub id: i32,
    pub lottery_id: String,
    pub lottery_type: i32,
    pub lottery_type_name: String,
    pub number_count: i32,
    pub number_max: i32,
    pub draw_block: i32,
    pub ticket_price_sats: i64,
    pub token_type: i32,
    pub token_type_name: String,
    pub oracle_pubkey: String,
    pub creator_pubkey: String,
    pub status: String,
    pub total_pool_sats: i64,
    pub ticket_count: i32,
    pub winning_numbers: Option<Vec<u8>>,
    pub created_at: String,
}

/// Ticket
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Ticket {
    pub id: i32,
    pub lottery_id: String,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub buyer_pubkey: String,
    pub numbers: Vec<u8>,
    pub amount_sats: i64,
    pub matching_numbers: i32,
    pub is_winner: bool,
    pub prize_tier: i32,
    pub prize_sats: i64,
    pub claimed: bool,
    pub created_at: String,
}

/// DLC Contract
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DlcContract {
    pub id: i32,
    pub lottery_id: String,
    pub ticket_id: i32,
    pub oracle_pubkey: String,
    pub buyer_pubkey: String,
    pub status: String,
    pub created_at: String,
}

/// Lottery stats
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LotteryStats {
    pub total_lotteries: i32,
    pub completed_lotteries: i32,
    pub total_tickets_sold: i32,
    pub total_volume_sats: i64,
    pub total_payouts_sats: i64,
    pub biggest_jackpot_sats: i64,
    pub active_lotteries: i32,
}

/// Prize tier
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PrizeTier {
    pub tier: i32,
    pub matches_required: i32,
    pub payout_percentage: f32,
    pub description: String,
}

/// Create lottery request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateLotteryRequest {
    pub lottery_type: i32,
    pub number_count: i32,
    pub number_max: i32,
    pub draw_block: i32,
    pub ticket_price_sats: i64,
    pub oracle_pubkey: String,
}

/// Buy ticket request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BuyTicketRequest {
    pub numbers: Vec<u8>,
    pub buyer_pubkey: String,
}

/// Claim prize request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ClaimPrizeRequest {
    pub ticket_id: i32,
}

/// Winner info
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Winner {
    pub ticket_id: i32,
    pub buyer_pubkey: String,
    pub numbers: Vec<u8>,
    pub matching_numbers: i32,
    pub prize_tier: i32,
    pub prize_sats: i64,
    pub claimed: bool,
}

