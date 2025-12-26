//! # ANCHOR Protocol Specifications
//!
//! This crate provides protocol specifications and validation for all ANCHOR message kinds.
//! It serves as the single source of truth for payload encoding, decoding, and validation.
//!
//! ## Overview
//!
//! Each ANCHOR message kind has a specific payload format defined in this crate.
//! The `KindSpec` trait provides a common interface for all kinds:
//!
//! - `from_bytes()` - Parse payload from binary
//! - `to_bytes()` - Encode payload to binary
//! - `validate()` - Validate payload contents
//! - `supported_carriers()` - List of supported carrier types
//! - `recommended_carrier()` - Best carrier for this kind
//!
//! ## Supported Kinds
//!
//! | Kind | ID | Description |
//! |------|----|-------------|
//! | Text | 1 | UTF-8 text messages |
//! | State | 2 | State updates |
//! | Vote | 3 | Voting |
//! | Image | 4 | Image data |
//! | DNS | 10 | Domain name registration |
//! | Proof | 11 | Proof of existence |
//! | GeoMarker | 12 | Geographic markers |
//! | Token | 20 | Token operations |
//! | Oracle | 30-33 | Oracle attestations |
//! | Lottery | 40-43 | Lottery operations |
//!
//! ## Example
//!
//! ```rust,ignore
//! use anchor_specs::prelude::*;
//! use anchor_specs::dns::{DnsSpec, DnsOperation, DnsRecord, RecordType};
//!
//! // Create a DNS registration spec
//! let spec = DnsSpec {
//!     operation: DnsOperation::Register,
//!     name: "example.btc".to_string(),
//!     records: vec![
//!         DnsRecord::a("93.184.216.34", 3600).unwrap(),
//!     ],
//! };
//!
//! // Validate and encode
//! spec.validate()?;
//! let bytes = spec.to_bytes();
//!
//! // Check supported carriers
//! assert!(!DnsSpec::supported_carriers().contains(&CarrierType::OpReturn));
//! ```

mod error;
pub mod kinds;
mod validation;

pub use error::SpecError;
pub use validation::{AnchorableSpec, KindSpec, OwnedSpec};

// Re-export carrier types from anchor-core
pub use anchor_core::carrier::CarrierType;

/// Prelude module for convenient imports
pub mod prelude {
    pub use crate::error::SpecError;
    pub use crate::validation::{AnchorableSpec, KindSpec, OwnedSpec};
    pub use anchor_core::carrier::CarrierType;
}

// Re-export all kinds at crate level for convenience
pub use kinds::dns;
pub use kinds::geomarker;
pub use kinds::proof;
pub use kinds::state;
pub use kinds::text;
pub use kinds::token;

/// Protocol version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
