//! Data models for the Anchor Domains API

use serde::{Deserialize, Serialize};
use std::net::{Ipv4Addr, Ipv6Addr};
use utoipa::ToSchema;

/// Supported TLDs for Anchor Domains
pub const SUPPORTED_TLDS: &[&str] = &[".btc", ".sat", ".anchor", ".anc", ".bit"];

/// DNS Operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[repr(u8)]
pub enum DnsOperation {
    /// Register a new domain
    Register = 0x01,
    /// Update existing domain records
    Update = 0x02,
    /// Transfer domain ownership
    Transfer = 0x03,
}

impl TryFrom<u8> for DnsOperation {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0x01 => Ok(DnsOperation::Register),
            0x02 => Ok(DnsOperation::Update),
            0x03 => Ok(DnsOperation::Transfer),
            _ => Err("Invalid DNS operation"),
        }
    }
}

/// DNS Record Types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[repr(u8)]
pub enum RecordType {
    /// IPv4 address (4 bytes)
    A = 1,
    /// IPv6 address (16 bytes)
    AAAA = 2,
    /// Canonical name (domain string)
    CNAME = 3,
    /// Text record (string)
    TXT = 4,
    /// Mail exchange (priority + domain)
    MX = 5,
    /// Name server (domain string)
    NS = 6,
    /// Service record (priority, weight, port, target)
    SRV = 7,
}

impl TryFrom<u8> for RecordType {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(RecordType::A),
            2 => Ok(RecordType::AAAA),
            3 => Ok(RecordType::CNAME),
            4 => Ok(RecordType::TXT),
            5 => Ok(RecordType::MX),
            6 => Ok(RecordType::NS),
            7 => Ok(RecordType::SRV),
            _ => Err("Invalid record type"),
        }
    }
}

impl RecordType {
    pub fn name(&self) -> &'static str {
        match self {
            RecordType::A => "A",
            RecordType::AAAA => "AAAA",
            RecordType::CNAME => "CNAME",
            RecordType::TXT => "TXT",
            RecordType::MX => "MX",
            RecordType::NS => "NS",
            RecordType::SRV => "SRV",
        }
    }
}

/// A DNS record
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DnsRecord {
    pub record_type: RecordType,
    pub ttl: u16,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
}

/// DNS Payload (parsed from Anchor message body)
#[derive(Debug, Clone)]
pub struct DnsPayload {
    pub operation: DnsOperation,
    pub name: String,
    pub records: Vec<DnsRecord>,
}

impl DnsPayload {
    /// Parse a DNS payload from binary data
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 3 {
            return None;
        }

        let operation = DnsOperation::try_from(bytes[0]).ok()?;
        let name_len = bytes[1] as usize;

        if bytes.len() < 2 + name_len {
            return None;
        }

        let name = String::from_utf8(bytes[2..2 + name_len].to_vec()).ok()?;

        // Validate domain name
        if !is_valid_domain_name(&name) {
            return None;
        }

        // Parse records
        let mut records = Vec::new();
        let mut offset = 2 + name_len;

        while offset + 4 <= bytes.len() {
            let record_type = RecordType::try_from(bytes[offset]).ok()?;
            let ttl = u16::from_be_bytes([bytes[offset + 1], bytes[offset + 2]]);
            let data_len = bytes[offset + 3] as usize;

            if offset + 4 + data_len > bytes.len() {
                break;
            }

            let data = &bytes[offset + 4..offset + 4 + data_len];
            let record = parse_record(record_type, ttl, data)?;
            records.push(record);

            offset += 4 + data_len;
        }

        Some(DnsPayload {
            operation,
            name,
            records,
        })
    }

    /// Encode the payload to binary
    pub fn to_bytes(&self) -> Vec<u8> {
        let name_bytes = self.name.as_bytes();
        let mut result = Vec::new();

        result.push(self.operation as u8);
        result.push(name_bytes.len() as u8);
        result.extend_from_slice(name_bytes);

        for record in &self.records {
            result.extend_from_slice(&encode_record(record));
        }

        result
    }
}

