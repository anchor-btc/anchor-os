//! ANCHOR kind specifications
//!
//! This module contains implementations for all supported ANCHOR message kinds.
//!
//! ## Kind Registry
//!
//! | Range | Category | Kinds |
//! |-------|----------|-------|
//! | 0-9 | Core | Generic, Text, State, Vote, Image |
//! | 10-19 | Infrastructure | DNS, Proof, GeoMarker |
//! | 20-29 | Assets | Token |
//! | 30-39 | Oracles | Oracle, OracleAttestation, OracleDispute, OracleSlash |
//! | 40-49 | Predictions | MarketCreate, PlaceBet, MarketResolve, ClaimWinnings |

pub mod dns;
pub mod geomarker;
pub mod proof;
pub mod state;
pub mod text;
pub mod token;

// Re-export main types for convenience
pub use dns::{DnsOperation, DnsRecord, DnsSpec, RecordType};
pub use geomarker::{GeoMarkerSpec, MarkerCategory, HEADER_SIZE, MAX_MESSAGE_LENGTH};
pub use proof::{HashAlgorithm, ProofEntry, ProofOperation, ProofSpec};
pub use state::{
    PixelData, StateSpec, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, MAX_PIXELS_PER_TX,
};
pub use text::TextSpec;
pub use token::{TokenAllocation, TokenOperation, TokenSpec};
