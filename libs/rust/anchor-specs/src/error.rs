//! Error types for ANCHOR specs

use thiserror::Error;

/// Errors that can occur when parsing, validating, or encoding specs
#[derive(Debug, Error)]
pub enum SpecError {
    // ========================================================================
    // General Errors
    // ========================================================================
    /// Payload is too short to parse
    #[error("Payload too short: expected at least {expected} bytes, got {actual}")]
    PayloadTooShort { expected: usize, actual: usize },

    /// Invalid operation code
    #[error("Invalid operation: {0}")]
    InvalidOperation(u8),

    /// Invalid data format
    #[error("Invalid format: {0}")]
    InvalidFormat(String),

    /// UTF-8 decoding error
    #[error("Invalid UTF-8: {0}")]
    Utf8Error(#[from] std::string::FromUtf8Error),

    /// Hex decoding error
    #[error("Invalid hex: {0}")]
    HexError(#[from] hex::FromHexError),

    /// Carrier not supported for this kind
    #[error("Carrier {carrier:?} not supported for kind {kind}")]
    UnsupportedCarrier {
        carrier: anchor_core::carrier::CarrierType,
        kind: &'static str,
    },

    // ========================================================================
    // DNS Errors
    // ========================================================================
    /// Invalid domain name
    #[error("Invalid domain name: {0}")]
    InvalidDomainName(String),

    /// Unsupported TLD
    #[error("Unsupported TLD: {0}. Supported: .btc, .sat, .anchor, .anc, .bit")]
    UnsupportedTld(String),

    /// Invalid DNS record type
    #[error("Invalid DNS record type: {0}")]
    InvalidRecordType(u8),

    /// Invalid IPv4 address
    #[error("Invalid IPv4 address: {0}")]
    InvalidIpv4(String),

    /// Invalid IPv6 address
    #[error("Invalid IPv6 address: {0}")]
    InvalidIpv6(String),

    /// Record validation error
    #[error("DNS record validation failed: {0}")]
    InvalidDnsRecord(String),

    // ========================================================================
    // Token Errors
    // ========================================================================
    /// Invalid ticker format
    #[error("Invalid ticker: {0}")]
    InvalidTicker(String),

    /// Invalid token amount
    #[error("Invalid amount: {0}")]
    InvalidAmount(String),

    /// Token decimals out of range
    #[error("Decimals must be 0-18, got {0}")]
    InvalidDecimals(u8),

    /// Invalid token operation
    #[error("Invalid token operation: {0}")]
    InvalidTokenOperation(u8),

    // ========================================================================
    // Proof Errors
    // ========================================================================
    /// Invalid hash algorithm
    #[error("Invalid hash algorithm: {0}")]
    InvalidHashAlgorithm(u8),

    /// Hash size mismatch
    #[error("Hash size mismatch: expected {expected} bytes for {algorithm}, got {actual}")]
    HashSizeMismatch {
        algorithm: &'static str,
        expected: usize,
        actual: usize,
    },

    /// Invalid proof operation
    #[error("Invalid proof operation: {0}")]
    InvalidProofOperation(u8),

    // ========================================================================
    // Text/Generic Errors
    // ========================================================================
    /// Text too long
    #[error("Text too long: max {max} bytes, got {actual}")]
    TextTooLong { max: usize, actual: usize },

    /// Empty content not allowed
    #[error("Content cannot be empty")]
    EmptyContent,
}

/// Result type alias for spec operations
pub type Result<T> = std::result::Result<T, SpecError>;
