//! Data models for the AnchorProofs API
//!
//! This module re-exports Proof protocol types from `anchor-specs` and defines
//! API-specific response types for the AnchorProofs service.
//!
//! ## Protocol Types (from anchor-specs)
//!
//! The core Proof protocol types are defined in `anchor-specs::proof`:
//! - `ProofSpec` - Full proof specification (aliased as ProofPayload for compatibility)
//! - `ProofOperation` - Stamp, Revoke, Batch
//! - `ProofEntry` - Individual proof with hash and metadata
//! - `ProofMetadata` - File metadata (name, MIME type, size, description)
//! - `HashAlgorithm` - SHA-256, SHA-512
//!
//! ## API Types (defined here)
//!
//! API request/response types specific to the AnchorProofs backend service.

mod api;
mod db;

// Re-export Proof types from anchor-specs
pub use anchor_specs::proof::{
    HashAlgorithm, ProofEntry, ProofMetadata, ProofOperation, ProofSpec as ProofPayload,
};

// Re-export API types
pub use api::*;

// Re-export DB types
pub use db::*;
