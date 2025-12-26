//! Kind 11: Proof of Existence Specification
//!
//! The Proof kind enables timestamping and proof of existence on Bitcoin.
//! Files are hashed locally and only the hash is stored on-chain.
//!
//! ## Operations
//!
//! | Operation | Value | Description |
//! |-----------|-------|-------------|
//! | STAMP | 0x01 | Register a new proof |
//! | REVOKE | 0x02 | Revoke an existing proof |
//! | BATCH | 0x03 | Multiple proofs in one TX |
//!
//! ## Payload Format
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                    PROOF PAYLOAD (STAMP/REVOKE)                  │
//! ├───────────┬───────────┬───────────────────┬─────────────────────┤
//! │ Operation │ Algorithm │ Hash              │ Metadata            │
//! │ (1 byte)  │ (1 byte)  │ (32/64 bytes)     │ (variable)          │
//! └───────────┴───────────┴───────────────────┴─────────────────────┘
//! ```

use crate::error::{Result, SpecError};
use crate::validation::KindSpec;
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};

/// Proof operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
    type Error = SpecError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(ProofOperation::Stamp),
            0x02 => Ok(ProofOperation::Revoke),
            0x03 => Ok(ProofOperation::Batch),
            _ => Err(SpecError::InvalidProofOperation(value)),
        }
    }
}

/// Hash algorithms
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum HashAlgorithm {
    /// SHA-256 (32 bytes)
    Sha256 = 0x01,
    /// SHA-512 (64 bytes)
    Sha512 = 0x02,
}

impl TryFrom<u8> for HashAlgorithm {
    type Error = SpecError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(HashAlgorithm::Sha256),
            0x02 => Ok(HashAlgorithm::Sha512),
            _ => Err(SpecError::InvalidHashAlgorithm(value)),
        }
    }
}

impl HashAlgorithm {
    /// Get the human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            HashAlgorithm::Sha256 => "SHA-256",
            HashAlgorithm::Sha512 => "SHA-512",
        }
    }

    /// Get the expected hash size in bytes
    pub fn hash_size(&self) -> usize {
        match self {
            HashAlgorithm::Sha256 => 32,
            HashAlgorithm::Sha512 => 64,
        }
    }
}

/// Proof metadata
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProofMetadata {
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<u64>,
    pub description: Option<String>,
}

impl ProofMetadata {
    /// Create new metadata
    pub fn new() -> Self {
        Self::default()
    }

    /// Set filename
    pub fn with_filename(mut self, filename: impl Into<String>) -> Self {
        self.filename = Some(filename.into());
        self
    }

    /// Set MIME type
    pub fn with_mime_type(mut self, mime_type: impl Into<String>) -> Self {
        self.mime_type = Some(mime_type.into());
        self
    }

    /// Set file size
    pub fn with_file_size(mut self, size: u64) -> Self {
        self.file_size = Some(size);
        self
    }

