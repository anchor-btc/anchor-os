//! Database operations for AnchorProof

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

use crate::models::{HashAlgorithm, Proof, ProofListItem, ProofStats};

/// Database wrapper
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

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

impl Database {
    /// Create a new database connection pool
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await
            .context("Failed to connect to database")?;

        info!("Connected to database");

        Ok(Self { pool })
    }

    /// Get the last indexed block height
    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            "SELECT last_block_height FROM anchorproof_indexer_state WHERE id = 1",
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE anchorproof_indexer_state SET last_block_hash = $1, last_block_height = $2 WHERE id = 1",
        )
        .bind(block_hash)
        .bind(height)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Handle blockchain reorganization
    pub async fn handle_reorg(&self, from_height: i32) -> Result<()> {
        // Delete proofs from orphaned blocks
        sqlx::query("DELETE FROM proofs WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Update indexer state
        sqlx::query("UPDATE anchorproof_indexer_state SET last_block_height = $1 WHERE id = 1")
            .bind(from_height - 1)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Check if a transaction output is already indexed
    pub async fn tx_exists(&self, txid: &[u8], vout: i32) -> Result<bool> {
        let row: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM proofs WHERE txid = $1 AND vout = $2)",
        )
        .bind(txid)
        .bind(vout)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    /// Check if a hash already exists
    pub async fn hash_exists(&self, hash: &[u8], algo: i16) -> Result<bool> {
        let row: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM proofs WHERE file_hash = $1 AND hash_algo = $2)",
        )
        .bind(hash)
        .bind(algo)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    /// Create a new proof
    #[allow(clippy::too_many_arguments)]
    pub async fn create_proof(
        &self,
        hash_algo: i16,
        file_hash: &[u8],
        filename: &Option<String>,
        mime_type: &Option<String>,
        file_size: Option<i64>,
        description: &Option<String>,
        txid: &[u8],
        vout: i32,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO proofs (hash_algo, file_hash, filename, mime_type, file_size, description, txid, vout, block_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (file_hash, hash_algo) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(hash_algo)
        .bind(file_hash)
        .bind(filename)
        .bind(mime_type)
        .bind(file_size)
        .bind(description)
        .bind(txid)
        .bind(vout)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    /// Create a batch entry
    #[allow(clippy::too_many_arguments)]
    pub async fn create_batch_entry(
        &self,
        batch_txid: &[u8],
        batch_vout: i32,
        entry_index: i32,
        hash_algo: i16,
        file_hash: &[u8],
        filename: &Option<String>,
        mime_type: &Option<String>,
        file_size: Option<i64>,
        description: &Option<String>,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO proof_batch_entries (batch_txid, batch_vout, entry_index, hash_algo, file_hash, filename, mime_type, file_size, description, block_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
            "#,
        )
        .bind(batch_txid)
        .bind(batch_vout)
        .bind(entry_index)
        .bind(hash_algo)
        .bind(file_hash)
        .bind(filename)
        .bind(mime_type)
        .bind(file_size)
        .bind(description)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    /// Find proof by hash
    pub async fn find_proof_by_hash(&self, hash: &[u8], algo: i16) -> Result<Option<ProofRow>> {
        let row = sqlx::query_as::<_, ProofRow>(
            "SELECT * FROM proofs WHERE file_hash = $1 AND hash_algo = $2",
        )
        .bind(hash)
        .bind(algo)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    /// Revoke a proof
    pub async fn revoke_proof(&self, proof_id: i32, revoked_txid: &[u8]) -> Result<()> {
        sqlx::query(
            "UPDATE proofs SET is_revoked = TRUE, revoked_txid = $1, revoked_at = NOW() WHERE id = $2",
        )
        .bind(revoked_txid)
        .bind(proof_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get proof by hash
    pub async fn get_proof_by_hash(&self, hash: &[u8], algo: Option<i16>) -> Result<Option<Proof>> {
        let row = if let Some(a) = algo {
            sqlx::query_as::<_, ProofRow>(
                "SELECT * FROM proofs WHERE file_hash = $1 AND hash_algo = $2",
            )
            .bind(hash)
            .bind(a)
            .fetch_optional(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ProofRow>("SELECT * FROM proofs WHERE file_hash = $1")
                .bind(hash)
                .fetch_optional(&self.pool)
                .await?
        };

        Ok(row.map(Self::row_to_proof))
    }

    /// Get proof by ID
    pub async fn get_proof_by_id(&self, id: i32) -> Result<Option<Proof>> {
        let row = sqlx::query_as::<_, ProofRow>("SELECT * FROM proofs WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(Self::row_to_proof))
    }

    /// List proofs with pagination
    pub async fn list_proofs(
        &self,
        limit: i32,
        offset: i32,
        include_revoked: bool,
    ) -> Result<(Vec<ProofListItem>, i64)> {
        let rows = if include_revoked {
            sqlx::query_as::<_, ProofRow>(
                "SELECT * FROM proofs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ProofRow>(
                "SELECT * FROM proofs WHERE is_revoked = FALSE ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        };

        let total: (i64,) = if include_revoked {
            sqlx::query_as("SELECT COUNT(*) FROM proofs")
                .fetch_one(&self.pool)
                .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM proofs WHERE is_revoked = FALSE")
                .fetch_one(&self.pool)
                .await?
        };

        let items = rows.into_iter().map(Self::row_to_list_item).collect();

        Ok((items, total.0))
    }

    /// Search proofs by filename or description
    pub async fn search_proofs(
        &self,
        query: &str,
        limit: i32,
        offset: i32,
    ) -> Result<(Vec<ProofListItem>, i64)> {
        let search_pattern = format!("%{}%", query);

        let rows = sqlx::query_as::<_, ProofRow>(
            r#"
            SELECT * FROM proofs 
            WHERE filename ILIKE $1 OR description ILIKE $1
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&search_pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM proofs WHERE filename ILIKE $1 OR description ILIKE $1",
        )
        .bind(&search_pattern)
        .fetch_one(&self.pool)
        .await?;

        let items = rows.into_iter().map(Self::row_to_list_item).collect();

        Ok((items, total.0))
    }

    /// Get protocol statistics
    pub async fn get_stats(&self) -> Result<ProofStats> {
        let row: (i64, i64, i64, i64, i64, i64, Option<i32>, Option<chrono::DateTime<chrono::Utc>>, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*)::bigint as total_proofs,
                COUNT(*) FILTER (WHERE NOT is_revoked)::bigint as active_proofs,
                COUNT(*) FILTER (WHERE is_revoked)::bigint as revoked_proofs,
                COUNT(*) FILTER (WHERE hash_algo = 1)::bigint as sha256_proofs,
                COUNT(*) FILTER (WHERE hash_algo = 2)::bigint as sha512_proofs,
                COUNT(DISTINCT txid)::bigint as total_transactions,
                MAX(block_height) as last_block_height,
                MAX(created_at) as last_update,
                COALESCE(SUM(file_size), 0)::bigint as total_file_size
            FROM proofs
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(ProofStats {
            total_proofs: row.0,
            active_proofs: row.1,
            revoked_proofs: row.2,
            sha256_proofs: row.3,
            sha512_proofs: row.4,
            total_transactions: row.5,
            last_block_height: row.6,
            last_update: row.7,
            total_file_size: row.8,
        })
    }

    /// Convert database row to Proof
    fn row_to_proof(row: ProofRow) -> Proof {
        let algo = HashAlgorithm::try_from(row.hash_algo as u8).unwrap_or(HashAlgorithm::Sha256);
        let txid_hex = hex::encode(&row.txid);
        let txid_prefix = hex::encode(&row.txid[..8.min(row.txid.len())]);

        Proof {
            id: row.id,
            hash_algo: row.hash_algo,
            hash_algo_name: algo.name().to_string(),
            file_hash: hex::encode(&row.file_hash),
            filename: row.filename,
            mime_type: row.mime_type,
            file_size: row.file_size,
            description: row.description,
            txid: txid_hex,
            txid_prefix,
            vout: row.vout,
            block_height: row.block_height,
            is_revoked: row.is_revoked,
            revoked_txid: row.revoked_txid.map(|t| hex::encode(&t)),
            created_at: row.created_at,
        }
    }

    /// Convert database row to ProofListItem
    fn row_to_list_item(row: ProofRow) -> ProofListItem {
        let algo = HashAlgorithm::try_from(row.hash_algo as u8).unwrap_or(HashAlgorithm::Sha256);
        let txid_hex = hex::encode(&row.txid);
        let txid_prefix = hex::encode(&row.txid[..8.min(row.txid.len())]);

        ProofListItem {
            id: row.id,
            hash_algo: row.hash_algo,
            hash_algo_name: algo.name().to_string(),
            file_hash: hex::encode(&row.file_hash),
            filename: row.filename,
            mime_type: row.mime_type,
            file_size: row.file_size,
            txid: txid_hex,
            txid_prefix,
            block_height: row.block_height,
            is_revoked: row.is_revoked,
            created_at: row.created_at,
        }
    }
}
