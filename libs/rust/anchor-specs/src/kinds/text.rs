//! Kind 1: Text Message Specification
//!
//! Text messages are simple UTF-8 encoded strings. They are the most basic
//! kind of ANCHOR message and can be used for plain text communication.
//!
//! ## Payload Format
//!
//! ```text
//! ┌─────────────────────────────────────┐
//! │           TEXT PAYLOAD              │
//! ├─────────────────────────────────────┤
//! │ UTF-8 encoded text (variable)       │
//! └─────────────────────────────────────┘
//! ```
//!
//! ## Example
//!
//! ```rust,ignore
//! use anchor_specs::text::TextSpec;
//! use anchor_specs::KindSpec;
//!
//! let spec = TextSpec::new("Hello, ANCHOR!");
//! assert!(spec.validate().is_ok());
//! ```

use crate::error::{Result, SpecError};
use crate::validation::KindSpec;
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};

/// Maximum text length for OP_RETURN (leaving room for header)
/// With Bitcoin Core v30+ supporting 100KB, this is much larger
pub const MAX_OP_RETURN_TEXT: usize = 99900;

/// Maximum text length for other carriers (practical limit)
pub const MAX_TEXT_LENGTH: usize = 100_000;

/// Text message specification (Kind 1)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TextSpec {
    /// The text content (UTF-8)
    pub text: String,
}

impl TextSpec {
    /// Create a new text spec
    pub fn new(text: impl Into<String>) -> Self {
        Self { text: text.into() }
    }

    /// Check if the text fits in OP_RETURN
    pub fn fits_op_return(&self) -> bool {
        self.text.len() <= MAX_OP_RETURN_TEXT
    }

    /// Get the best carrier for this text size
    pub fn best_carrier(&self) -> CarrierType {
        if self.fits_op_return() {
            CarrierType::OpReturn
        } else {
            CarrierType::WitnessData
        }
    }
}

impl KindSpec for TextSpec {
    const KIND_ID: u8 = 1;
    const KIND_NAME: &'static str = "Text";

    fn from_bytes(body: &[u8]) -> Result<Self> {
        let text = String::from_utf8(body.to_vec())?;
        Ok(Self { text })
    }

    fn to_bytes(&self) -> Vec<u8> {
        self.text.as_bytes().to_vec()
    }

    fn validate(&self) -> Result<()> {
        if self.text.is_empty() {
            return Err(SpecError::EmptyContent);
        }
        if self.text.len() > MAX_TEXT_LENGTH {
            return Err(SpecError::TextTooLong {
                max: MAX_TEXT_LENGTH,
                actual: self.text.len(),
            });
        }
        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        &[
            CarrierType::OpReturn,
            CarrierType::Inscription,
            CarrierType::Stamps,
            CarrierType::TaprootAnnex,
            CarrierType::WitnessData,
        ]
    }

    fn recommended_carrier() -> CarrierType {
        CarrierType::OpReturn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_roundtrip() {
        let original = TextSpec::new("Hello, ANCHOR!");
        let bytes = original.to_bytes();
        let parsed = TextSpec::from_bytes(&bytes).unwrap();
        assert_eq!(original, parsed);
    }

    #[test]
    fn test_validation() {
        assert!(TextSpec::new("Valid text").validate().is_ok());
        assert!(TextSpec::new("").validate().is_err());
    }

    #[test]
    fn test_fits_op_return() {
        let short = TextSpec::new("Short");
        assert!(short.fits_op_return());

        let long = TextSpec::new("A".repeat(100));
        assert!(!long.fits_op_return());
    }

    #[test]
    fn test_supported_carriers() {
        assert!(TextSpec::supported_carriers().contains(&CarrierType::OpReturn));
        assert!(TextSpec::supported_carriers().contains(&CarrierType::WitnessData));
    }
}