    /// Set description
    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    /// Parse metadata from bytes at offset
    /// Returns (metadata, bytes_consumed)
    pub fn from_bytes_at(bytes: &[u8], offset: usize) -> Result<(Self, usize)> {
        let mut pos = offset;

        // Filename
        if bytes.len() < pos + 1 {
            return Err(SpecError::PayloadTooShort {
                expected: pos + 1,
                actual: bytes.len(),
            });
        }
        let filename_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + filename_len {
            return Err(SpecError::PayloadTooShort {
                expected: pos + filename_len,
                actual: bytes.len(),
            });
        }
        let filename = if filename_len > 0 {
            Some(String::from_utf8(bytes[pos..pos + filename_len].to_vec())?)
        } else {
            None
        };
        pos += filename_len;

        // MIME type
        if bytes.len() < pos + 1 {
            return Err(SpecError::PayloadTooShort {
                expected: pos + 1,
                actual: bytes.len(),
            });
        }
        let mime_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + mime_len {
            return Err(SpecError::PayloadTooShort {
                expected: pos + mime_len,
                actual: bytes.len(),
            });
        }
        let mime_type = if mime_len > 0 {
            Some(String::from_utf8(bytes[pos..pos + mime_len].to_vec())?)
        } else {
            None
        };
        pos += mime_len;

        // File size (8 bytes, big-endian)
        if bytes.len() < pos + 8 {
            return Err(SpecError::PayloadTooShort {
                expected: pos + 8,
                actual: bytes.len(),
            });
        }
        let file_size = u64::from_be_bytes(bytes[pos..pos + 8].try_into().unwrap());
        let file_size = if file_size > 0 { Some(file_size) } else { None };
        pos += 8;

        // Description
        if bytes.len() < pos + 1 {
            return Err(SpecError::PayloadTooShort {
                expected: pos + 1,
                actual: bytes.len(),
            });
        }
        let desc_len = bytes[pos] as usize;
        pos += 1;
        if bytes.len() < pos + desc_len {
            return Err(SpecError::PayloadTooShort {
                expected: pos + desc_len,
                actual: bytes.len(),
            });
        }
        let description = if desc_len > 0 {
            Some(String::from_utf8(bytes[pos..pos + desc_len].to_vec())?)
        } else {
            None
        };
        pos += desc_len;

        Ok((
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
        let desc_bytes = self
            .description
            .as_ref()
            .map(|s| s.as_bytes())
            .unwrap_or(&[]);
        result.push(desc_bytes.len().min(255) as u8);
        result.extend_from_slice(&desc_bytes[..desc_bytes.len().min(255)]);

        result
    }
}

/// Single proof entry
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProofEntry {
    pub algorithm: HashAlgorithm,
    pub hash: Vec<u8>,
    pub metadata: ProofMetadata,
}

impl ProofEntry {
    /// Create a new proof entry with SHA-256 hash
    pub fn sha256(hash: Vec<u8>, metadata: ProofMetadata) -> Result<Self> {
        if hash.len() != 32 {
            return Err(SpecError::HashSizeMismatch {
                algorithm: "SHA-256",
                expected: 32,
                actual: hash.len(),
            });
        }
        Ok(Self {
            algorithm: HashAlgorithm::Sha256,
            hash,
            metadata,
        })
    }

    /// Create a new proof entry with SHA-512 hash
    pub fn sha512(hash: Vec<u8>, metadata: ProofMetadata) -> Result<Self> {
        if hash.len() != 64 {
            return Err(SpecError::HashSizeMismatch {
                algorithm: "SHA-512",
                expected: 64,
                actual: hash.len(),
            });
        }
        Ok(Self {
            algorithm: HashAlgorithm::Sha512,
            hash,
            metadata,
        })
    }

    /// Create from hex-encoded hash
    pub fn from_hex(
        algorithm: HashAlgorithm,
        hex_hash: &str,
        metadata: ProofMetadata,
    ) -> Result<Self> {
        let hash = hex::decode(hex_hash)?;
        if hash.len() != algorithm.hash_size() {
            return Err(SpecError::HashSizeMismatch {
                algorithm: algorithm.name(),
                expected: algorithm.hash_size(),
                actual: hash.len(),
            });
        }
        Ok(Self {
            algorithm,
            hash,
            metadata,
        })
    }

    /// Get the hash as hex string
    pub fn hash_hex(&self) -> String {
        hex::encode(&self.hash)
    }

    /// Validate the entry
    pub fn validate(&self) -> Result<()> {
        if self.hash.len() != self.algorithm.hash_size() {
            return Err(SpecError::HashSizeMismatch {
                algorithm: self.algorithm.name(),
                expected: self.algorithm.hash_size(),
                actual: self.hash.len(),
            });
        }
        Ok(())
    }
}

/// Proof specification (Kind 11)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProofSpec {
    pub operation: ProofOperation,
    pub entries: Vec<ProofEntry>,
}

impl ProofSpec {
    /// Create a stamp (single proof)
    pub fn stamp(entry: ProofEntry) -> Self {
        Self {
            operation: ProofOperation::Stamp,
            entries: vec![entry],
        }
    }

    /// Create a revoke
    pub fn revoke(entry: ProofEntry) -> Self {
        Self {
            operation: ProofOperation::Revoke,
            entries: vec![entry],
        }
    }

    /// Create a batch proof
    pub fn batch(entries: Vec<ProofEntry>) -> Self {
        Self {
            operation: ProofOperation::Batch,
            entries,
        }
    }

    /// Convenience: Create a SHA-256 stamp
    pub fn stamp_sha256(hash: Vec<u8>, metadata: ProofMetadata) -> Result<Self> {
        Ok(Self::stamp(ProofEntry::sha256(hash, metadata)?))
    }

    /// Convenience: Create from hex hash
    pub fn stamp_hex(
        algorithm: HashAlgorithm,
        hex_hash: &str,
        metadata: ProofMetadata,
    ) -> Result<Self> {
        Ok(Self::stamp(ProofEntry::from_hex(
            algorithm, hex_hash, metadata,
        )?))
    }
}

impl KindSpec for ProofSpec {
    const KIND_ID: u8 = 11;
    const KIND_NAME: &'static str = "Proof";

