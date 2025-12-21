//! Data models for the Anchor Tokens protocol
//!
//! Defines token operations, encoding/decoding, and API response types.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Token operation types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[repr(u8)]
pub enum TokenOperationType {
    /// Deploy a new token
    Deploy = 0x01,
    /// Mint new tokens
    Mint = 0x02,
    /// Transfer tokens
    Transfer = 0x03,
    /// Burn tokens
    Burn = 0x04,
    /// Split tokens across outputs
    Split = 0x05,
}

impl TryFrom<u8> for TokenOperationType {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0x01 => Ok(TokenOperationType::Deploy),
            0x02 => Ok(TokenOperationType::Mint),
            0x03 => Ok(TokenOperationType::Transfer),
            0x04 => Ok(TokenOperationType::Burn),
            0x05 => Ok(TokenOperationType::Split),
            _ => Err("Invalid token operation type"),
        }
    }
}

/// Deploy flags
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeployFlags(pub u8);

impl DeployFlags {
    pub const FIXED_SUPPLY: u8 = 0x02;
    pub const BURNABLE: u8 = 0x04;

    pub fn is_fixed_supply(&self) -> bool {
        self.0 & Self::FIXED_SUPPLY != 0
    }

    pub fn is_burnable(&self) -> bool {
        self.0 & Self::BURNABLE != 0
    }
}

/// Token allocation for transfers
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TokenAllocation {
    pub output_index: u8,
    pub amount: u128,
}

/// Parsed token operation
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TokenOperation {
    /// Deploy a new token
    Deploy {
        ticker: String,
        decimals: u8,
        max_supply: u128,
        mint_limit: Option<u128>,
        flags: u8,
    },
    /// Mint new tokens to an output
    Mint {
        token_id: u64,
        amount: u128,
        output_index: u8,
    },
    /// Transfer tokens to outputs
    Transfer {
        token_id: u64,
        allocations: Vec<TokenAllocation>,
    },
    /// Burn tokens
    Burn {
        token_id: u64,
        amount: u128,
    },
    /// Split tokens across outputs
    Split {
        token_id: u64,
        allocations: Vec<TokenAllocation>,
    },
}

impl TokenOperation {

    /// Parse a token operation from bytes
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.is_empty() {
            return None;
        }

        let op_type = TokenOperationType::try_from(bytes[0]).ok()?;

