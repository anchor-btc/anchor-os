//! Core validation traits for ANCHOR specs

use crate::error::{Result, SpecError};
use anchor_core::carrier::CarrierType;

/// Trait implemented by all ANCHOR kind specifications.
///
/// This trait provides a common interface for encoding, decoding, and validating
/// message payloads for each kind in the ANCHOR protocol.
///
/// # Example
///
/// ```rust,ignore
/// use anchor_specs::prelude::*;
/// use anchor_specs::text::TextSpec;
///
/// let spec = TextSpec::new("Hello, ANCHOR!");
/// spec.validate()?;
/// let bytes = spec.to_bytes();
/// let parsed = TextSpec::from_bytes(&bytes)?;
/// ```
pub trait KindSpec: Sized {
    /// The numeric kind ID (e.g., 1 for Text, 10 for DNS)
    const KIND_ID: u8;

    /// Human-readable name of the kind
    const KIND_NAME: &'static str;

    /// Parse a spec from its binary payload.
    ///
    /// This parses the body portion of an ANCHOR message (after the header).
    fn from_bytes(body: &[u8]) -> Result<Self>;

    /// Encode the spec to its binary payload.
    ///
    /// This produces the body portion to be included in an ANCHOR message.
    fn to_bytes(&self) -> Vec<u8>;

    /// Validate the spec contents.
    ///
    /// Returns `Ok(())` if valid, or an error describing the validation failure.
    fn validate(&self) -> Result<()>;

    /// List of carrier types that support this kind.
    ///
    /// Some kinds have restrictions on which carriers can be used.
    /// For example, DNS cannot use OP_RETURN because it requires spendable UTXOs.
    fn supported_carriers() -> &'static [CarrierType];

    /// The recommended carrier type for this kind.
    ///
    /// This is the carrier that provides the best balance of cost and functionality.
    fn recommended_carrier() -> CarrierType;

    /// Check if a specific carrier is supported.
    fn is_carrier_supported(carrier: CarrierType) -> bool {
        Self::supported_carriers().contains(&carrier)
    }

    /// Validate and return self, or an error if invalid.
    ///
    /// Convenience method that combines validation with ownership.
    fn validated(self) -> Result<Self> {
        self.validate()?;
        Ok(self)
    }

    /// Validate that a carrier is supported for this kind.
    fn validate_carrier(carrier: CarrierType) -> Result<()> {
        if Self::is_carrier_supported(carrier) {
            Ok(())
        } else {
            Err(SpecError::UnsupportedCarrier {
                carrier,
                kind: Self::KIND_NAME,
            })
        }
    }
}

/// Extension trait for specs that support anchoring (updates/transfers)
pub trait AnchorableSpec: KindSpec {
    /// Whether this operation requires an anchor to a previous transaction
    fn requires_anchor(&self) -> bool;
}

/// Extension trait for specs with UTXO-based ownership
pub trait OwnedSpec: KindSpec {
    /// The output index that represents ownership (usually 0)
    fn ownership_vout() -> u8 {
        0
    }
}

