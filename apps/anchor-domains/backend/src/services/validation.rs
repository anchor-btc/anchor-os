//! Validation helpers for the Anchor Domains API
//!
//! This module provides reusable validation functions to reduce code duplication
//! across handlers.

use crate::error::{AppError, AppResult};
use crate::models::{is_valid_domain_name, is_txid_prefix, DnsRecord, DnsRecordInput, SUPPORTED_TLDS};

/// Validate a domain name and return an error if invalid
pub fn validate_domain_name(name: &str) -> AppResult<()> {
    if !is_valid_domain_name(name) {
        return Err(AppError::bad_request(format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }
    Ok(())
}

/// Validate a txid prefix and return an error if invalid
pub fn validate_txid_prefix(prefix: &str) -> AppResult<()> {
    if !is_txid_prefix(prefix) {
        return Err(AppError::bad_request(
            "Invalid txid prefix (must be 16 hex characters)",
        ));
    }
    Ok(())
}

/// Convert and validate DNS record inputs to DnsRecord
/// Returns an error if no valid records are provided
pub fn validate_records(inputs: &[DnsRecordInput]) -> AppResult<Vec<DnsRecord>> {
    let records: Vec<DnsRecord> = inputs
        .iter()
        .filter_map(|r| r.to_dns_record())
        .collect();

    if records.is_empty() {
        return Err(AppError::bad_request(
            "At least one valid record is required",
        ));
    }

    Ok(records)
}

/// Parse a comma-separated list of txids (hex-encoded)
pub fn parse_txid_list(txids_str: &str) -> AppResult<Vec<Vec<u8>>> {
    let txid_strings: Vec<&str> = txids_str.split(',').collect();
    
    let txids: Result<Vec<Vec<u8>>, _> = txid_strings
        .iter()
        .filter(|s| !s.is_empty())
        .map(|txid| hex::decode(txid.trim()))
        .collect();

    txids.map_err(|e| AppError::bad_request(format!("Invalid txid hex format: {}", e)))
}

/// Parse a list of txids from a Vec<String>
pub fn parse_txids(txids: &[String]) -> AppResult<Vec<Vec<u8>>> {
    let result: Result<Vec<Vec<u8>>, _> = txids
        .iter()
        .map(hex::decode)
        .collect();

    result.map_err(|e| AppError::bad_request(format!("Invalid txid hex format: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_domain_name() {
        assert!(validate_domain_name("test.btc").is_ok());
        assert!(validate_domain_name("test.sat").is_ok());
        assert!(validate_domain_name("test.com").is_err());
    }

    #[test]
    fn test_validate_txid_prefix() {
        assert!(validate_txid_prefix("a1b2c3d4e5f67890").is_ok());
        assert!(validate_txid_prefix("a1b2c3d4").is_err());
        assert!(validate_txid_prefix("g1b2c3d4e5f67890").is_err());
    }

    #[test]
    fn test_parse_txid_list() {
        let result = parse_txid_list("aabb,ccdd").unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0], vec![0xaa, 0xbb]);
        assert_eq!(result[1], vec![0xcc, 0xdd]);
    }

    #[test]
    fn test_validate_records_empty() {
        let inputs: Vec<DnsRecordInput> = vec![];
        assert!(validate_records(&inputs).is_err());
    }
}

