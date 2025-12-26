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

pub mod text;
pub mod state;
pub mod dns;
pub mod proof;
pub mod token;
pub mod geomarker;

// Re-export main types for convenience
pub use text::TextSpec;
pub use state::{StateSpec, PixelData, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MAX_PIXELS_PER_TX};
pub use dns::{DnsSpec, DnsOperation, DnsRecord, RecordType};
pub use proof::{ProofSpec, ProofOperation, ProofEntry, HashAlgorithm};
pub use token::{TokenSpec, TokenOperation, TokenAllocation};
pub use geomarker::{GeoMarkerSpec, MarkerCategory, MAX_MESSAGE_LENGTH, HEADER_SIZE};