/// Parse a single DNS record from binary data
fn parse_record(record_type: RecordType, ttl: u16, data: &[u8]) -> Option<DnsRecord> {
    let (value, priority, weight, port) = match record_type {
        RecordType::A => {
            if data.len() != 4 {
                return None;
            }
            let ip = Ipv4Addr::new(data[0], data[1], data[2], data[3]);
            (ip.to_string(), None, None, None)
        }
        RecordType::AAAA => {
            if data.len() != 16 {
                return None;
            }
            let segments: [u16; 8] = [
                u16::from_be_bytes([data[0], data[1]]),
                u16::from_be_bytes([data[2], data[3]]),
                u16::from_be_bytes([data[4], data[5]]),
                u16::from_be_bytes([data[6], data[7]]),
                u16::from_be_bytes([data[8], data[9]]),
                u16::from_be_bytes([data[10], data[11]]),
                u16::from_be_bytes([data[12], data[13]]),
                u16::from_be_bytes([data[14], data[15]]),
            ];
            let ip = Ipv6Addr::new(
                segments[0],
                segments[1],
                segments[2],
                segments[3],
                segments[4],
                segments[5],
                segments[6],
                segments[7],
            );
            (ip.to_string(), None, None, None)
        }
        RecordType::CNAME | RecordType::NS | RecordType::TXT => {
            let value = String::from_utf8(data.to_vec()).ok()?;
            (value, None, None, None)
        }
        RecordType::MX => {
            if data.len() < 3 {
                return None;
            }
            let priority = u16::from_be_bytes([data[0], data[1]]);
            let domain = String::from_utf8(data[2..].to_vec()).ok()?;
            (domain, Some(priority), None, None)
        }
        RecordType::SRV => {
            if data.len() < 7 {
                return None;
            }
            let priority = u16::from_be_bytes([data[0], data[1]]);
            let weight = u16::from_be_bytes([data[2], data[3]]);
            let port = u16::from_be_bytes([data[4], data[5]]);
            let target = String::from_utf8(data[6..].to_vec()).ok()?;
            (target, Some(priority), Some(weight), Some(port))
        }
    };

    Some(DnsRecord {
        record_type,
        ttl,
        value,
        priority,
        weight,
        port,
    })
}

/// Encode a single DNS record to binary
fn encode_record(record: &DnsRecord) -> Vec<u8> {
    let mut data = Vec::new();

    match record.record_type {
        RecordType::A => {
            if let Ok(ip) = record.value.parse::<Ipv4Addr>() {
                data.extend_from_slice(&ip.octets());
            }
        }
        RecordType::AAAA => {
            if let Ok(ip) = record.value.parse::<Ipv6Addr>() {
                data.extend_from_slice(&ip.octets());
            }
        }
        RecordType::CNAME | RecordType::NS | RecordType::TXT => {
            data.extend_from_slice(record.value.as_bytes());
        }
        RecordType::MX => {
            let priority = record.priority.unwrap_or(10);
            data.extend_from_slice(&priority.to_be_bytes());
            data.extend_from_slice(record.value.as_bytes());
        }
        RecordType::SRV => {
            let priority = record.priority.unwrap_or(0);
            let weight = record.weight.unwrap_or(0);
            let port = record.port.unwrap_or(0);
            data.extend_from_slice(&priority.to_be_bytes());
            data.extend_from_slice(&weight.to_be_bytes());
            data.extend_from_slice(&port.to_be_bytes());
            data.extend_from_slice(record.value.as_bytes());
        }
    }

    let mut result = Vec::with_capacity(4 + data.len());
    result.push(record.record_type as u8);
    result.extend_from_slice(&record.ttl.to_be_bytes());
    result.push(data.len() as u8);
    result.extend_from_slice(&data);

    result
}

/// Get the TLD from a domain name if it's supported
pub fn get_tld(name: &str) -> Option<&'static str> {
    SUPPORTED_TLDS.iter().find(|tld| name.ends_with(*tld)).copied()
}

