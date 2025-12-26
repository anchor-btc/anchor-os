//! Database operations for the indexer

use anyhow::Result;
use bitcoin::hashes::Hash;
use bitcoin::Txid;
use sqlx::postgres::PgPool;
use tracing::debug;

use anchor_core::carrier::CarrierType;
use anchor_core::{Anchor, ParsedAnchorMessage, TXID_PREFIX_SIZE};

/// Database connection pool wrapper
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Create a new database connection
    pub async fn connect(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    /// Get the last indexed block height
    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) =
            sqlx::query_as("SELECT last_block_height FROM indexer_state WHERE id = 1")
                .fetch_one(&self.pool)
                .await?;

        Ok(row.0)
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], block_height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE indexer_state SET last_block_hash = $1, last_block_height = $2, updated_at = NOW() WHERE id = 1"
        )
        .bind(block_hash)
        .bind(block_height)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Insert a new ANCHOR message with carrier type
    pub async fn insert_message_with_carrier(
        &self,
        txid: &Txid,
        vout: u32,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
        message: &ParsedAnchorMessage,
        carrier: CarrierType,
    ) -> Result<i32> {
        let txid_bytes = txid.to_byte_array().to_vec();
        let kind = u8::from(message.kind) as i16;
        let carrier_id = carrier as i16;

        // Insert the message with carrier
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO messages (txid, vout, block_hash, block_height, kind, body, carrier)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (txid, vout) DO UPDATE SET
                block_hash = EXCLUDED.block_hash,
                block_height = EXCLUDED.block_height,
                carrier = EXCLUDED.carrier
            RETURNING id
            "#,
        )
        .bind(&txid_bytes)
        .bind(vout as i32)
        .bind(block_hash)
        .bind(block_height)
        .bind(kind)
        .bind(&message.body)
        .bind(carrier_id)
        .fetch_one(&self.pool)
        .await?;

        let message_id = row.0;

        // Insert anchors
        for (index, anchor) in message.anchors.iter().enumerate() {
            self.insert_anchor(message_id, index as i16, anchor).await?;
        }

        debug!(
            "Inserted message {} with {} anchors (carrier: {})",
            txid,
            message.anchors.len(),
            carrier
        );

        Ok(message_id)
    }

    /// Insert an anchor for a message
    async fn insert_anchor(
        &self,
        message_id: i32,
        anchor_index: i16,
        anchor: &Anchor,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO anchors (message_id, anchor_index, txid_prefix, vout)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (message_id, anchor_index) DO NOTHING
            "#,
        )
        .bind(message_id)
        .bind(anchor_index)
        .bind(&anchor.txid_prefix[..])
        .bind(anchor.vout as i16)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Resolve anchors by finding matching txids
    pub async fn resolve_anchors(&self) -> Result<u64> {
        // Find anchors that haven't been resolved yet
        let unresolved: Vec<(i32, Vec<u8>, i16)> = sqlx::query_as(
            r#"
            SELECT a.id, a.txid_prefix, a.vout
            FROM anchors a
            WHERE a.resolved_txid IS NULL AND a.is_orphan = FALSE
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut resolved_count = 0u64;

        for (anchor_id, prefix, _vout) in unresolved {
            // Find messages matching this prefix
            let matches: Vec<(Vec<u8>, i32)> = sqlx::query_as(
                r#"
                SELECT txid, id FROM messages
                WHERE substring(txid from 1 for $1) = $2
                "#,
            )
            .bind(TXID_PREFIX_SIZE as i32)
            .bind(&prefix)
            .fetch_all(&self.pool)
            .await?;

            match matches.len() {
                0 => {
                    // Mark as orphan
                    sqlx::query("UPDATE anchors SET is_orphan = TRUE WHERE id = $1")
                        .bind(anchor_id)
                        .execute(&self.pool)
                        .await?;
                }
                1 => {
                    // Unique match - resolve the anchor
                    let (resolved_txid, resolved_message_id) = &matches[0];
                    sqlx::query(
                        "UPDATE anchors SET resolved_txid = $1, resolved_message_id = $2 WHERE id = $3"
                    )
                    .bind(resolved_txid)
                    .bind(resolved_message_id)
                    .bind(anchor_id)
                    .execute(&self.pool)
                    .await?;
                    resolved_count += 1;
                }
                _ => {
                    // Multiple matches - mark as ambiguous
                    sqlx::query("UPDATE anchors SET is_ambiguous = TRUE WHERE id = $1")
                        .bind(anchor_id)
                        .execute(&self.pool)
                        .await?;
                }
            }
        }

        Ok(resolved_count)
    }

    /// Check if a message already exists
    pub async fn message_exists(&self, txid: &Txid, vout: u32) -> Result<bool> {
        let txid_bytes = txid.to_byte_array().to_vec();
        let row: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM messages WHERE txid = $1 AND vout = $2")
                .bind(&txid_bytes)
                .bind(vout as i32)
                .fetch_one(&self.pool)
                .await?;

        Ok(row.0 > 0)
    }

    /// Handle a blockchain reorganization
    pub async fn handle_reorg(&self, from_height: i32) -> Result<u64> {
        // Delete messages from the reorged blocks
        let result = sqlx::query("DELETE FROM messages WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Update indexer state
        sqlx::query("UPDATE indexer_state SET last_block_height = $1 - 1 WHERE id = 1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }
}
