//! Kind 20: Token Specification
//!
//! The Token kind enables fungible token operations on Bitcoin using the ANCHOR protocol.
//! Supports deployment, minting, transfers, burns, and splits.
//!
//! ## Operations
//!
//! | Operation | Value | Description |
//! |-----------|-------|-------------|
//! | DEPLOY | 0x01 | Deploy a new token |
//! | MINT | 0x02 | Mint new tokens |
//! | TRANSFER | 0x03 | Transfer tokens |
//! | BURN | 0x04 | Burn tokens |
//! | SPLIT | 0x05 | Split tokens across outputs |
//!
//! ## Payload Format
//!
//! Each operation has a different payload format. See the operation-specific
//! documentation for details.

use crate::error::{Result, SpecError};
use crate::validation::{AnchorableSpec, KindSpec, OwnedSpec};
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};

/// Maximum ticker length
pub const MAX_TICKER_LENGTH: usize = 32;

/// Maximum decimals
pub const MAX_DECIMALS: u8 = 18;

/// Token operation types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
    type Error = SpecError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(TokenOperationType::Deploy),
            0x02 => Ok(TokenOperationType::Mint),
            0x03 => Ok(TokenOperationType::Transfer),
            0x04 => Ok(TokenOperationType::Burn),
            0x05 => Ok(TokenOperationType::Split),
            _ => Err(SpecError::InvalidTokenOperation(value)),
        }
    }
}

/// Deploy flags
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct DeployFlags(pub u8);

impl DeployFlags {
    /// Open mint - anyone can mint
    pub const OPEN_MINT: u8 = 0x01;
    /// Fixed supply - cannot mint after initial
    pub const FIXED_SUPPLY: u8 = 0x02;
    /// Burnable - tokens can be burned
    pub const BURNABLE: u8 = 0x04;

    /// Create new flags
    pub fn new() -> Self {
        Self(0)
    }

    /// Set open mint flag
    pub fn with_open_mint(mut self) -> Self {
        self.0 |= Self::OPEN_MINT;
        self
    }

    /// Set fixed supply flag
    pub fn with_fixed_supply(mut self) -> Self {
        self.0 |= Self::FIXED_SUPPLY;
        self
    }

    /// Set burnable flag
    pub fn with_burnable(mut self) -> Self {
        self.0 |= Self::BURNABLE;
        self
    }

    /// Check if open mint is set
    pub fn is_open_mint(&self) -> bool {
        self.0 & Self::OPEN_MINT != 0
    }

    /// Check if fixed supply is set
    pub fn is_fixed_supply(&self) -> bool {
        self.0 & Self::FIXED_SUPPLY != 0
    }

    /// Check if burnable is set
    pub fn is_burnable(&self) -> bool {
        self.0 & Self::BURNABLE != 0
    }
}

/// Token allocation for transfers and splits
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TokenAllocation {
    /// Output index in the transaction
    pub output_index: u8,
    /// Amount to allocate
    pub amount: u128,
}

impl TokenAllocation {
    /// Create a new allocation
    pub fn new(output_index: u8, amount: u128) -> Self {
        Self {
            output_index,
            amount,
        }
    }
}

/// Token operation (the spec variant)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TokenOperation {
    /// Deploy a new token
    Deploy {
        ticker: String,
        decimals: u8,
        max_supply: u128,
        mint_limit: Option<u128>,
        flags: u8,
    },
    /// Mint new tokens
    Mint {
        token_id: u64,
        amount: u128,
        output_index: u8,
    },
    /// Transfer tokens
    Transfer {
        token_id: u64,
        allocations: Vec<TokenAllocation>,
    },
    /// Burn tokens
    Burn { token_id: u64, amount: u128 },
    /// Split tokens across outputs
    Split {
        token_id: u64,
        allocations: Vec<TokenAllocation>,
    },
}

impl TokenOperation {
    /// Get the operation type
    pub fn operation_type(&self) -> TokenOperationType {
        match self {
            TokenOperation::Deploy { .. } => TokenOperationType::Deploy,
            TokenOperation::Mint { .. } => TokenOperationType::Mint,
            TokenOperation::Transfer { .. } => TokenOperationType::Transfer,
            TokenOperation::Burn { .. } => TokenOperationType::Burn,
            TokenOperation::Split { .. } => TokenOperationType::Split,
        }
    }