        match op_type {
            TokenOperationType::Deploy => Self::parse_deploy(&bytes[1..]),
            TokenOperationType::Mint => Self::parse_mint(&bytes[1..]),
            TokenOperationType::Transfer => Self::parse_transfer(&bytes[1..]),
            TokenOperationType::Burn => Self::parse_burn(&bytes[1..]),
            TokenOperationType::Split => Self::parse_split(&bytes[1..]),
        }
    }

    /// Encode the token operation to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        match self {
            TokenOperation::Deploy {
                ticker,
                decimals,
                max_supply,
                mint_limit,
                flags,
            } => {
                let mut result = vec![TokenOperationType::Deploy as u8];
                let ticker_bytes = ticker.as_bytes();
                result.push(ticker_bytes.len() as u8);
                result.extend_from_slice(ticker_bytes);
                result.push(*decimals);
                result.extend_from_slice(&encode_varint(*max_supply));
                result.extend_from_slice(&encode_varint(mint_limit.unwrap_or(0)));
                result.push(*flags);
                result
            }
            TokenOperation::Mint {
                token_id,
                amount,
                output_index,
            } => {
                let mut result = vec![TokenOperationType::Mint as u8];
                result.extend_from_slice(&encode_varint(*token_id as u128));
                result.extend_from_slice(&encode_varint(*amount));
                result.push(*output_index);
                result
            }
            TokenOperation::Transfer {
                token_id,
                allocations,
            } => {
                let mut result = vec![TokenOperationType::Transfer as u8];
                result.extend_from_slice(&encode_varint(*token_id as u128));
                result.push(allocations.len() as u8);
                for alloc in allocations {
                    result.push(alloc.output_index);
                    result.extend_from_slice(&encode_varint(alloc.amount));
                }
                result
            }
            TokenOperation::Burn { token_id, amount } => {
                let mut result = vec![TokenOperationType::Burn as u8];
                result.extend_from_slice(&encode_varint(*token_id as u128));
                result.extend_from_slice(&encode_varint(*amount));
                result
            }
            TokenOperation::Split {
                token_id,
                allocations,
            } => {
                let mut result = vec![TokenOperationType::Split as u8];
                result.extend_from_slice(&encode_varint(*token_id as u128));
                result.push(allocations.len() as u8);
                for alloc in allocations {
                    result.push(alloc.output_index);
                    result.extend_from_slice(&encode_varint(alloc.amount));
                }
                result
            }
        }
    }

    fn parse_deploy(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 4 {
            return None;
        }

        let ticker_len = bytes[0] as usize;
        if bytes.len() < 1 + ticker_len + 3 {
            return None;
        }

        let ticker = String::from_utf8(bytes[1..1 + ticker_len].to_vec()).ok()?;
        let mut offset = 1 + ticker_len;

        let decimals = bytes[offset];
        offset += 1;

        let (max_supply, bytes_read) = decode_varint(&bytes[offset..])?;
        offset += bytes_read;

        let (mint_limit_raw, bytes_read) = decode_varint(&bytes[offset..])?;
        offset += bytes_read;

        let flags = if offset < bytes.len() {
            bytes[offset]
        } else {
            0
        };

        Some(TokenOperation::Deploy {
            ticker,
            decimals,
            max_supply,
            mint_limit: if mint_limit_raw > 0 {
                Some(mint_limit_raw)
            } else {
                None
            },
            flags,
        })
    }

    fn parse_mint(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 3 {
            return None;
        }

        let mut offset = 0;

        let (token_id, bytes_read) = decode_varint(bytes)?;
        offset += bytes_read;

        let (amount, bytes_read) = decode_varint(&bytes[offset..])?;
        offset += bytes_read;

        let output_index = bytes.get(offset).copied()?;

        Some(TokenOperation::Mint {
            token_id: token_id as u64,
            amount,
            output_index,
        })
    }

    fn parse_transfer(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 3 {
            return None;
        }

        let mut offset = 0;

        let (token_id, bytes_read) = decode_varint(bytes)?;
        offset += bytes_read;

        let count = bytes.get(offset).copied()? as usize;
        offset += 1;

        let mut allocations = Vec::with_capacity(count);
        for _ in 0..count {
            let output_index = bytes.get(offset).copied()?;
            offset += 1;

            let (amount, bytes_read) = decode_varint(&bytes[offset..])?;
            offset += bytes_read;

            allocations.push(TokenAllocation {
                output_index,
                amount,
            });
        }

        Some(TokenOperation::Transfer {
            token_id: token_id as u64,
            allocations,
        })
    }

    fn parse_burn(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 2 {
            return None;
        }

        let mut offset = 0;

        let (token_id, bytes_read) = decode_varint(bytes)?;
        offset += bytes_read;

        let (amount, _) = decode_varint(&bytes[offset..])?;

        Some(TokenOperation::Burn {
            token_id: token_id as u64,
            amount,
        })
    }

    fn parse_split(bytes: &[u8]) -> Option<Self> {
        let transfer = Self::parse_transfer(bytes)?;
        match transfer {
            TokenOperation::Transfer {
                token_id,
                allocations,
            } => Some(TokenOperation::Split {
                token_id,
                allocations,
            }),
            _ => None,
        }
    }
}

// ============================================================================
// Varint (LEB128) Encoding/Decoding
// ============================================================================

/// Encode a u128 value to LEB128 varint
pub fn encode_varint(mut value: u128) -> Vec<u8> {
    let mut bytes = Vec::new();

    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;

        if value != 0 {
            byte |= 0x80;
        }

        bytes.push(byte);

        if value == 0 {
            break;
        }
    }

    bytes
}

