//! Database row types for AnchorProofs

use super::{HashAlgorithm, Proof, ProofListItem};

/// Proof row structure from database
#[derive(sqlx::FromRow)]
pub struct ProofRow {
    pub id: i32,
    pub hash_algo: i16,
    pub file_hash: Vec<u8>,
    pub filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
    pub description: Option<String>,
    pub txid: Vec<u8>,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub is_revoked: bool,
    pub revoked_txid: Option<Vec<u8>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl ProofRow {
    /// Convert database row to Proof API type
    pub fn to_proof(&self) -> Proof {
        let algo = HashAlgorithm::try_from(self.hash_algo as u8).unwrap_or(HashAlgorithm::Sha256);
        let txid_hex = hex::encode(&self.txid);
        let txid_prefix = hex::encode(&self.txid[..8.min(self.txid.len())]);

        Proof {
            id: self.id,
            hash_algo: self.hash_algo,
            hash_algo_name: algo.name().to_string(),
            file_hash: hex::encode(&self.file_hash),
            filename: self.filename.clone(),
            mime_type: self.mime_type.clone(),
            file_size: self.file_size,
            description: self.description.clone(),
            txid: txid_hex,
            txid_prefix,
            vout: self.vout,
            block_height: self.block_height,
            is_revoked: self.is_revoked,
            revoked_txid: self.revoked_txid.as_ref().map(hex::encode),
            created_at: self.created_at,
        }
    }

    /// Convert database row to ProofListItem API type
    pub fn to_list_item(&self) -> ProofListItem {
        let algo = HashAlgorithm::try_from(self.hash_algo as u8).unwrap_or(HashAlgorithm::Sha256);
        let txid_hex = hex::encode(&self.txid);
        let txid_prefix = hex::encode(&self.txid[..8.min(self.txid.len())]);

        ProofListItem {
            id: self.id,
            hash_algo: self.hash_algo,
            hash_algo_name: algo.name().to_string(),
            file_hash: hex::encode(&self.file_hash),
            filename: self.filename.clone(),
            mime_type: self.mime_type.clone(),
            file_size: self.file_size,
            txid: txid_hex,
            txid_prefix,
            block_height: self.block_height,
            is_revoked: self.is_revoked,
            created_at: self.created_at,
        }
    }
}