    /// Create a deploy operation
    pub fn deploy(
        ticker: impl Into<String>,
        decimals: u8,
        max_supply: u128,
        mint_limit: Option<u128>,
        flags: DeployFlags,
    ) -> Self {
        TokenOperation::Deploy {
            ticker: ticker.into().to_uppercase(),
            decimals,
            max_supply,
            mint_limit,
            flags: flags.0,
        }
    }

    /// Create a mint operation
    pub fn mint(token_id: u64, amount: u128, output_index: u8) -> Self {
        TokenOperation::Mint {
            token_id,
            amount,
            output_index,
        }
    }

    /// Create a transfer operation
    pub fn transfer(token_id: u64, allocations: Vec<TokenAllocation>) -> Self {
        TokenOperation::Transfer {
            token_id,
            allocations,
        }
    }

    /// Create a burn operation
    pub fn burn(token_id: u64, amount: u128) -> Self {
        TokenOperation::Burn { token_id, amount }
    }

    /// Create a split operation
    pub fn split(token_id: u64, allocations: Vec<TokenAllocation>) -> Self {
        TokenOperation::Split {
            token_id,
            allocations,
        }
    }
}

/// Token specification (Kind 20)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TokenSpec {
    pub operation: TokenOperation,
}

impl TokenSpec {
    /// Create a new token spec
    pub fn new(operation: TokenOperation) -> Self {
        Self { operation }
    }

    /// Create a deploy spec
    pub fn deploy(
        ticker: impl Into<String>,
        decimals: u8,
        max_supply: u128,
        mint_limit: Option<u128>,
        flags: DeployFlags,
    ) -> Self {
        Self::new(TokenOperation::deploy(
            ticker, decimals, max_supply, mint_limit, flags,
        ))
    }

    /// Create a mint spec
    pub fn mint(token_id: u64, amount: u128, output_index: u8) -> Self {
        Self::new(TokenOperation::mint(token_id, amount, output_index))
    }

    /// Create a transfer spec
    pub fn transfer(token_id: u64, allocations: Vec<TokenAllocation>) -> Self {
        Self::new(TokenOperation::transfer(token_id, allocations))
    }

    /// Create a burn spec
    pub fn burn(token_id: u64, amount: u128) -> Self {
        Self::new(TokenOperation::burn(token_id, amount))
    }

    /// Create a split spec
    pub fn split(token_id: u64, allocations: Vec<TokenAllocation>) -> Self {
        Self::new(TokenOperation::split(token_id, allocations))
    }
}

impl KindSpec for TokenSpec {
    const KIND_ID: u8 = 20;
    const KIND_NAME: &'static str = "Token";

    fn from_bytes(body: &[u8]) -> Result<Self> {
        if body.is_empty() {
            return Err(SpecError::PayloadTooShort {
                expected: 1,
                actual: 0,
            });
        }

        let op_type = TokenOperationType::try_from(body[0])?;
        let operation = match op_type {
            TokenOperationType::Deploy => parse_deploy(&body[1..])?,
            TokenOperationType::Mint => parse_mint(&body[1..])?,
            TokenOperationType::Transfer => parse_transfer(&body[1..])?,
            TokenOperationType::Burn => parse_burn(&body[1..])?,
            TokenOperationType::Split => parse_split(&body[1..])?,
        };

        Ok(Self { operation })
    }

