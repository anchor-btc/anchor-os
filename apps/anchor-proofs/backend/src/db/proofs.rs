//! Proof database operations

use anyhow::Result;

use super::Database;
use crate::models::{Proof, ProofListItem, ProofRow, ProofStats};

impl Database {
    /// Check if a transaction output is already indexed
    pub async fn tx_exists(&self, txid: &[u8], vout: i32) -> Result<bool> {
        let row: (bool,) =
            sqlx::query_as("SELECT EXISTS(SELECT 1 FROM proofs WHERE txid = $1 AND vout = $2)")
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

    /// Create a new proof with creator address
    #[allow(clippy::too_many_arguments)]
    pub async fn create_proof_with_creator(
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
        creator_address: Option<&str>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO proofs (hash_algo, file_hash, filename, mime_type, file_size, description, txid, vout, block_hash, block_height, creator_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        .bind(creator_address)
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

    /// Find proof by hash (returns raw row for indexer use)
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

    /// Get proof by hash (returns API type)
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

        Ok(row.map(|r| r.to_proof()))
    }

    /// Get proof by ID
    pub async fn get_proof_by_id(&self, id: i32) -> Result<Option<Proof>> {
        let row = sqlx::query_as::<_, ProofRow>("SELECT * FROM proofs WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| r.to_proof()))
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

        let items = rows.into_iter().map(|r| r.to_list_item()).collect();

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

        let items = rows.into_iter().map(|r| r.to_list_item()).collect();

        Ok((items, total.0))
    }

    /// Get protocol statistics
    #[allow(clippy::type_complexity)]
    pub async fn get_stats(&self) -> Result<ProofStats> {
        let row: (
            i64,
            i64,
            i64,
            i64,
            i64,
            i64,
            Option<i32>,
            Option<chrono::DateTime<chrono::Utc>>,
            i64,
        ) = sqlx::query_as(
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

    /// Get proofs by creator addresses (for My Proofs feature)
    pub async fn get_proofs_by_addresses(
        &self,
        addresses: &[String],
        limit: i32,
    ) -> Result<Vec<ProofListItem>> {
        if addresses.is_empty() {
            return Ok(vec![]);
        }

        let rows = sqlx::query_as::<_, ProofRow>(
            r#"
            SELECT * FROM proofs 
            WHERE creator_address = ANY($1)
            ORDER BY created_at DESC 
            LIMIT $2
            "#,
        )
        .bind(addresses)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.to_list_item()).collect())
    }

    /// Get proof stats by creator addresses
    pub async fn get_proofs_stats_by_addresses(&self, addresses: &[String]) -> Result<(i64, i64)> {
        if addresses.is_empty() {
            return Ok((0, 0));
        }

        let row: (i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*)::bigint as total_proofs,
                COUNT(DISTINCT txid)::bigint as unique_transactions
            FROM proofs 
            WHERE creator_address = ANY($1)
            "#,
        )
        .bind(addresses)
        .fetch_one(&self.pool)
        .await?;

        Ok((row.0, row.1))
    }
}
