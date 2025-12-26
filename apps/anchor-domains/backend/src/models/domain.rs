//! Domain-related data models
//!
//! These models represent domain entities as stored in the database
//! and returned from the API.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

// Re-export DNS types from anchor-specs
pub use anchor_specs::dns::{
    is_valid_domain_name, DnsOperation, DnsRecord, DnsSpec as DnsPayload, RecordType,
    SUPPORTED_TLDS,
};

// Re-export for tests
#[cfg(test)]
pub use anchor_specs::dns::get_tld;

/// Domain information with full details
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Domain {
    pub id: i32,
    pub name: String,
    pub txid: String,
    pub vout: i32,
    pub txid_prefix: String,
    pub owner_txid: String,
    pub block_height: Option<i32>,
    pub records: Vec<DnsRecordResponse>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// DNS record response (from database)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsRecordResponse {
    pub id: i32,
    pub record_type: String,
    /// Record name/subdomain prefix (e.g., "user._nostr", "www", "@" for root)
    /// NULL or "@" means this record applies to the root domain
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub ttl: i32,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<i32>,
    pub txid: String,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Resolve response - domain with its records
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ResolveResponse {
    pub name: String,
    pub txid: String,
    pub vout: i32,
    pub txid_prefix: String,
    pub records: Vec<DnsRecordResponse>,
}

/// Domain list item (summary for listings)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DomainListItem {
    pub id: i32,
    pub name: String,
    pub txid: String,
    pub txid_prefix: String,
    pub record_count: i64,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Anchor Domains statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsStats {
    pub total_domains: i64,
    pub total_records: i64,
    pub total_transactions: i64,
    pub last_block_height: Option<i32>,
    pub last_update: Option<chrono::DateTime<chrono::Utc>>,
}

/// Pending transaction (not yet confirmed on-chain)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PendingTransaction {
    pub id: i32,
    pub txid: String,
    pub domain_name: String,
    pub operation: String,
    pub records: Option<Vec<super::api::DnsRecordInput>>,
    pub carrier: Option<i16>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Domain history entry
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HistoryEntry {
    pub txid: String,
    pub vout: i32,
    pub operation: String,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl HistoryEntry {
    /// Create a history entry from raw database data
    pub fn from_db_row(
        txid: Vec<u8>,
        vout: i32,
        op: i16,
        height: Option<i32>,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> Self {
        let operation = match op {
            1 => "register".to_string(),
            2 => "update".to_string(),
            3 => "transfer".to_string(),
            _ => format!("unknown({})", op),
        };
        Self {
            txid: hex::encode(&txid),
            vout,
            operation,
            block_height: height,
            created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_domain_names() {
        // .btc TLD
        assert!(is_valid_domain_name("test.btc"));
        assert!(is_valid_domain_name("my-site.btc"));
        assert!(is_valid_domain_name("sub.domain.btc"));
        // .sat TLD
        assert!(is_valid_domain_name("test.sat"));
        assert!(is_valid_domain_name("a.sat"));
        // .anchor TLD
        assert!(is_valid_domain_name("test.anchor"));
        assert!(is_valid_domain_name("test123.anchor"));
        // .anc TLD
        assert!(is_valid_domain_name("test.anc"));
    }

    #[test]
    fn test_invalid_domain_names() {
        assert!(!is_valid_domain_name("test.com")); // unsupported TLD
        assert!(is_valid_domain_name("test.bit")); // .bit TLD supported
        assert!(!is_valid_domain_name(".btc")); // empty name
        assert!(!is_valid_domain_name("-test.btc")); // starts with hyphen
        assert!(!is_valid_domain_name("test-.sat")); // ends with hyphen
    }

    #[test]
    fn test_get_tld() {
        assert_eq!(get_tld("test.btc"), Some(".btc"));
        assert_eq!(get_tld("test.sat"), Some(".sat"));
        assert_eq!(get_tld("test.anchor"), Some(".anchor"));
        assert_eq!(get_tld("test.anc"), Some(".anc"));
        assert_eq!(get_tld("test.bit"), Some(".bit")); // .bit TLD supported
        assert_eq!(get_tld("test.com"), None); // unsupported
    }
}
