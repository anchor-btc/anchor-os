//! Data models for the AnchorProofs API

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Proof Operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[repr(u8)]
pub enum ProofOperation {
    /// Register a new proof of existence
    Stamp = 0x01,
    /// Revoke an existing proof
    Revoke = 0x02,
    /// Batch multiple proofs in single TX
    Batch = 0x03,
}

impl TryFrom<u8> for ProofOperation {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0x01 => Ok(ProofOperation::Stamp),
            0x02 => Ok(ProofOperation::Revoke),
            0x03 => Ok(ProofOperation::Batch),
            _ => Err("Invalid proof operation"),
        }
    }
}

/// Hash Algorithms
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[repr(u8)]
pub enum HashAlgorithm {
    /// SHA-256 (32 bytes)
    Sha256 = 0x01,
    /// SHA-512 (64 bytes)
    Sha512 = 0x02,
}

impl TryFrom<u8> for HashAlgorithm {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0x01 => Ok(HashAlgorithm::Sha256),
            0x02 => Ok(HashAlgorithm::Sha512),
            _ => Err("Invalid hash algorithm"),
        }
    }
}

impl HashAlgorithm {
    pub fn name(&self) -> &'static str {
        match self {
            HashAlgorithm::Sha256 => "SHA-256",
            HashAlgorithm::Sha512 => "SHA-512",
        }
    }

    pub fn hash_size(&self) -> usize {
        match self {
            HashAlgorithm::Sha256 => 32,
            HashAlgorithm::Sha512 => 64,
        }
    }
}

/// Proof metadata
#[derive(Debug, Clone, Default)]
pub struct ProofMetadata {
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<u64>,
    pub description: Option<String>,
}

impl ProofMetadata {
    /// Parse metadata from binary data
    pub fn from_bytes(bytes: &[u8], offset: usize) -> Option<(Self, usize)> {
        let mut pos = offset;

        // Filename
        if bytes.len() < pos + 1 {
            return None;
        }
        let filename_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + filename_len {
            return None;
        }
        let filename = if filename_len > 0 {
            String::from_utf8(bytes[pos..pos + filename_len].to_vec()).ok()
        } else {
            None
        };
        pos += filename_len;

        // MIME type
        if bytes.len() < pos + 1 {
            return None;
        }
        let mime_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + mime_len {
            return None;
        }
        let mime_type = if mime_len > 0 {
            String::from_utf8(bytes[pos..pos + mime_len].to_vec()).ok()
        } else {
            None
        };
        pos += mime_len;

        // File size (8 bytes, big-endian)
        if bytes.len() < pos + 8 {
            return None;
        }
        let file_size = u64::from_be_bytes(bytes[pos..pos + 8].try_into().ok()?);
        let file_size = if file_size > 0 { Some(file_size) } else { None };
        pos += 8;

        // Description
        if bytes.len() < pos + 1 {
            return None;
        }
        let desc_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + desc_len {
            return None;
        }
        let description = if desc_len > 0 {
            String::from_utf8(bytes[pos..pos + desc_len].to_vec()).ok()
        } else {
            None
        };
        pos += desc_len;

        Some((
            ProofMetadata {
                filename,
                mime_type,
                file_size,
                description,
            },
            pos - offset,
        ))
    }

    /// Encode metadata to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut result = Vec::new();

        // Filename
        let filename_bytes = self.filename.as_ref().map(|s| s.as_bytes()).unwrap_or(&[]);
        result.push(filename_bytes.len().min(255) as u8);
        result.extend_from_slice(&filename_bytes[..filename_bytes.len().min(255)]);

        // MIME type
        let mime_bytes = self.mime_type.as_ref().map(|s| s.as_bytes()).unwrap_or(&[]);
        result.push(mime_bytes.len().min(255) as u8);
        result.extend_from_slice(&mime_bytes[..mime_bytes.len().min(255)]);

        // File size
        result.extend_from_slice(&self.file_size.unwrap_or(0).to_be_bytes());

        // Description
        let desc_bytes = self.description.as_ref().map(|s| s.as_bytes()).unwrap_or(&[]);
        result.push(desc_bytes.len().min(255) as u8);
        result.extend_from_slice(&desc_bytes[..desc_bytes.len().min(255)]);

        result
    }
}

/// Single proof entry
#[derive(Debug, Clone)]
pub struct ProofEntry {
    pub algorithm: HashAlgorithm,
    pub hash: Vec<u8>,
    pub metadata: ProofMetadata,
}

/// Proof Payload (parsed from Anchor message body)
#[derive(Debug, Clone)]
pub struct ProofPayload {
    pub operation: ProofOperation,
    pub entries: Vec<ProofEntry>,
}

impl ProofPayload {
    /// Parse a proof payload from binary data
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 2 {
            return None;
        }

        let operation = ProofOperation::try_from(bytes[0]).ok()?;