/// Validate an Anchor Domains domain name (supports .btc, .sat, .anchor, .anc)
pub fn is_valid_domain_name(name: &str) -> bool {
    // Must end with a supported TLD
    let tld = match get_tld(name) {
        Some(tld) => tld,
        None => return false,
    };

    // Get the name part (without TLD)
    let name_part = &name[..name.len() - tld.len()];

    // Must be at least 1 character
    if name_part.is_empty() {
        return false;
    }

    // Max 255 bytes total
    if name.len() > 255 {
        return false;
    }

    // Only allow alphanumeric, hyphens, and dots (for subdomains)
    // Cannot start or end with hyphen
    let valid_chars = name_part
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.');

    let no_leading_trailing_hyphen = !name_part.starts_with('-')
        && !name_part.ends_with('-')
        && !name_part.contains(".-")
        && !name_part.contains("-.");

    valid_chars && no_leading_trailing_hyphen
}

/// Check if a string is a valid txid prefix (16 hex chars)
pub fn is_txid_prefix(value: &str) -> bool {
    value.len() == 16 && value.chars().all(|c| c.is_ascii_hexdigit())
}

// ============================================================================
// API Response Types
// ============================================================================

/// Domain information
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

/// Resolve response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ResolveResponse {
    pub name: String,
    pub txid: String,
    pub vout: i32,
    pub txid_prefix: String,
    pub records: Vec<DnsRecordResponse>,
}

/// Domain list response
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

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

/// Register domain request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RegisterDomainRequest {
    pub name: String,
    pub records: Vec<DnsRecordInput>,
    #[serde(default)]
    pub carrier: Option<u8>,
}

/// Update domain request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateDomainRequest {
    pub records: Vec<DnsRecordInput>,
    #[serde(default)]
    pub carrier: Option<u8>,
}

/// DNS record input
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct DnsRecordInput {
    pub record_type: String,
    pub ttl: Option<u16>,
    pub value: String,
    pub priority: Option<u16>,
    pub weight: Option<u16>,
    pub port: Option<u16>,
}

impl DnsRecordInput {
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

/// Create transaction response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTxResponse {
    pub txid: String,
    pub vout: i32,
    pub hex: String,
    pub carrier: i32,
    pub carrier_name: String,
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
        assert!(!is_valid_domain_name("test..anchor")); // double dot
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

    #[test]
    fn test_txid_prefix() {
        assert!(is_txid_prefix("a1b2c3d4e5f67890"));
        assert!(!is_txid_prefix("a1b2c3d4")); // too short
        assert!(!is_txid_prefix("a1b2c3d4e5f67890ab")); // too long
        assert!(!is_txid_prefix("g1b2c3d4e5f67890")); // invalid char
    }

    #[test]
    fn test_dns_payload_roundtrip() {
        let payload = DnsPayload {
            operation: DnsOperation::Register,
            name: "test.btc".to_string(),
            records: vec![DnsRecord {
                record_type: RecordType::A,
                ttl: 300,
                value: "93.184.216.34".to_string(),
                priority: None,
                weight: None,
                port: None,
            }],
        };

        let bytes = payload.to_bytes();
        let decoded = DnsPayload::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.operation, DnsOperation::Register);
        assert_eq!(decoded.name, "test.btc");
        assert_eq!(decoded.records.len(), 1);
        assert_eq!(decoded.records[0].value, "93.184.216.34");
    }

    #[test]
    fn test_mx_record() {
        let payload = DnsPayload {
            operation: DnsOperation::Register,
            name: "test.sat".to_string(),
            records: vec![DnsRecord {
                record_type: RecordType::MX,
                ttl: 300,
                value: "mail.test.sat".to_string(),
                priority: Some(10),
                weight: None,
                port: None,
            }],
        };

        let bytes = payload.to_bytes();
        let decoded = DnsPayload::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.records[0].priority, Some(10));
        assert_eq!(decoded.records[0].value, "mail.test.sat");
    }
}
