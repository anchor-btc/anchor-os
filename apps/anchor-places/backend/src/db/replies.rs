//! Reply database operations

use anyhow::Result;
use tracing::debug;

use super::Database;
use crate::models::MarkerReply;

impl Database {
    /// Insert a marker reply
    pub async fn insert_reply(
        &self,
        txid: &[u8],
        vout: i32,
        parent_txid: &[u8],
        parent_vout: i32,
        message: &str,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO marker_replies (txid, vout, parent_txid, parent_vout, message, block_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (txid, vout) DO UPDATE SET
                message = EXCLUDED.message,
                block_hash = EXCLUDED.block_hash,
                block_height = EXCLUDED.block_height
            RETURNING id
            "#,
        )
        .bind(txid)
        .bind(vout)
        .bind(parent_txid)
        .bind(parent_vout)
        .bind(message)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        debug!("Inserted reply to marker");
        Ok(row.0)
    }

    /// Get marker replies
    pub async fn get_marker_replies(&self, txid_hex: &str, vout: i32) -> Result<Vec<MarkerReply>> {
        let rows: Vec<(i32, Vec<u8>, i32, String, Option<i32>, chrono::DateTime<chrono::Utc>)> =
            sqlx::query_as(
                r#"
                SELECT id, txid, vout, message, block_height, created_at
                FROM marker_replies
                WHERE parent_txid = decode($1, 'hex') AND parent_vout = $2
                ORDER BY created_at ASC
                "#,
            )
            .bind(txid_hex)
            .bind(vout)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| MarkerReply {
                id: r.0,
                txid: hex::encode(&r.1),
                vout: r.2,
                message: r.3,
                block_height: r.4,
                created_at: r.5,
            })
            .collect())
    }
}

