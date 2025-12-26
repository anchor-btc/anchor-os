//! API request and response types for AnchorProofs

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{HashAlgorithm, ProofEntry, ProofMetadata};

// ============================================================================
// Response Types
// ============================================================================

/// Proof information (full details)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Proof {
    pub id: i32,
    pub hash_algo: i16,
    pub hash_algo_name: String,
    pub file_hash: String,
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub description: Option<String>,
    pub txid: String,
    pub txid_prefix: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub is_revoked: bool,
    pub revoked_txid: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Proof list item (lighter version for lists)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProofListItem {
    pub id: i32,
    pub hash_algo: i16,
    pub hash_algo_name: String,
    pub file_hash: String,
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub txid: String,
    pub txid_prefix: String,
    pub block_height: Option<i32>,
    pub is_revoked: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub proof: Option<Proof>,
}

/// AnchorProof statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProofStats {
    pub total_proofs: i64,
    pub active_proofs: i64,
    pub revoked_proofs: i64,
    pub sha256_proofs: i64,
    pub sha512_proofs: i64,
    pub total_transactions: i64,
    pub last_block_height: Option<i32>,
    pub last_update: Option<chrono::DateTime<chrono::Utc>>,
    pub total_file_size: i64,
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

/// Create transaction response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTxResponse {
    pub txid: String,
    pub vout: i32,
    pub hex: String,
    pub carrier: i32,
    pub carrier_name: String,
}

/// Response for "My Proofs" endpoint
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetProofsByAddressResponse {
    pub proofs: Vec<ProofListItem>,
    pub total_proofs: i64,
    pub unique_transactions: i64,
    pub page: i32,
    pub per_page: i32,
}

// ============================================================================
// Request Types
// ============================================================================

/// Pagination parameters
#[derive(Debug, Clone, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    pub search: Option<String>,
    #[serde(default)]
    pub include_revoked: bool,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    50
}

/// Stamp proof request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct StampRequest {
    pub hash_algo: String, // "sha256" or "sha512"
    pub file_hash: String, // hex encoded hash
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub description: Option<String>,
    #[serde(default)]
    pub carrier: Option<u8>,
}

impl StampRequest {
    /// Convert to a ProofEntry from anchor-specs
    pub fn to_proof_entry(&self) -> Option<ProofEntry> {
        let algorithm = match self.hash_algo.to_lowercase().as_str() {
            "sha256" | "sha-256" => HashAlgorithm::Sha256,
            "sha512" | "sha-512" => HashAlgorithm::Sha512,
            _ => return None,
        };

        let hash = hex::decode(&self.file_hash).ok()?;
        if hash.len() != algorithm.hash_size() {
            return None;
        }

        // Build metadata, filtering out empty values
        let metadata = ProofMetadata {
            filename: self.filename.clone().filter(|s| !s.is_empty()),
            mime_type: self.mime_type.clone().filter(|s| !s.is_empty()),
            file_size: self.file_size.filter(|&s| s > 0).map(|s| s as u64),
            description: self.description.clone().filter(|s| !s.is_empty()),
        };

        Some(ProofEntry {
            algorithm,
            hash,
            metadata,
        })
    }
}

/// Batch stamp request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BatchStampRequest {
    pub entries: Vec<StampRequest>,
    #[serde(default)]
    pub carrier: Option<u8>,
}

/// Revoke proof request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RevokeRequest {
    pub hash_algo: String,
    pub file_hash: String,
    #[serde(default)]
    pub carrier: Option<u8>,
}

impl RevokeRequest {
    /// Parse the hash algorithm
    pub fn parse_algorithm(&self) -> Option<HashAlgorithm> {
        match self.hash_algo.to_lowercase().as_str() {
            "sha256" | "sha-256" => Some(HashAlgorithm::Sha256),
            "sha512" | "sha-512" => Some(HashAlgorithm::Sha512),
            _ => None,
        }
    }
}

/// Validate request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ValidateRequest {
    pub hash_algo: String,
    pub file_hash: String,
}

impl ValidateRequest {
    /// Parse the hash algorithm
    pub fn parse_algorithm(&self) -> Option<HashAlgorithm> {
        match self.hash_algo.to_lowercase().as_str() {
            "sha256" | "sha-256" => Some(HashAlgorithm::Sha256),
            "sha512" | "sha-512" => Some(HashAlgorithm::Sha512),
            _ => None,
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_specs::proof::ProofSpec;
    use anchor_specs::KindSpec;

    #[test]
    fn test_proof_payload_roundtrip() {
        let entry = ProofEntry {
            algorithm: HashAlgorithm::Sha256,
            hash: vec![0u8; 32],
            metadata: ProofMetadata {
                filename: Some("test.pdf".to_string()),
                mime_type: Some("application/pdf".to_string()),
                file_size: Some(12345),
                description: Some("Test document".to_string()),
            },
        };
        let payload = ProofSpec::stamp(entry);

        let bytes = payload.to_bytes();
        let decoded = ProofSpec::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.operation, super::super::ProofOperation::Stamp);
        assert_eq!(decoded.entries.len(), 1);
        assert_eq!(decoded.entries[0].algorithm, HashAlgorithm::Sha256);
        assert_eq!(
            decoded.entries[0].metadata.filename,
            Some("test.pdf".to_string())
        );
    }

    #[test]
    fn test_hash_algorithm() {
        assert_eq!(HashAlgorithm::Sha256.hash_size(), 32);
        assert_eq!(HashAlgorithm::Sha512.hash_size(), 64);
        assert_eq!(HashAlgorithm::Sha256.name(), "SHA-256");
        assert_eq!(HashAlgorithm::Sha512.name(), "SHA-512");
    }

    #[test]
    fn test_stamp_request_to_proof_entry() {
        let req = StampRequest {
            hash_algo: "sha256".to_string(),
            file_hash: "a".repeat(64), // 32 bytes = 64 hex chars
            filename: Some("test.txt".to_string()),
            mime_type: None,
            file_size: Some(100),
            description: None,
            carrier: None,
        };

        let entry = req.to_proof_entry();
        assert!(entry.is_some());
        let entry = entry.unwrap();
        assert_eq!(entry.algorithm, HashAlgorithm::Sha256);
        assert_eq!(entry.metadata.filename, Some("test.txt".to_string()));
    }
}
