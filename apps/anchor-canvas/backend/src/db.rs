//! Database operations for AnchorCanvas

use anyhow::Result;
use sqlx::postgres::PgPool;
use tracing::debug;

use crate::config::{CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::models::{CanvasStats, PixelHistoryEntry, PixelInfo, PixelState, RecentPixel};

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

    /// Insert or update a pixel
    pub async fn upsert_pixel(
        &self,
        x: i32,
        y: i32,
        r: i16,
        g: i16,
        b: i16,
        txid: &[u8],
        vout: i32,
        block_height: Option<i32>,
    ) -> Result<()> {
        // Insert into current state
        sqlx::query(
            r#"
            INSERT INTO pixel_state (x, y, r, g, b, last_txid, last_vout, last_block_height, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (x, y) DO UPDATE SET
                r = EXCLUDED.r,
                g = EXCLUDED.g,
                b = EXCLUDED.b,
                last_txid = EXCLUDED.last_txid,
                last_vout = EXCLUDED.last_vout,
                last_block_height = EXCLUDED.last_block_height,
                updated_at = NOW()
            "#,
        )
        .bind(x)
        .bind(y)
        .bind(r)
        .bind(g)
        .bind(b)
        .bind(txid)
        .bind(vout)
        .bind(block_height)
        .execute(&self.pool)
        .await?;

        // Insert into history
        sqlx::query(
            r#"
            INSERT INTO pixel_history (x, y, r, g, b, txid, vout, block_height, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            "#,
        )
        .bind(x)
        .bind(y)
        .bind(r)
        .bind(g)
        .bind(b)
        .bind(txid)
        .bind(vout)
        .bind(block_height)
        .execute(&self.pool)
        .await?;

        debug!("Upserted pixel ({}, {}) with color ({}, {}, {})", x, y, r, g, b);
        Ok(())
    }

    /// Get canvas statistics
    pub async fn get_stats(&self) -> Result<CanvasStats> {
        let row: (i64, i64, Option<i32>, Option<chrono::DateTime<chrono::Utc>>) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as total_pixels_painted,
                COUNT(DISTINCT last_txid) as total_transactions,
                MAX(last_block_height) as last_block_height,
                MAX(updated_at) as last_update
            FROM pixel_state
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(CanvasStats {
            total_pixels_painted: row.0,
            total_transactions: row.1,
            last_block_height: row.2,
            last_update: row.3,
            canvas_width: CANVAS_WIDTH,
            canvas_height: CANVAS_HEIGHT,
            total_pixels: (CANVAS_WIDTH as u64) * (CANVAS_HEIGHT as u64),
        })
    }

    /// Get a single pixel's current state
    pub async fn get_pixel(&self, x: i32, y: i32) -> Result<Option<PixelState>> {
        let row: Option<(i32, i32, i16, i16, i16, Vec<u8>, i32, Option<i32>, chrono::DateTime<chrono::Utc>)> =
            sqlx::query_as(
                r#"
                SELECT x, y, r, g, b, last_txid, last_vout, last_block_height, updated_at
                FROM pixel_state
                WHERE x = $1 AND y = $2
                "#,
            )
            .bind(x)
            .bind(y)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| PixelState {
            x: r.0,
            y: r.1,
            r: r.2,
            g: r.3,
            b: r.4,
            last_txid: hex::encode(&r.5),
            last_vout: r.6,
            last_block_height: r.7,
            updated_at: r.8,
        }))
    }

    /// Get pixel history
    pub async fn get_pixel_history(&self, x: i32, y: i32, limit: i32) -> Result<Vec<PixelHistoryEntry>> {
        let rows: Vec<(i16, i16, i16, Vec<u8>, i32, Option<i32>, chrono::DateTime<chrono::Utc>)> =
            sqlx::query_as(
                r#"
                SELECT r, g, b, txid, vout, block_height, created_at
                FROM pixel_history
                WHERE x = $1 AND y = $2
                ORDER BY created_at DESC
                LIMIT $3
                "#,
            )
            .bind(x)
            .bind(y)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| PixelHistoryEntry {
                r: r.0,
                g: r.1,
                b: r.2,
                txid: hex::encode(&r.3),
                vout: r.4,
                block_height: r.5,
                created_at: r.6,
            })
            .collect())
    }

    /// Get pixel info with history
    pub async fn get_pixel_info(&self, x: i32, y: i32) -> Result<PixelInfo> {
        let current = self.get_pixel(x, y).await?;
        let history = self.get_pixel_history(x, y, 50).await?;
        Ok(PixelInfo { x, y, current, history })
    }

    /// Get recent pixel changes
    pub async fn get_recent_pixels(&self, limit: i32) -> Result<Vec<RecentPixel>> {
        let rows: Vec<(i32, i32, i16, i16, i16, Vec<u8>, Option<i32>, chrono::DateTime<chrono::Utc>)> =
            sqlx::query_as(
                r#"
                SELECT x, y, r, g, b, last_txid, last_block_height, updated_at
                FROM pixel_state
                ORDER BY updated_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| RecentPixel {
                x: r.0,
                y: r.1,
                r: r.2,
                g: r.3,
                b: r.4,
                txid: hex::encode(&r.5),
                block_height: r.6,
                updated_at: r.7,
            })
            .collect())
    }

    /// Get pixels in a region (for tiles)
    pub async fn get_region_pixels(
        &self,
        x_min: i32,
        y_min: i32,
        x_max: i32,
        y_max: i32,
    ) -> Result<Vec<(i32, i32, i16, i16, i16)>> {
        let rows: Vec<(i32, i32, i16, i16, i16)> = sqlx::query_as(
            r#"
            SELECT x, y, r, g, b
            FROM pixel_state
            WHERE x >= $1 AND x < $2 AND y >= $3 AND y < $4
            ORDER BY y, x
            "#,
        )
        .bind(x_min)
        .bind(x_max)
        .bind(y_min)
        .bind(y_max)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    /// Get all pixels (for full canvas export)
    pub async fn get_all_pixels(&self) -> Result<Vec<(i32, i32, i16, i16, i16)>> {
        let rows: Vec<(i32, i32, i16, i16, i16)> = sqlx::query_as(
            r#"
            SELECT x, y, r, g, b
            FROM pixel_state
            ORDER BY y, x
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    /// Handle a blockchain reorganization
    pub async fn handle_reorg(&self, from_height: i32) -> Result<u64> {
        // Remove pixels from reorged blocks from history
        let result = sqlx::query("DELETE FROM pixel_history WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Rebuild current state from remaining history
        sqlx::query(
            r#"
            WITH latest AS (
                SELECT DISTINCT ON (x, y) x, y, r, g, b, txid, vout, block_height, created_at
                FROM pixel_history
                ORDER BY x, y, created_at DESC
            )
            INSERT INTO pixel_state (x, y, r, g, b, last_txid, last_vout, last_block_height, updated_at)
            SELECT x, y, r, g, b, txid, vout, block_height, created_at
            FROM latest
            ON CONFLICT (x, y) DO UPDATE SET
                r = EXCLUDED.r,
                g = EXCLUDED.g,
                b = EXCLUDED.b,
                last_txid = EXCLUDED.last_txid,
                last_vout = EXCLUDED.last_vout,
                last_block_height = EXCLUDED.last_block_height,
                updated_at = EXCLUDED.updated_at
            "#,
        )
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

