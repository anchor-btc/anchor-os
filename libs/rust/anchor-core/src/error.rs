//! Error types for the ANCHOR protocol

use thiserror::Error;

/// Errors that can occur when parsing ANCHOR payloads
#[derive(Debug, Error, PartialEq, Eq)]
pub enum AnchorError {
    /// Payload is too short to contain required fields
    #[error("payload too short: expected at least 6 bytes")]
    PayloadTooShort,

    /// Magic bytes don't match ANCHOR v1
    #[error("invalid magic bytes: expected 0xA11C0001")]
    InvalidMagic,

    /// Not enough bytes for the declared number of anchors
    #[error(
        "truncated anchors: expected {expected} anchors but only {available_bytes} bytes available"
    )]
    TruncatedAnchors {
        expected: usize,
        available_bytes: usize,
    },

    /// Invalid anchor count
    #[error("invalid anchor count: {0}")]
    InvalidAnchorCount(u8),
}

/// Result type for ANCHOR operations
pub type AnchorResult<T> = Result<T, AnchorError>;
