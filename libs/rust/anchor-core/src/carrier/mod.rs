//! Multi-carrier support for ANCHOR protocol
//!
//! This module provides an abstraction layer for embedding ANCHOR messages
//! in different Bitcoin transaction structures (carriers).
//!
//! # Supported Carriers
//!
//! | Carrier | Max Size | Prunable | UTXO Impact | Status |
//! |---------|----------|----------|-------------|--------|
//! | OP_RETURN | 80B-100KB | Yes | No | Active |
//! | Inscription | ~4MB | Yes | No | Active |
//! | Stamps | ~8KB | **No** | **Yes** | Active |
//! | Taproot Annex | TBD | Yes | No | Reserved |
//! | Witness Data | ~4MB | Yes | No | Active |
//!
//! # Example
//!
//! ```ignore
//! use anchor_core::carrier::{CarrierSelector, CarrierPreferences, CarrierType};
//!
//! let selector = CarrierSelector::new();
//! let prefs = CarrierPreferences::default();
//!
//! let carrier = selector.select(&message, &prefs)?;
//! let output = carrier.encode(&message)?;
//! ```

mod annex;
mod error;
mod inscription;
mod op_return;
mod selector;
mod stamps;
mod witness;

pub use annex::*;
pub use error::*;
pub use inscription::*;
pub use op_return::*;
pub use selector::*;
pub use stamps::*;
pub use witness::*;

use bitcoin::script::ScriptBuf;
use bitcoin::{Script, Transaction};
use serde::{Deserialize, Serialize};

use crate::ParsedAnchorMessage;

/// Carrier status indicating availability
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CarrierStatus {
    /// Fully functional and actively used
    Active,
    /// Reserved for future use, may not relay by default
    Reserved,
    /// Proposed but not yet implemented in Bitcoin
    Proposed,
    /// Legacy, not recommended for new use
    Deprecated,
}

/// Type of carrier for embedding ANCHOR data
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum CarrierType {
    /// OP_RETURN output (default, simplest)
    OpReturn = 0,
    /// Ordinals-style inscription in witness
    Inscription = 1,
    /// Stamps bare multisig (permanent, unprunable)
    Stamps = 2,
    /// Taproot annex field
    TaprootAnnex = 3,
    /// Raw witness data in Tapscript
    WitnessData = 4,
}

impl CarrierType {
    /// Get all active carrier types
    pub fn active_carriers() -> &'static [CarrierType] {
        &[
            CarrierType::OpReturn,
            CarrierType::Inscription,
            CarrierType::Stamps,
            CarrierType::WitnessData,
        ]
    }

    /// Get carrier type from u8 value
    pub fn from_u8(value: u8) -> Option<CarrierType> {
        match value {
            0 => Some(CarrierType::OpReturn),
            1 => Some(CarrierType::Inscription),
            2 => Some(CarrierType::Stamps),
            3 => Some(CarrierType::TaprootAnnex),
            4 => Some(CarrierType::WitnessData),
            _ => None,
        }
    }
}

impl std::fmt::Display for CarrierType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CarrierType::OpReturn => write!(f, "op_return"),
            CarrierType::Inscription => write!(f, "inscription"),
            CarrierType::Stamps => write!(f, "stamps"),
            CarrierType::TaprootAnnex => write!(f, "taproot_annex"),
            CarrierType::WitnessData => write!(f, "witness_data"),
        }
    }
}

/// Metadata and capabilities of a carrier
#[derive(Debug, Clone)]
pub struct CarrierInfo {
    /// Carrier type
    pub carrier_type: CarrierType,
    /// Human-readable name
    pub name: &'static str,
    /// Maximum payload size in bytes
    pub max_size: usize,
    /// Whether data can be pruned by nodes
    pub is_prunable: bool,
    /// Whether carrier impacts UTXO set size
    pub utxo_impact: bool,
    /// Whether carrier benefits from witness discount (75%)
    pub witness_discount: bool,
    /// Current status of this carrier
    pub status: CarrierStatus,
}

/// Output from carrier encoding
#[derive(Debug, Clone)]
pub enum CarrierOutput {
    /// Single OP_RETURN output script
    OpReturn(ScriptBuf),

    /// Inscription requires commit + reveal transaction pattern
    Inscription {
        /// Script to commit to (hash goes in commit tx)
        reveal_script: ScriptBuf,
        /// Content type for the inscription
        content_type: String,
    },

    /// Stamps creates multiple multisig output scripts
    Stamps(Vec<ScriptBuf>),

    /// Witness data to include in witness stack
    WitnessData {
        /// Data chunks for witness stack
        chunks: Vec<Vec<u8>>,
        /// Tapscript containing the data
        script: ScriptBuf,
    },

    /// Annex data (prefixed with 0x50)
    Annex(Vec<u8>),
}

/// Input for carrier decoding
#[derive(Debug)]
pub enum CarrierInput<'a> {
    /// Raw script (for OP_RETURN, Stamps)
    Script(&'a Script),

    /// Full transaction with output index
    Transaction { tx: &'a Transaction, vout: u32 },

    /// Witness stack (for Inscription, Annex, WitnessData)
    Witness(&'a [Vec<u8>]),

    /// Raw bytes
    Bytes(&'a [u8]),
}

/// Trait for ANCHOR data carriers
///
/// Each carrier implementation provides encoding and decoding of ANCHOR
/// messages for a specific Bitcoin transaction structure.
pub trait Carrier: Send + Sync {
    /// Get carrier metadata and capabilities
    fn info(&self) -> CarrierInfo;

    /// Check if this carrier can handle a payload of the given size
    fn can_handle(&self, payload_size: usize) -> bool {
        payload_size <= self.info().max_size
    }

    /// Encode an ANCHOR message for this carrier
    fn encode(&self, message: &ParsedAnchorMessage) -> CarrierResult<CarrierOutput>;

    /// Decode an ANCHOR message from carrier-specific input
    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage>;

    /// Estimate transaction fee for this carrier
    ///
    /// # Arguments
    /// * `payload_size` - Size of the ANCHOR payload in bytes
    /// * `fee_rate` - Fee rate in sat/vB
    ///
    /// # Returns
    /// Estimated fee in satoshis
    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_carrier_type_display() {
        assert_eq!(CarrierType::OpReturn.to_string(), "op_return");
        assert_eq!(CarrierType::Inscription.to_string(), "inscription");
        assert_eq!(CarrierType::Stamps.to_string(), "stamps");
        assert_eq!(CarrierType::TaprootAnnex.to_string(), "taproot_annex");
        assert_eq!(CarrierType::WitnessData.to_string(), "witness_data");
    }

    #[test]
    fn test_carrier_type_from_u8() {
        assert_eq!(CarrierType::from_u8(0), Some(CarrierType::OpReturn));
        assert_eq!(CarrierType::from_u8(1), Some(CarrierType::Inscription));
        assert_eq!(CarrierType::from_u8(2), Some(CarrierType::Stamps));
        assert_eq!(CarrierType::from_u8(3), Some(CarrierType::TaprootAnnex));
        assert_eq!(CarrierType::from_u8(4), Some(CarrierType::WitnessData));
        assert_eq!(CarrierType::from_u8(5), None);
    }

    #[test]
    fn test_active_carriers() {
        let active = CarrierType::active_carriers();
        assert!(active.contains(&CarrierType::OpReturn));
        assert!(active.contains(&CarrierType::Inscription));
        assert!(active.contains(&CarrierType::Stamps));
        assert!(active.contains(&CarrierType::WitnessData));
        // Annex is reserved, not active
        assert!(!active.contains(&CarrierType::TaprootAnnex));
    }
}
