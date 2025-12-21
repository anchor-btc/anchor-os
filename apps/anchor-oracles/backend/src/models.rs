//! Data models for Anchor Oracles

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Oracle category flags
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OracleCategories(pub i32);

impl OracleCategories {
    pub const BLOCK: i32 = 1;
    pub const PRICES: i32 = 2;
    pub const SPORTS: i32 = 4;
    pub const WEATHER: i32 = 8;
    pub const ELECTIONS: i32 = 16;
    pub const RANDOM: i32 = 32;
    pub const CUSTOM: i32 = 64;

    pub fn has(&self, category: i32) -> bool {
        self.0 & category != 0
    }

    pub fn names(&self) -> Vec<&'static str> {
        let mut names = Vec::new();
        if self.has(Self::BLOCK) { names.push("Block"); }
        if self.has(Self::PRICES) { names.push("Prices"); }
        if self.has(Self::SPORTS) { names.push("Sports"); }
        if self.has(Self::WEATHER) { names.push("Weather"); }
        if self.has(Self::ELECTIONS) { names.push("Elections"); }
        if self.has(Self::RANDOM) { names.push("Random"); }
        if self.has(Self::CUSTOM) { names.push("Custom"); }
        names
    }
}

/// Oracle registration/profile
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Oracle {
    pub id: i32,
    pub pubkey: String,
    pub name: String,
    pub description: Option<String>,
    pub categories: i32,
    pub category_names: Vec<String>,
    pub stake_sats: i64,
    pub status: String,
    pub registered_at: Option<i32>,
    pub total_attestations: i32,
    pub successful_attestations: i32,
    pub disputed_attestations: i32,
    pub reputation_score: f32,
    pub created_at: String,
}

/// Oracle attestation
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Attestation {
    pub id: i32,
    pub oracle_id: i32,
    pub oracle_name: Option<String>,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub category: i32,
    pub category_name: String,
    pub event_id: String,
    pub event_description: Option<String>,
    pub outcome_data: String,
    pub schnorr_signature: String,
    pub status: String,
    pub created_at: String,
}

/// Oracle dispute
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Dispute {
    pub id: i32,
    pub attestation_id: i32,
    pub disputer_pubkey: String,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub reason: i32,
    pub reason_name: String,
    pub stake_sats: i64,
    pub status: String,
    pub resolution: Option<String>,
    pub created_at: String,
}

/// Event request for oracles to fulfill
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EventRequest {
    pub id: i32,
    pub event_id: String,
    pub category: i32,
    pub category_name: String,
    pub description: String,
    pub resolution_block: Option<i32>,
    pub bounty_sats: i64,
    pub status: String,
    pub fulfilled_by: Option<i32>,
    pub created_at: String,
}

/// Oracle stats summary
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OracleStats {
    pub total_oracles: i64,
    pub active_oracles: i64,
    pub total_staked: i64,
    pub avg_reputation: f64,
    pub total_attestations: i64,
    pub pending_events: i64,
    pub active_disputes: i64,
}

/// Category info
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CategoryInfo {
    pub id: i32,
    pub name: String,
    pub description: String,
    pub oracle_count: i64,
    pub attestation_count: i64,
}

/// Request to register an oracle
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RegisterOracleRequest {
    pub pubkey: String,
    pub name: String,
    pub categories: i32,
}

/// Request to submit attestation
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct SubmitAttestationRequest {
    pub oracle_pubkey: String,
    pub event_id: String,
    pub category: i32,
}

/// Request to create event request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateEventRequest {
    pub category: i32,
    pub description: String,
    pub resolution_block: Option<i32>,
}

pub fn category_name(category: i32) -> String {
    match category {
        1 => "Block".to_string(),
        2 => "Prices".to_string(),
        4 => "Sports".to_string(),
        8 => "Weather".to_string(),
        16 => "Elections".to_string(),
        32 => "Random".to_string(),
        64 => "Custom".to_string(),
        _ => format!("Unknown({})", category),
    }
}

pub fn dispute_reason_name(reason: i32) -> String {
    match reason {
        1 => "Incorrect outcome".to_string(),
        2 => "Premature attestation".to_string(),
        3 => "Invalid signature".to_string(),
        4 => "Oracle not authorized".to_string(),
        _ => format!("Unknown({})", reason),
    }
}

