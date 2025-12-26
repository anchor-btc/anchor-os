//! Indexer state database operations

use anyhow::Result;

use super::Database;

impl Database {
    /// Get the last indexed block height
    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) =
            sqlx::query_as("SELECT last_block_height FROM proofs_indexer_state WHERE id = 1")
                .fetch_one(&self.pool)
                .await?;

        Ok(row.0)
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE proofs_indexer_state SET last_block_hash = $1, last_block_height = $2 WHERE id = 1",
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
        sqlx::query("UPDATE proofs_indexer_state SET last_block_height = $1 WHERE id = 1")
            .bind(from_height - 1)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
