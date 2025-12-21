//! Data models for the Anchor Domains API
//!
//! This module re-exports DNS protocol types from `anchor-specs` and defines
//! API-specific response types for the Anchor Domains service.
//!
//! ## Protocol Types (from anchor-specs)
//!
//! The core DNS protocol types are defined in `anchor-specs::dns`:
//! - `DnsSpec` - Full DNS specification with operation, name, and records
//! - `DnsOperation` - Register, Update, Transfer
//! - `DnsRecord` - Individual DNS record (A, AAAA, CNAME, TXT, MX, NS, SRV)
//! - `RecordType` - DNS record type enum
//!
//! ## API Types (defined here)
//!
//! API request/response types specific to the Anchor Domains backend service.

pub mod api;
pub mod domain;

// Re-export all types for backward compatibility
pub use api::*;
pub use domain::*;

// ============================================================================
// Validation Helpers
// ============================================================================

/// Check if a string is a valid txid prefix (16 hex chars)
pub fn is_txid_prefix(value: &str) -> bool {
    value.len() == 16 && value.chars().all(|c| c.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_txid_prefix() {
        assert!(is_txid_prefix("a1b2c3d4e5f67890"));
        assert!(!is_txid_prefix("a1b2c3d4")); // too short
        assert!(!is_txid_prefix("a1b2c3d4e5f67890ab")); // too long
        assert!(!is_txid_prefix("g1b2c3d4e5f67890")); // invalid char
    }
}

