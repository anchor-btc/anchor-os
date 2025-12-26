//! API request and response models
//!
//! These models are specific to the HTTP API layer and handle
//! serialization/deserialization of requests and responses.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::domain::{DnsRecord, DomainListItem, PendingTransaction, RecordType};

// ============================================================================
// Request Models
// ============================================================================

/// Register domain request.
///
/// ## Example
/// ```json
/// {
///   "name": "mysite.btc",
///   "records": [
///     { "record_type": "A", "value": "93.184.216.34", "ttl": 3600 },
///     { "record_type": "TXT", "value": "Hello from Bitcoin!", "ttl": 300 }
///   ],
///   "carrier": 0
/// }
/// ```
///
/// ## Carriers
/// - 0: OP_RETURN (default, ~80 bytes max) - NOT recommended for DNS
/// - 1: Inscription (larger payloads)
/// - 2: Witness (larger payloads)
/// - 4: WitnessData (recommended for DNS)
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RegisterDomainRequest {
    /// Domain name with TLD (e.g., "mysite.btc", "example.sat")
    #[schema(example = "mysite.btc")]
    pub name: String,
    /// DNS records to create
    pub records: Vec<DnsRecordInput>,
    /// Carrier type: 0=OP_RETURN (not recommended), 1=Inscription, 4=WitnessData
    #[serde(default)]
    #[schema(example = 4)]
    pub carrier: Option<u8>,
}

/// Update domain request.
///
/// Updates the DNS records for an existing domain.
/// The request must come from the current domain owner (controls the ownership UTXO).
///
/// ## Example
/// ```json
/// {
///   "records": [
///     { "record_type": "A", "value": "192.168.1.1", "ttl": 3600 }
///   ]
/// }
/// ```
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateDomainRequest {
    /// New DNS records (replaces all existing records)
    pub records: Vec<DnsRecordInput>,
    /// Carrier type: 0=OP_RETURN (not recommended), 1=Inscription, 4=WitnessData
    #[serde(default)]
    #[schema(example = 4)]
    pub carrier: Option<u8>,
}

/// DNS record input for registration/update requests.
///
/// ## Record Types
/// - **A**: IPv4 address (e.g., "93.184.216.34")
/// - **AAAA**: IPv6 address (e.g., "2001:db8::1")
/// - **CNAME**: Canonical name (e.g., "www.example.com")
/// - **TXT**: Text record (e.g., "v=spf1 include:...")
/// - **MX**: Mail exchange (requires priority)
/// - **NS**: Name server
/// - **SRV**: Service record (requires priority, weight, port)
///
/// ## Example
/// ```json
/// { "record_type": "A", "value": "93.184.216.34", "ttl": 3600 }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsRecordInput {
    /// Record type: A, AAAA, CNAME, TXT, MX, NS, SRV
    #[schema(example = "A")]
    pub record_type: String,
    /// Time-to-live in seconds (default: 300)
    #[schema(example = 3600)]
    pub ttl: Option<u16>,
    /// Record value (format depends on type)
    #[schema(example = "93.184.216.34")]
    pub value: String,
    /// Priority (required for MX and SRV)
    #[schema(example = 10)]
    pub priority: Option<u16>,
    /// Weight (for SRV records)
    #[schema(example = 1)]
    pub weight: Option<u16>,
    /// Port (for SRV records)
    #[schema(example = 443)]
    pub port: Option<u16>,
}

impl DnsRecordInput {
    /// Convert to a DnsRecord from anchor-specs
    pub fn to_dns_record(&self) -> Option<DnsRecord> {
        let record_type = match self.record_type.to_uppercase().as_str() {
            "A" => RecordType::A,
            "AAAA" => RecordType::AAAA,
            "CNAME" => RecordType::CNAME,
            "TXT" => RecordType::TXT,
            "MX" => RecordType::MX,
            "NS" => RecordType::NS,
            "SRV" => RecordType::SRV,
            _ => return None,
        };

        Some(DnsRecord {
            record_type,
            ttl: self.ttl.unwrap_or(300),
            value: self.value.clone(),
            priority: self.priority,
            weight: self.weight,
            port: self.port,
        })
    }
}

/// Request body for getting domains by owner txids
#[derive(Debug, Deserialize, ToSchema)]
pub struct GetDomainsByOwnerRequest {
    /// List of transaction IDs (hex-encoded) that may own domains
    pub txids: Vec<String>,
}

/// Query parameters for my-domains endpoint
#[derive(Debug, Deserialize)]
pub struct MyDomainsQuery {
    /// Comma-separated list of transaction IDs (hex-encoded)
    pub owner_txids: String,
}

/// Request to create a pending transaction
/// Note: This struct is for API documentation purposes and may not be used directly.
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct CreatePendingRequest {
    pub txid: String,
    pub domain_name: String,
    pub operation: i16, // 1=register, 2=update, 3=transfer
    pub records: Option<Vec<DnsRecordInput>>,
    pub carrier: Option<i16>,
}

// ============================================================================
// Response Models
// ============================================================================

/// Pagination parameters
#[derive(Debug, Clone, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    pub search: Option<String>,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    50
}

/// Paginated response wrapper
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

impl<T> PaginatedResponse<T> {
    /// Create a new paginated response
    pub fn new(data: Vec<T>, total: i64, page: i32, per_page: i32) -> Self {
        let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;
        Self {
            data,
            total,
            page,
            per_page,
            total_pages,
        }
    }
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

/// Create transaction response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTxResponse {
    pub txid: String,
    pub vout: i32,
    pub hex: String,
    pub carrier: i32,
    pub carrier_name: String,
}

/// Domain availability check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AvailabilityResponse {
    pub name: String,
    pub available: bool,
}

/// Response for my-domains endpoint
#[derive(Debug, Serialize, ToSchema)]
pub struct MyDomainsResponse {
    pub data: Vec<DomainListItem>,
}

/// Response for pending transaction status check
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PendingStatusResponse {
    pub name: String,
    pub has_pending: bool,
    pub pending: Option<PendingTransaction>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dns_record_input_conversion() {
        let input = DnsRecordInput {
            record_type: "A".to_string(),
            ttl: Some(3600),
            value: "93.184.216.34".to_string(),
            priority: None,
            weight: None,
            port: None,
        };

        let record = input.to_dns_record().unwrap();
        assert_eq!(record.record_type, RecordType::A);
        assert_eq!(record.ttl, 3600);
        assert_eq!(record.value, "93.184.216.34");
    }

    #[test]
    fn test_paginated_response() {
        let data = vec![1, 2, 3];
        let response = PaginatedResponse::new(data, 100, 1, 10);
        assert_eq!(response.total_pages, 10);
    }
}