    fn from_bytes(body: &[u8]) -> Result<Self> {
        if body.len() < 2 {
            return Err(SpecError::PayloadTooShort {
                expected: 2,
                actual: body.len(),
            });
        }

        let operation = ProofOperation::try_from(body[0])?;

        match operation {
            ProofOperation::Batch => {
                let count = body[1] as usize;
                let mut entries = Vec::with_capacity(count);
                let mut offset = 2;

                for _ in 0..count {
                    if body.len() < offset + 1 {
                        return Err(SpecError::PayloadTooShort {
                            expected: offset + 1,
                            actual: body.len(),
                        });
                    }
                    let algorithm = HashAlgorithm::try_from(body[offset])?;
                    offset += 1;

                    let hash_size = algorithm.hash_size();
                    if body.len() < offset + hash_size {
                        return Err(SpecError::PayloadTooShort {
                            expected: offset + hash_size,
                            actual: body.len(),
                        });
                    }
                    let hash = body[offset..offset + hash_size].to_vec();
                    offset += hash_size;

                    let (metadata, meta_len) = ProofMetadata::from_bytes_at(body, offset)?;
                    offset += meta_len;

                    entries.push(ProofEntry {
                        algorithm,
                        hash,
                        metadata,
                    });
                }

                Ok(ProofSpec { operation, entries })
            }
            ProofOperation::Stamp | ProofOperation::Revoke => {
                let mut offset = 1;

                if body.len() < offset + 1 {
                    return Err(SpecError::PayloadTooShort {
                        expected: offset + 1,
                        actual: body.len(),
                    });
                }
                let algorithm = HashAlgorithm::try_from(body[offset])?;
                offset += 1;

                let hash_size = algorithm.hash_size();
                if body.len() < offset + hash_size {
                    return Err(SpecError::PayloadTooShort {
                        expected: offset + hash_size,
                        actual: body.len(),
                    });
                }
                let hash = body[offset..offset + hash_size].to_vec();
                offset += hash_size;

                let (metadata, _) = ProofMetadata::from_bytes_at(body, offset)?;

                Ok(ProofSpec {
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

    fn to_bytes(&self) -> Vec<u8> {
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

    fn validate(&self) -> Result<()> {
        if self.entries.is_empty() {
            return Err(SpecError::EmptyContent);
        }

        for entry in &self.entries {
            entry.validate()?;
        }

        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        &[
            CarrierType::OpReturn,
            CarrierType::WitnessData,
            CarrierType::Inscription,
            CarrierType::Stamps,
        ]
    }

    fn recommended_carrier() -> CarrierType {
        // OP_RETURN is fine for simple proofs (just a hash)
        CarrierType::OpReturn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proof_stamp_roundtrip() {
        let hash = vec![0u8; 32];
        let metadata = ProofMetadata::new()
            .with_filename("test.pdf")
            .with_mime_type("application/pdf")
            .with_file_size(12345)
            .with_description("Test document");

        let spec = ProofSpec::stamp(ProofEntry::sha256(hash, metadata).unwrap());

        let bytes = spec.to_bytes();
        let parsed = ProofSpec::from_bytes(&bytes).unwrap();

        assert_eq!(parsed.operation, ProofOperation::Stamp);
        assert_eq!(parsed.entries.len(), 1);
        assert_eq!(parsed.entries[0].algorithm, HashAlgorithm::Sha256);
        assert_eq!(
            parsed.entries[0].metadata.filename,
            Some("test.pdf".to_string())
        );
    }

    #[test]
    fn test_proof_batch_roundtrip() {
        let spec = ProofSpec::batch(vec![
            ProofEntry::sha256(vec![1u8; 32], ProofMetadata::default()).unwrap(),
            ProofEntry::sha512(vec![2u8; 64], ProofMetadata::new().with_filename("doc.txt"))
                .unwrap(),
        ]);

        let bytes = spec.to_bytes();
        let parsed = ProofSpec::from_bytes(&bytes).unwrap();

        assert_eq!(parsed.operation, ProofOperation::Batch);
        assert_eq!(parsed.entries.len(), 2);
        assert_eq!(parsed.entries[0].algorithm, HashAlgorithm::Sha256);
        assert_eq!(parsed.entries[1].algorithm, HashAlgorithm::Sha512);
    }

    #[test]
    fn test_hash_algorithm() {
        assert_eq!(HashAlgorithm::Sha256.hash_size(), 32);
        assert_eq!(HashAlgorithm::Sha512.hash_size(), 64);
        assert_eq!(HashAlgorithm::Sha256.name(), "SHA-256");
        assert_eq!(HashAlgorithm::Sha512.name(), "SHA-512");
    }

    #[test]
    fn test_hash_size_validation() {
        let result = ProofEntry::sha256(vec![0u8; 31], ProofMetadata::default());
        assert!(result.is_err());

        let result = ProofEntry::sha256(vec![0u8; 32], ProofMetadata::default());
        assert!(result.is_ok());
    }

    #[test]
    fn test_from_hex() {
        let hex_hash = "a".repeat(64); // 32 bytes = 64 hex chars
        let entry =
            ProofEntry::from_hex(HashAlgorithm::Sha256, &hex_hash, ProofMetadata::default());
        assert!(entry.is_ok());

        let invalid_hex = "gg";
        let entry =
            ProofEntry::from_hex(HashAlgorithm::Sha256, invalid_hex, ProofMetadata::default());
        assert!(entry.is_err());
    }
}