    fn to_bytes(&self) -> Vec<u8> {
        match &self.operation {
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

    fn validate(&self) -> Result<()> {
        match &self.operation {
            TokenOperation::Deploy {
                ticker,
                decimals,
                max_supply,
                ..
            } => {
                validate_ticker(ticker)?;
                if *decimals > MAX_DECIMALS {
                    return Err(SpecError::InvalidDecimals(*decimals));
                }
                if *max_supply == 0 {
                    return Err(SpecError::InvalidAmount(
                        "Max supply cannot be zero".to_string(),
                    ));
                }
            }
            TokenOperation::Mint { amount, .. } => {
                if *amount == 0 {
                    return Err(SpecError::InvalidAmount(
                        "Mint amount cannot be zero".to_string(),
                    ));
                }
            }
            TokenOperation::Transfer { allocations, .. }
            | TokenOperation::Split { allocations, .. } => {
                if allocations.is_empty() {
                    return Err(SpecError::InvalidFormat(
                        "Allocations cannot be empty".to_string(),
                    ));
                }
                for alloc in allocations {
                    if alloc.amount == 0 {
                        return Err(SpecError::InvalidAmount(
                            "Allocation amount cannot be zero".to_string(),
                        ));
                    }
                }
            }
            TokenOperation::Burn { amount, .. } => {
                if *amount == 0 {
                    return Err(SpecError::InvalidAmount(
                        "Burn amount cannot be zero".to_string(),
                    ));
                }
            }
        }
        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        // Token uses UTXO-based tracking, so OP_RETURN works but WitnessData is preferred
        &[
            CarrierType::WitnessData,
            CarrierType::Inscription,
            CarrierType::Stamps,
            CarrierType::OpReturn,
        ]
    }

    fn recommended_carrier() -> CarrierType {
        CarrierType::WitnessData
    }
}

impl AnchorableSpec for TokenSpec {
    fn requires_anchor(&self) -> bool {
        // Mint, transfer, burn, split all require anchor to token UTXO
        !matches!(self.operation, TokenOperation::Deploy { .. })
    }
}

impl OwnedSpec for TokenSpec {}

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
pub fn decode_varint(bytes: &[u8]) -> Result<(u128, usize)> {
    let mut result: u128 = 0;
    let mut shift = 0;
    let mut bytes_read = 0;

    for byte in bytes.iter() {
        bytes_read += 1;
        result |= ((byte & 0x7F) as u128) << shift;

        if byte & 0x80 == 0 {
            return Ok((result, bytes_read));
        }

        shift += 7;
        if shift > 128 {
            return Err(SpecError::InvalidFormat("Varint overflow".to_string()));
        }
    }

    Err(SpecError::InvalidFormat("Incomplete varint".to_string()))
}

// ============================================================================
// Parsing Functions
// ============================================================================

fn parse_deploy(bytes: &[u8]) -> Result<TokenOperation> {
    if bytes.len() < 4 {
        return Err(SpecError::PayloadTooShort {
            expected: 4,
            actual: bytes.len(),
        });
    }

    let ticker_len = bytes[0] as usize;
    if bytes.len() < 1 + ticker_len + 3 {
        return Err(SpecError::PayloadTooShort {
            expected: 1 + ticker_len + 3,
            actual: bytes.len(),
        });
    }

    let ticker = String::from_utf8(bytes[1..1 + ticker_len].to_vec())?;
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

    Ok(TokenOperation::Deploy {
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

fn parse_mint(bytes: &[u8]) -> Result<TokenOperation> {
    if bytes.len() < 3 {
        return Err(SpecError::PayloadTooShort {
            expected: 3,
            actual: bytes.len(),
        });
    }

    let mut offset = 0;

    let (token_id, bytes_read) = decode_varint(bytes)?;
    offset += bytes_read;

    let (amount, bytes_read) = decode_varint(&bytes[offset..])?;
    offset += bytes_read;

    let output_index = bytes
        .get(offset)
        .copied()
        .ok_or_else(|| SpecError::PayloadTooShort {
            expected: offset + 1,
            actual: bytes.len(),
        })?;

    Ok(TokenOperation::Mint {
        token_id: token_id as u64,
        amount,
        output_index,
    })
}

fn parse_transfer(bytes: &[u8]) -> Result<TokenOperation> {
    if bytes.len() < 3 {
        return Err(SpecError::PayloadTooShort {
            expected: 3,
            actual: bytes.len(),
        });
    }

    let mut offset = 0;

    let (token_id, bytes_read) = decode_varint(bytes)?;
    offset += bytes_read;

    let count = bytes
        .get(offset)
        .copied()
        .ok_or_else(|| SpecError::PayloadTooShort {
            expected: offset + 1,
            actual: bytes.len(),
        })? as usize;
    offset += 1;

    let mut allocations = Vec::with_capacity(count);
    for _ in 0..count {
        let output_index =
            bytes
                .get(offset)
                .copied()
                .ok_or_else(|| SpecError::PayloadTooShort {
                    expected: offset + 1,
                    actual: bytes.len(),
                })?;
        offset += 1;

        let (amount, bytes_read) = decode_varint(&bytes[offset..])?;
        offset += bytes_read;

        allocations.push(TokenAllocation {
            output_index,
            amount,
        });
    }

    Ok(TokenOperation::Transfer {
        token_id: token_id as u64,
        allocations,
    })
}

fn parse_burn(bytes: &[u8]) -> Result<TokenOperation> {
    if bytes.len() < 2 {
        return Err(SpecError::PayloadTooShort {
            expected: 2,
            actual: bytes.len(),
        });
    }

    let mut offset = 0;

    let (token_id, bytes_read) = decode_varint(bytes)?;
    offset += bytes_read;

    let (amount, _) = decode_varint(&bytes[offset..])?;

    Ok(TokenOperation::Burn {
        token_id: token_id as u64,
        amount,
    })
}

fn parse_split(bytes: &[u8]) -> Result<TokenOperation> {
    let transfer = parse_transfer(bytes)?;
    match transfer {
        TokenOperation::Transfer {
            token_id,
            allocations,
        } => Ok(TokenOperation::Split {
            token_id,
            allocations,
        }),
        _ => Err(SpecError::InvalidFormat(
            "Unexpected operation type".to_string(),
        )),
    }
}

// ============================================================================
// Validation Functions
// ============================================================================

/// Validate a token ticker
pub fn validate_ticker(ticker: &str) -> Result<()> {
    if ticker.is_empty() {
        return Err(SpecError::InvalidTicker(
            "Ticker cannot be empty".to_string(),
        ));
    }
    if ticker.len() > MAX_TICKER_LENGTH {
        return Err(SpecError::InvalidTicker(format!(
            "Ticker too long: {} chars (max {})",
            ticker.len(),
            MAX_TICKER_LENGTH
        )));
    }
    if !ticker.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err(SpecError::InvalidTicker(
            "Ticker must be alphanumeric".to_string(),
        ));
    }
    Ok(())
}

/// Check if a ticker is valid
pub fn is_valid_ticker(ticker: &str) -> bool {
    validate_ticker(ticker).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_varint_roundtrip() {
        let values: Vec<u128> = vec![
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
        ];

        for value in values {
            let encoded = encode_varint(value);
            let (decoded, _) = decode_varint(&encoded).unwrap();
            assert_eq!(value, decoded, "Varint roundtrip failed for {}", value);
        }
    }

    #[test]
    fn test_deploy_roundtrip() {
        let spec = TokenSpec::deploy(
            "TEST",
            8,
            2_100_000_000_000_000,
            Some(100_000_000_000),
            DeployFlags::new().with_open_mint().with_burnable(),
        );

        let bytes = spec.to_bytes();
        let parsed = TokenSpec::from_bytes(&bytes).unwrap();

        assert_eq!(spec, parsed);
    }

    #[test]
    fn test_transfer_roundtrip() {
        let spec = TokenSpec::transfer(
            42,
            vec![
                TokenAllocation::new(0, 500),
                TokenAllocation::new(1, 300),
                TokenAllocation::new(2, 200),
            ],
        );

        let bytes = spec.to_bytes();
        let parsed = TokenSpec::from_bytes(&bytes).unwrap();

        assert_eq!(spec, parsed);
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
        assert!(!flags.is_fixed_supply());
        assert!(flags.is_burnable());
    }

    #[test]
    fn test_requires_anchor() {
        let deploy = TokenSpec::deploy("TEST", 8, 1000000, None, DeployFlags::new());
        assert!(!deploy.requires_anchor());

        let mint = TokenSpec::mint(1, 1000, 0);
        assert!(mint.requires_anchor());

        let transfer = TokenSpec::transfer(1, vec![TokenAllocation::new(0, 100)]);
        assert!(transfer.requires_anchor());
    }
}
