//! Kind 10: DNS (Anchor Domains) Specification
//!
//! The DNS kind enables decentralized domain name registration and management on Bitcoin.
//! It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` TLDs.
//!
//! ## Important: OP_RETURN Not Supported
//!
//! DNS domains use UTXO-based ownership. The first output (vout 0) of the registration
//! transaction becomes the ownership UTXO. Since OP_RETURN outputs are unspendable,
//! they cannot be used for DNS operations.
//!
//! ## Payload Format
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                       DNS PAYLOAD                                │
//! ├───────────┬───────────┬───────────────────┬─────────────────────┤
//! │ Operation │ Name Len  │ Domain Name       │ Records...          │
//! │ (1 byte)  │ (1 byte)  │ (name_len bytes)  │ (variable)          │
//! ├───────────┼───────────┼───────────────────┼─────────────────────┤
//! │ 01/02/03  │ 00-FF     │ UTF-8 string      │ [record][record]... │
//! └───────────┴───────────┴───────────────────┴─────────────────────┘
//! ```
//!
//! ## Record Format
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                       DNS RECORD                                 │
//! ├───────────┬───────────┬───────────┬─────────────────────────────┤
//! │ Type      │ TTL       │ Data Len  │ Record Data                 │
//! │ (1 byte)  │ (2 bytes) │ (1 byte)  │ (data_len bytes)            │
//! └───────────┴───────────┴───────────┴─────────────────────────────┘
//! ```

use crate::error::{Result, SpecError};
use crate::validation::{AnchorableSpec, KindSpec, OwnedSpec};
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};
use std::net::{Ipv4Addr, Ipv6Addr};

/// Supported TLDs for Anchor Domains
pub const SUPPORTED_TLDS: &[&str] = &[".btc", ".sat", ".anchor", ".anc", ".bit"];

/// Maximum domain name length (including TLD)
pub const MAX_DOMAIN_LENGTH: usize = 255;

/// DNS Operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum DnsOperation {
    /// Register a new domain (first-come-first-served)
    Register = 0x01,
    /// Update existing domain records (must anchor to ownership UTXO)
    Update = 0x02,
    /// Transfer domain ownership to a new address
    Transfer = 0x03,
}

impl TryFrom<u8> for DnsOperation {
    type Error = SpecError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(DnsOperation::Register),
            0x02 => Ok(DnsOperation::Update),
            0x03 => Ok(DnsOperation::Transfer),
            _ => Err(SpecError::InvalidOperation(value)),
        }
    }
}

/// DNS Record Types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum RecordType {
    /// IPv4 address (4 bytes)
    A = 1,
    /// IPv6 address (16 bytes)
    AAAA = 2,
    /// Canonical name (UTF-8 string)
    CNAME = 3,
    /// Text record (UTF-8 string)
    TXT = 4,
    /// Mail exchange (u16 priority + UTF-8 domain)
    MX = 5,
    /// Name server (UTF-8 string)
    NS = 6,
    /// Service record (u16×3 + UTF-8 target)
    SRV = 7,
}

impl TryFrom<u8> for RecordType {
    type Error = SpecError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            1 => Ok(RecordType::A),
            2 => Ok(RecordType::AAAA),
            3 => Ok(RecordType::CNAME),
            4 => Ok(RecordType::TXT),
            5 => Ok(RecordType::MX),
            6 => Ok(RecordType::NS),
            7 => Ok(RecordType::SRV),
            _ => Err(SpecError::InvalidRecordType(value)),
        }
    }
}

impl RecordType {
    /// Get the human-readable name
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
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

impl DnsRecord {
    /// Create an A record (IPv4)
    pub fn a(ip: &str, ttl: u16) -> Result<Self> {
        ip.parse::<Ipv4Addr>()
            .map_err(|_| SpecError::InvalidIpv4(ip.to_string()))?;
        Ok(Self {
            record_type: RecordType::A,
            ttl,
            value: ip.to_string(),
            priority: None,
            weight: None,
            port: None,
        })
    }

    /// Create an AAAA record (IPv6)
    pub fn aaaa(ip: &str, ttl: u16) -> Result<Self> {
        ip.parse::<Ipv6Addr>()
            .map_err(|_| SpecError::InvalidIpv6(ip.to_string()))?;
        Ok(Self {
            record_type: RecordType::AAAA,
            ttl,
            value: ip.to_string(),
            priority: None,
            weight: None,
            port: None,
        })
    }

    /// Create a CNAME record
    pub fn cname(target: &str, ttl: u16) -> Self {
        Self {
            record_type: RecordType::CNAME,
            ttl,
            value: target.to_string(),
            priority: None,
            weight: None,
            port: None,
        }
    }

