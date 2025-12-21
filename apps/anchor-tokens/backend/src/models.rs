//! Data models for the Anchor Tokens API
//!
//! This module re-exports Token protocol types from `anchor-specs` and defines
//! API-specific response types for the Anchor Tokens service.
//!
//! ## Protocol Types (from anchor-specs)
//!
//! The core Token protocol types are defined in `anchor-specs::token`:
//! - `TokenSpec` - Full token specification with operation
//! - `TokenOperation` - Deploy, Mint, Transfer, Burn, Split
//! - `TokenAllocation` - Allocation for transfers/splits
//! - `DeployFlags` - Token deployment flags
//!
//! ## API Types (defined here)
//!
//! API request/response types specific to the Anchor Tokens backend service.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

// Re-export Token types from anchor-specs
pub use anchor_specs::token::{
    TokenSpec,
    TokenOperation,
    TokenAllocation,
    DeployFlags,
    is_valid_ticker,
};

// Re-export for tests
#[cfg(test)]
pub use anchor_specs::token::{encode_varint, decode_varint};

// ============================================================================
// API Response Types
// ============================================================================

/// Token information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub id: i32,
    pub ticker: String,
    pub deploy_txid: String,
    pub deploy_vout: i32,
    pub decimals: i16,
    pub max_supply: String,
    pub mint_limit: Option<String>,
    pub minted_supply: String,
    pub burned_supply: String,
    pub circulating_supply: String,
    pub holder_count: i32,
    pub tx_count: i32,
    pub flags: i16,
    pub is_open_mint: bool,
    pub is_burnable: bool,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Token UTXO
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenUtxo {
    pub id: i32,
    pub token_id: i32,
    pub ticker: String,
    pub txid: String,
    pub vout: i32,
    pub amount: String,
    pub decimals: i16,
    pub owner_address: Option<String>,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub is_spent: bool,
}

/// Token balance for an address
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenBalance {
    pub token_id: i32,
    pub ticker: String,
    pub decimals: i16,
    pub balance: String,
    pub utxo_count: i32,
}

/// Token operation history entry
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenOperationResponse {
    pub id: i32,
    pub token_id: i32,
    pub ticker: String,
    pub operation: String,
    pub txid: String,
    pub vout: i32,
    pub amount: Option<String>,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Token holder
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenHolder {
    pub address: String,
    pub balance: String,
    pub percentage: f64,
    pub utxo_count: i32,
}

/// Token statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenStats {
    pub total_tokens: i64,
    pub total_holders: i64,
    pub total_operations: i64,
    pub last_block_height: Option<i32>,
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

/// Pagination parameters
#[derive(Debug, Clone, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    pub search: Option<String>,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    50
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

// ============================================================================
// Transaction Request Types
// ============================================================================

/// Deploy token request
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeployTokenRequest {
    pub ticker: String,
    pub decimals: u8,
    pub max_supply: String,
    pub mint_limit: Option<String>,
    #[serde(default)]
    pub open_mint: bool,
    #[serde(default)]
    pub burnable: bool,
    pub carrier: Option<u8>,
    pub fee_rate: Option<f64>,
}

/// Mint tokens request
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MintTokenRequest {
    pub ticker: String,
    pub amount: String,
    pub carrier: Option<u8>,
    pub fee_rate: Option<f64>,
}

/// Transfer tokens request
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TransferTokenRequest {
    pub ticker: String,
    pub allocations: Vec<AllocationInput>,
    pub carrier: Option<u8>,
    pub fee_rate: Option<f64>,
}

/// Allocation input for transfers
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AllocationInput {
    pub address: String,
    pub amount: String,
}

/// Burn tokens request
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BurnTokenRequest {
    pub ticker: String,
    pub amount: String,
    pub carrier: Option<u8>,
    pub fee_rate: Option<f64>,
}

/// Create transaction response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTxResponse {
    pub txid: String,
    pub vout: i32,
    pub hex: String,
    pub carrier: i32,
    pub carrier_name: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_varint_roundtrip() {
        let test_values: Vec<u128> = vec![
            0, 1, 127, 128, 255, 256, 16383, 16384, 1_000_000,
            u64::MAX as u128,
        ];

        for value in test_values {
            let encoded = encode_varint(value);
            let (decoded, _) = decode_varint(&encoded).unwrap();
            assert_eq!(value, decoded, "Varint roundtrip failed for {}", value);
        }
    }

    #[test]
    fn test_valid_ticker() {
        assert!(is_valid_ticker("BTC"));
        assert!(is_valid_ticker("TEST123"));
        assert!(is_valid_ticker("ANCHOR"));

        assert!(!is_valid_ticker(""));
        assert!(!is_valid_ticker(&"A".repeat(33)));
        assert!(!is_valid_ticker("TEST-TOKEN"));
        assert!(!is_valid_ticker("TEST TOKEN"));
    }

    #[test]
    fn test_deploy_flags() {
        let flags = DeployFlags::new().with_open_mint().with_burnable();
        assert!(flags.is_open_mint());
        assert!(flags.is_burnable());
    }
}