/// Decode a LEB128 varint from bytes
/// Returns (value, bytes_read)
pub fn decode_varint(bytes: &[u8]) -> Option<(u128, usize)> {
    let mut result: u128 = 0;
    let mut shift = 0;
    let mut bytes_read = 0;

    for byte in bytes.iter() {
        bytes_read += 1;

        result |= ((byte & 0x7F) as u128) << shift;

        if byte & 0x80 == 0 {
            return Some((result, bytes_read));
        }

        shift += 7;

        if shift > 128 {
            return None; // Overflow protection
        }
    }

    None // Incomplete varint
}

// ============================================================================
// Ticker Validation
// ============================================================================

/// Validate a token ticker
pub fn is_valid_ticker(ticker: &str) -> bool {
    if ticker.is_empty() || ticker.len() > 32 {
        return false;
    }

    ticker.chars().all(|c| c.is_ascii_alphanumeric())
}

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

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_varint_roundtrip() {
        let test_values: Vec<u128> = vec![
            0,
            1,
            127,
            128,
            255,
            256,
            16383,
            16384,
            1_000_000,
            u64::MAX as u128,
            u128::MAX,
        ];

        for value in test_values {
            let encoded = encode_varint(value);
            let (decoded, _) = decode_varint(&encoded).unwrap();
            assert_eq!(value, decoded, "Varint roundtrip failed for {}", value);
        }
    }

    #[test]
    fn test_varint_size() {
        assert_eq!(encode_varint(0).len(), 1);
        assert_eq!(encode_varint(127).len(), 1);
        assert_eq!(encode_varint(128).len(), 2);
        assert_eq!(encode_varint(16383).len(), 2);
        assert_eq!(encode_varint(16384).len(), 3);
    }

    #[test]
    fn test_deploy_roundtrip() {
        let op = TokenOperation::Deploy {
            ticker: "TEST".to_string(),
            decimals: 8,
            max_supply: 21_000_000_00000000,
            mint_limit: Some(1000_00000000),
            flags: DeployFlags::OPEN_MINT | DeployFlags::BURNABLE,
        };

        let bytes = op.to_bytes();
        let parsed = TokenOperation::from_bytes(&bytes).unwrap();

        assert_eq!(op, parsed);
    }

    #[test]
    fn test_mint_roundtrip() {
        let op = TokenOperation::Mint {
            token_id: 12345,
            amount: 1_000_000,
            output_index: 0,
        };

        let bytes = op.to_bytes();
        let parsed = TokenOperation::from_bytes(&bytes).unwrap();

        assert_eq!(op, parsed);
    }

    #[test]
    fn test_transfer_roundtrip() {
        let op = TokenOperation::Transfer {
            token_id: 42,
            allocations: vec![
                TokenAllocation {
                    output_index: 0,
                    amount: 500,
                },
                TokenAllocation {
                    output_index: 1,
                    amount: 300,
                },
                TokenAllocation {
                    output_index: 2,
                    amount: 200,
                },
            ],
        };

        let bytes = op.to_bytes();
        let parsed = TokenOperation::from_bytes(&bytes).unwrap();

        assert_eq!(op, parsed);
    }

    #[test]
    fn test_burn_roundtrip() {
        let op = TokenOperation::Burn {
            token_id: 99,
            amount: 5000,
        };

        let bytes = op.to_bytes();
        let parsed = TokenOperation::from_bytes(&bytes).unwrap();

        assert_eq!(op, parsed);
    }

    #[test]
    fn test_valid_ticker() {
        assert!(is_valid_ticker("BTC"));
        assert!(is_valid_ticker("TEST123"));
        assert!(is_valid_ticker("ANCHOR"));

        assert!(!is_valid_ticker(""));
        assert!(!is_valid_ticker("A".repeat(33).as_str()));
        assert!(!is_valid_ticker("TEST-TOKEN"));
        assert!(!is_valid_ticker("TEST TOKEN"));
    }
}