    /// Create a TXT record
    pub fn txt(text: &str, ttl: u16) -> Self {
        Self {
            record_type: RecordType::TXT,
            ttl,
            value: text.to_string(),
            priority: None,
            weight: None,
            port: None,
        }
    }

    /// Create an MX record
    pub fn mx(domain: &str, priority: u16, ttl: u16) -> Self {
        Self {
            record_type: RecordType::MX,
            ttl,
            value: domain.to_string(),
            priority: Some(priority),
            weight: None,
            port: None,
        }
    }

    /// Create an NS record
    pub fn ns(nameserver: &str, ttl: u16) -> Self {
        Self {
            record_type: RecordType::NS,
            ttl,
            value: nameserver.to_string(),
            priority: None,
            weight: None,
            port: None,
        }
    }

    /// Create an SRV record
    pub fn srv(target: &str, priority: u16, weight: u16, port: u16, ttl: u16) -> Self {
        Self {
            record_type: RecordType::SRV,
            ttl,
            value: target.to_string(),
            priority: Some(priority),
            weight: Some(weight),
            port: Some(port),
        }
    }

    /// Validate the record
    pub fn validate(&self) -> Result<()> {
        match self.record_type {
            RecordType::A => {
                self.value
                    .parse::<Ipv4Addr>()
                    .map_err(|_| SpecError::InvalidIpv4(self.value.clone()))?;
            }
            RecordType::AAAA => {
                self.value
                    .parse::<Ipv6Addr>()
                    .map_err(|_| SpecError::InvalidIpv6(self.value.clone()))?;
            }
            RecordType::MX => {
                if self.priority.is_none() {
                    return Err(SpecError::InvalidDnsRecord(
                        "MX record requires priority".to_string(),
                    ));
                }
            }
            RecordType::SRV => {
                if self.priority.is_none() || self.weight.is_none() || self.port.is_none() {
                    return Err(SpecError::InvalidDnsRecord(
                        "SRV record requires priority, weight, and port".to_string(),
                    ));
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// Encode record data to bytes
    fn encode_data(&self) -> Vec<u8> {
        match self.record_type {
            RecordType::A => {
                if let Ok(ip) = self.value.parse::<Ipv4Addr>() {
                    ip.octets().to_vec()
                } else {
                    Vec::new()
                }
            }
            RecordType::AAAA => {
                if let Ok(ip) = self.value.parse::<Ipv6Addr>() {
                    ip.octets().to_vec()
                } else {
                    Vec::new()
                }
            }
            RecordType::CNAME | RecordType::NS | RecordType::TXT => self.value.as_bytes().to_vec(),
            RecordType::MX => {
                let mut data = Vec::new();
                data.extend_from_slice(&self.priority.unwrap_or(10).to_be_bytes());
                data.extend_from_slice(self.value.as_bytes());
                data
            }
            RecordType::SRV => {
                let mut data = Vec::new();
                data.extend_from_slice(&self.priority.unwrap_or(0).to_be_bytes());
                data.extend_from_slice(&self.weight.unwrap_or(0).to_be_bytes());
                data.extend_from_slice(&self.port.unwrap_or(0).to_be_bytes());
                data.extend_from_slice(self.value.as_bytes());
                data
            }
        }
    }

    /// Encode the full record (type + ttl + len + data)
    pub fn to_bytes(&self) -> Vec<u8> {
        let data = self.encode_data();
        let mut result = Vec::with_capacity(4 + data.len());
        result.push(self.record_type as u8);
        result.extend_from_slice(&self.ttl.to_be_bytes());
        result.push(data.len() as u8);
        result.extend_from_slice(&data);
        result
    }

    /// Parse a record from bytes at the given offset
    /// Returns (record, bytes_consumed)
    pub fn from_bytes_at(bytes: &[u8], offset: usize) -> Result<(Self, usize)> {
        if bytes.len() < offset + 4 {
            return Err(SpecError::PayloadTooShort {
                expected: offset + 4,
                actual: bytes.len(),
            });
        }

        let record_type = RecordType::try_from(bytes[offset])?;
        let ttl = u16::from_be_bytes([bytes[offset + 1], bytes[offset + 2]]);
        let data_len = bytes[offset + 3] as usize;

        if bytes.len() < offset + 4 + data_len {
            return Err(SpecError::PayloadTooShort {
                expected: offset + 4 + data_len,
                actual: bytes.len(),
            });
        }

        let data = &bytes[offset + 4..offset + 4 + data_len];
        let record = Self::parse_data(record_type, ttl, data)?;

        Ok((record, 4 + data_len))
    }

    fn parse_data(record_type: RecordType, ttl: u16, data: &[u8]) -> Result<Self> {
        let (value, priority, weight, port) = match record_type {
            RecordType::A => {
                if data.len() != 4 {
                    return Err(SpecError::InvalidDnsRecord(format!(
                        "A record must be 4 bytes, got {}",
                        data.len()
                    )));
                }
                let ip = Ipv4Addr::new(data[0], data[1], data[2], data[3]);
                (ip.to_string(), None, None, None)
            }
            RecordType::AAAA => {
                if data.len() != 16 {
                    return Err(SpecError::InvalidDnsRecord(format!(
                        "AAAA record must be 16 bytes, got {}",
                        data.len()
                    )));
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
                let value = String::from_utf8(data.to_vec())?;
                (value, None, None, None)
            }
            RecordType::MX => {
                if data.len() < 3 {
                    return Err(SpecError::InvalidDnsRecord(
                        "MX record too short".to_string(),
                    ));
                }
                let priority = u16::from_be_bytes([data[0], data[1]]);
                let domain = String::from_utf8(data[2..].to_vec())?;
                (domain, Some(priority), None, None)
            }
            RecordType::SRV => {
                if data.len() < 7 {
                    return Err(SpecError::InvalidDnsRecord(
                        "SRV record too short".to_string(),
                    ));
                }
                let priority = u16::from_be_bytes([data[0], data[1]]);
                let weight = u16::from_be_bytes([data[2], data[3]]);
                let port = u16::from_be_bytes([data[4], data[5]]);
                let target = String::from_utf8(data[6..].to_vec())?;
                (target, Some(priority), Some(weight), Some(port))
            }
        };

        Ok(Self {
            record_type,
            ttl,
            value,
            priority,
            weight,
            port,
        })
    }
}

/// DNS specification (Kind 10)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DnsSpec {
    pub operation: DnsOperation,
    pub name: String,
    pub records: Vec<DnsRecord>,
}

impl DnsSpec {
    /// Create a new domain registration
    pub fn register(name: impl Into<String>, records: Vec<DnsRecord>) -> Self {
        Self {
            operation: DnsOperation::Register,
            name: name.into(),
            records,
        }
    }

    /// Create a domain update
    pub fn update(name: impl Into<String>, records: Vec<DnsRecord>) -> Self {
        Self {
            operation: DnsOperation::Update,
            name: name.into(),
            records,
        }
    }

    /// Create a domain transfer
    pub fn transfer(name: impl Into<String>) -> Self {
        Self {
            operation: DnsOperation::Transfer,
            name: name.into(),
            records: Vec::new(),
        }
    }
}

impl KindSpec for DnsSpec {
    const KIND_ID: u8 = 10;
    const KIND_NAME: &'static str = "DNS";

    fn from_bytes(body: &[u8]) -> Result<Self> {
        if body.len() < 3 {
            return Err(SpecError::PayloadTooShort {
                expected: 3,
                actual: body.len(),
            });
        }

        let operation = DnsOperation::try_from(body[0])?;
        let name_len = body[1] as usize;

        if body.len() < 2 + name_len {
            return Err(SpecError::PayloadTooShort {
                expected: 2 + name_len,
                actual: body.len(),
            });
        }

        let name = String::from_utf8(body[2..2 + name_len].to_vec())?;

        // Parse records
        let mut records = Vec::new();
        let mut offset = 2 + name_len;

        while offset + 4 <= body.len() {
            let (record, consumed) = DnsRecord::from_bytes_at(body, offset)?;
            records.push(record);
            offset += consumed;
        }

        Ok(Self {
            operation,
            name,
            records,
        })
    }

    fn to_bytes(&self) -> Vec<u8> {
        let name_bytes = self.name.as_bytes();
        let mut result = Vec::new();

        result.push(self.operation as u8);
        result.push(name_bytes.len() as u8);
        result.extend_from_slice(name_bytes);

        for record in &self.records {
            result.extend_from_slice(&record.to_bytes());
        }

        result
    }

    fn validate(&self) -> Result<()> {
        validate_domain_name(&self.name)?;

        for record in &self.records {
            record.validate()?;
        }

        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        // OP_RETURN is NOT supported because DNS uses UTXO-based ownership
        &[
            CarrierType::WitnessData,
            CarrierType::Inscription,
            CarrierType::Stamps,
        ]
    }

    fn recommended_carrier() -> CarrierType {
        CarrierType::WitnessData
    }
}

impl AnchorableSpec for DnsSpec {
    fn requires_anchor(&self) -> bool {
        matches!(
            self.operation,
            DnsOperation::Update | DnsOperation::Transfer
        )
    }
}

impl OwnedSpec for DnsSpec {}

// ============================================================================
// Validation Functions
// ============================================================================

/// Validate a domain name
pub fn validate_domain_name(name: &str) -> Result<()> {
    // Must end with a supported TLD
    let tld = get_tld(name).ok_or_else(|| {
        let parts: Vec<&str> = name.split('.').collect();
        let tld_part = parts.last().map(|s| format!(".{}", s)).unwrap_or_default();
        SpecError::UnsupportedTld(tld_part)
    })?;

    // Get the name part (without TLD)
    let name_part = &name[..name.len() - tld.len()];

    // Must be at least 1 character
    if name_part.is_empty() {
        return Err(SpecError::InvalidDomainName(
            "Domain name cannot be empty".to_string(),
        ));
    }

    // Max 255 bytes total
    if name.len() > MAX_DOMAIN_LENGTH {
        return Err(SpecError::InvalidDomainName(format!(
            "Domain name too long: {} bytes (max {})",
            name.len(),
            MAX_DOMAIN_LENGTH
        )));
    }

    // Only allow alphanumeric, hyphens, and dots (for subdomains)
    let valid_chars = name_part
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.');

    if !valid_chars {
        return Err(SpecError::InvalidDomainName(
            "Domain name contains invalid characters".to_string(),
        ));
    }

    // Cannot start or end with hyphen
    if name_part.starts_with('-')
        || name_part.ends_with('-')
        || name_part.contains(".-")
        || name_part.contains("-.")
    {
        return Err(SpecError::InvalidDomainName(
            "Domain labels cannot start or end with hyphens".to_string(),
        ));
    }

    Ok(())
}

/// Get the TLD from a domain name if it's supported
pub fn get_tld(name: &str) -> Option<&'static str> {
    SUPPORTED_TLDS
        .iter()
        .find(|tld| name.ends_with(*tld))
        .copied()
}

/// Check if a domain name is valid
pub fn is_valid_domain_name(name: &str) -> bool {
    validate_domain_name(name).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dns_roundtrip() {
        let original = DnsSpec::register(
            "test.btc",
            vec![DnsRecord::a("93.184.216.34", 3600).unwrap()],
        );

        let bytes = original.to_bytes();
        let parsed = DnsSpec::from_bytes(&bytes).unwrap();

        assert_eq!(original, parsed);
    }

    #[test]
    fn test_valid_domains() {
        assert!(is_valid_domain_name("test.btc"));
        assert!(is_valid_domain_name("my-site.btc"));
        assert!(is_valid_domain_name("sub.domain.btc"));
        assert!(is_valid_domain_name("test.sat"));
        assert!(is_valid_domain_name("test.anchor"));
        assert!(is_valid_domain_name("test.anc"));
        assert!(is_valid_domain_name("test.bit"));
    }

    #[test]
    fn test_invalid_domains() {
        assert!(!is_valid_domain_name("test.com")); // unsupported TLD
        assert!(!is_valid_domain_name(".btc")); // empty name
        assert!(!is_valid_domain_name("-test.btc")); // starts with hyphen
        assert!(!is_valid_domain_name("test-.sat")); // ends with hyphen
    }

    #[test]
    fn test_carrier_restrictions() {
        assert!(!DnsSpec::supported_carriers().contains(&CarrierType::OpReturn));
        assert!(DnsSpec::supported_carriers().contains(&CarrierType::WitnessData));
        assert!(DnsSpec::supported_carriers().contains(&CarrierType::Inscription));
    }

    #[test]
    fn test_requires_anchor() {
        let register = DnsSpec::register("test.btc", vec![]);
        assert!(!register.requires_anchor());

        let update = DnsSpec::update("test.btc", vec![]);
        assert!(update.requires_anchor());

        let transfer = DnsSpec::transfer("test.btc");
        assert!(transfer.requires_anchor());
    }

    #[test]
    fn test_multiple_records() {
        let spec = DnsSpec::register(
            "example.btc",
            vec![
                DnsRecord::a("93.184.216.34", 3600).unwrap(),
                DnsRecord::txt("Hello from Bitcoin!", 300),
                DnsRecord::mx("mail.example.btc", 10, 3600),
            ],
        );

        let bytes = spec.to_bytes();
        let parsed = DnsSpec::from_bytes(&bytes).unwrap();

        assert_eq!(parsed.records.len(), 3);
        assert_eq!(parsed.records[0].record_type, RecordType::A);
        assert_eq!(parsed.records[1].record_type, RecordType::TXT);
        assert_eq!(parsed.records[2].record_type, RecordType::MX);
    }
}