        match operation {
            ProofOperation::Batch => {
                let count = bytes[1] as usize;
                let mut entries = Vec::with_capacity(count);
                let mut offset = 2;

                for _ in 0..count {
                    if bytes.len() < offset + 1 {
                        return None;
                    }
                    let algorithm = HashAlgorithm::try_from(bytes[offset]).ok()?;
                    offset += 1;

                    let hash_size = algorithm.hash_size();
                    if bytes.len() < offset + hash_size {
                        return None;
                    }
                    let hash = bytes[offset..offset + hash_size].to_vec();
                    offset += hash_size;

                    let (metadata, meta_len) = ProofMetadata::from_bytes(bytes, offset)?;
                    offset += meta_len;

                    entries.push(ProofEntry {
                        algorithm,
                        hash,
                        metadata,
                    });
                }

                Some(ProofPayload { operation, entries })
            }
            ProofOperation::Stamp | ProofOperation::Revoke => {
                let mut offset = 1;

                if bytes.len() < offset + 1 {
                    return None;
                }
                let algorithm = HashAlgorithm::try_from(bytes[offset]).ok()?;
                offset += 1;

                let hash_size = algorithm.hash_size();
                if bytes.len() < offset + hash_size {
                    return None;
                }
                let hash = bytes[offset..offset + hash_size].to_vec();
                offset += hash_size;

                let (metadata, _) = ProofMetadata::from_bytes(bytes, offset)?;

                Some(ProofPayload {
                    operation,
                    entries: vec![ProofEntry {
                        algorithm,
                        hash,
                        metadata,
                    }],
                })
            }
        }
    }

    /// Encode the payload to binary
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut result = Vec::new();

        match self.operation {
            ProofOperation::Batch => {
                result.push(ProofOperation::Batch as u8);
                result.push(self.entries.len() as u8);

                for entry in &self.entries {
                    result.push(entry.algorithm as u8);
                    result.extend_from_slice(&entry.hash);
                    result.extend_from_slice(&entry.metadata.to_bytes());
                }
            }
            _ => {
                result.push(self.operation as u8);

                if let Some(entry) = self.entries.first() {
                    result.push(entry.algorithm as u8);
                    result.extend_from_slice(&entry.hash);
                    result.extend_from_slice(&entry.metadata.to_bytes());
                }
            }
        }

        result
    }
}

// ============================================================================
// API Response Types
// ============================================================================

/// Proof information
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

/// Proof list item
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

        Some(ProofEntry {
            algorithm,
            hash,
            metadata: ProofMetadata {
                filename: self.filename.clone(),
                mime_type: self.mime_type.clone(),
                file_size: self.file_size.map(|s| s as u64),
                description: self.description.clone(),
            },
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

/// Validate request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ValidateRequest {
    pub hash_algo: String,
    pub file_hash: String,
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
    fn test_proof_payload_roundtrip() {
        let payload = ProofPayload {
            operation: ProofOperation::Stamp,
            entries: vec![ProofEntry {
                algorithm: HashAlgorithm::Sha256,
                hash: vec![0u8; 32],
                metadata: ProofMetadata {
                    filename: Some("test.pdf".to_string()),
                    mime_type: Some("application/pdf".to_string()),
                    file_size: Some(12345),
                    description: Some("Test document".to_string()),
                },
            }],
        };

        let bytes = payload.to_bytes();
        let decoded = ProofPayload::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.operation, ProofOperation::Stamp);
        assert_eq!(decoded.entries.len(), 1);
        assert_eq!(decoded.entries[0].algorithm, HashAlgorithm::Sha256);
        assert_eq!(
            decoded.entries[0].metadata.filename,
            Some("test.pdf".to_string())
        );
    }

    #[test]
    fn test_batch_payload() {
        let payload = ProofPayload {
            operation: ProofOperation::Batch,
            entries: vec![
                ProofEntry {
                    algorithm: HashAlgorithm::Sha256,
                    hash: vec![1u8; 32],
                    metadata: ProofMetadata::default(),
                },
                ProofEntry {
                    algorithm: HashAlgorithm::Sha512,
                    hash: vec![2u8; 64],
                    metadata: ProofMetadata {
                        filename: Some("doc.txt".to_string()),
                        ..Default::default()
                    },
                },
            ],
        };

        let bytes = payload.to_bytes();
        let decoded = ProofPayload::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.operation, ProofOperation::Batch);
        assert_eq!(decoded.entries.len(), 2);
        assert_eq!(decoded.entries[0].algorithm, HashAlgorithm::Sha256);
        assert_eq!(decoded.entries[1].algorithm, HashAlgorithm::Sha512);
    }

    #[test]
    fn test_hash_algorithm() {
        assert_eq!(HashAlgorithm::Sha256.hash_size(), 32);
        assert_eq!(HashAlgorithm::Sha512.hash_size(), 64);
        assert_eq!(HashAlgorithm::Sha256.name(), "SHA-256");
        assert_eq!(HashAlgorithm::Sha512.name(), "SHA-512");
    }
}
