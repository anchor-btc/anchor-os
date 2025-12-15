//! Error types for ANCHOR carriers

use thiserror::Error;

use crate::AnchorError;

/// Errors that can occur during carrier operations
#[derive(Debug, Error)]
pub enum CarrierError {
    /// Payload is too large for this carrier
    #[error("payload too large: {size} bytes exceeds carrier limit of {limit} bytes")]
    PayloadTooLarge { size: usize, limit: usize },

    /// No suitable carrier found for the payload
    #[error("no suitable carrier found for payload of size {size} bytes")]
    NoSuitableCarrier { size: usize },

    /// Carrier is not available (e.g., reserved status)
    #[error("carrier '{name}' is not available: {reason}")]
    CarrierNotAvailable {
        name: &'static str,
        reason: &'static str,
    },

    /// Invalid format for this carrier
    #[error("invalid format: {0}")]
    InvalidFormat(String),

    /// Not an ANCHOR message
    #[error("data is not an ANCHOR message")]
    NotAnchor,

    /// Message not found in transaction/witness
    #[error("ANCHOR message not found")]
    NotFound,

    /// Invalid input type for decode
    #[error("invalid input type for this carrier")]
    InvalidInput,

    /// Error parsing ANCHOR payload
    #[error("anchor parse error: {0}")]
    Parse(#[from] AnchorError),

    /// Script building error
    #[error("script error: {0}")]
    Script(String),

    /// Carrier-specific error
    #[error("{0}")]
    Custom(String),
}

/// Result type for carrier operations
pub type CarrierResult<T> = Result<T, CarrierError>;
