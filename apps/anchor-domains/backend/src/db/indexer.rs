//! Indexer state database operations

use anyhow::Result;

use super::Database;

impl Database {
    /// Get the last indexed block height
    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) =
            sqlx::query_as("SELECT last_block_height FROM anchor_domains_indexer_state WHERE id = 1")
                .fetch_one(&self.pool)
                .await?;
        Ok(row.0)
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], block_height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE anchor_domains_indexer_state SET last_block_hash = $1, last_block_height = $2, updated_at = NOW() WHERE id = 1"
        )
        .bind(block_hash)
        .bind(block_height)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Handle a blockchain reorganization
    pub async fn handle_reorg(&self, from_height: i32) -> Result<u64> {
        // Remove records from reorged blocks
        sqlx::query("DELETE FROM dns_records WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Remove domains from reorged blocks
        let result = sqlx::query("DELETE FROM domains WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Update indexer state
        sqlx::query("UPDATE anchor_domains_indexer_state SET last_block_height = $1 - 1 WHERE id = 1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }
}

