//! Pixel database operations
//!
//! Database operations for pixel state and history management.
//! Complex tuple types are used for sqlx query results.

#![allow(clippy::type_complexity)]

use anyhow::Result;
use tracing::debug;

use crate::config::{CANVAS_HEIGHT, CANVAS_WIDTH};
use crate::models::{
    CanvasStats, PixelHistoryEntry, PixelInfo, PixelState, RecentPixel, UserPixel,
};

use super::Database;

impl Database {
    /// Insert or update a pixel
    #[allow(clippy::too_many_arguments)]
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
        creator_address: Option<&str>,
    ) -> Result<()> {
        // Insert into current state
        sqlx::query(
            r#"
            INSERT INTO pixel_state (x, y, r, g, b, last_txid, last_vout, last_block_height, creator_address, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (x, y) DO UPDATE SET
                r = EXCLUDED.r,
                g = EXCLUDED.g,
                b = EXCLUDED.b,
                last_txid = EXCLUDED.last_txid,
                last_vout = EXCLUDED.last_vout,
                last_block_height = EXCLUDED.last_block_height,
                creator_address = EXCLUDED.creator_address,
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
        .bind(creator_address)
        .execute(&self.pool)
        .await?;

        // Insert into history
        sqlx::query(
            r#"
            INSERT INTO pixel_history (x, y, r, g, b, txid, vout, block_height, creator_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
        .bind(creator_address)
        .execute(&self.pool)
        .await?;

        debug!(
            "Upserted pixel ({}, {}) with color ({}, {}, {}) by {:?}",
            x, y, r, g, b, creator_address
        );
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
        let row: Option<(
            i32,
            i32,
            i16,
            i16,
            i16,
            Vec<u8>,
            i32,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
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
    pub async fn get_pixel_history(
        &self,
        x: i32,
        y: i32,
        limit: i32,
    ) -> Result<Vec<PixelHistoryEntry>> {
        let rows: Vec<(
            i16,
            i16,
            i16,
            Vec<u8>,
            i32,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
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
        Ok(PixelInfo {
            x,
            y,
            current,
            history,
        })
    }

    /// Get recent pixel changes
    pub async fn get_recent_pixels(&self, limit: i32) -> Result<Vec<RecentPixel>> {
        let rows: Vec<(
            i32,
            i32,
            i16,
            i16,
            i16,
            Vec<u8>,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
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

    /// Get pixels painted by specific transaction IDs
    /// Returns all pixels from pixel_history that match the given txids
    pub async fn get_pixels_by_txids(&self, txids: &[Vec<u8>]) -> Result<Vec<UserPixel>> {
        if txids.is_empty() {
            return Ok(vec![]);
        }

        let rows: Vec<(
            i32,
            i32,
            i16,
            i16,
            i16,
            Vec<u8>,
            i32,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
                SELECT x, y, r, g, b, txid, vout, block_height, created_at
                FROM pixel_history
                WHERE txid = ANY($1)
                ORDER BY created_at DESC
                "#,
        )
        .bind(txids)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UserPixel {
                x: r.0,
                y: r.1,
                r: r.2,
                g: r.3,
                b: r.4,
                txid: hex::encode(&r.5),
                vout: r.6,
                block_height: r.7,
                created_at: r.8,
            })
            .collect())
    }

    /// Count unique transactions and total pixels for a set of txids
    pub async fn get_pixels_stats_by_txids(&self, txids: &[Vec<u8>]) -> Result<(i64, i64)> {
        if txids.is_empty() {
            return Ok((0, 0));
        }

        let row: (i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as total_pixels,
                COUNT(DISTINCT txid) as unique_transactions
            FROM pixel_history
            WHERE txid = ANY($1)
            "#,
        )
        .bind(txids)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Get pixels painted by a specific address
    pub async fn get_pixels_by_address(
        &self,
        address: &str,
        limit: i32,
        offset: i32,
    ) -> Result<Vec<UserPixel>> {
        let rows: Vec<(
            i32,
            i32,
            i16,
            i16,
            i16,
            Vec<u8>,
            i32,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
                SELECT x, y, r, g, b, txid, vout, block_height, created_at
                FROM pixel_history
                WHERE creator_address = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
        )
        .bind(address)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UserPixel {
                x: r.0,
                y: r.1,
                r: r.2,
                g: r.3,
                b: r.4,
                txid: hex::encode(&r.5),
                vout: r.6,
                block_height: r.7,
                created_at: r.8,
            })
            .collect())
    }

    /// Get pixel statistics for a specific address
    pub async fn get_pixels_stats_by_address(&self, address: &str) -> Result<(i64, i64, i64)> {
        let row: (i64, i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as total_pixels,
                COUNT(DISTINCT txid) as unique_transactions,
                COUNT(DISTINCT (x, y)) as unique_positions
            FROM pixel_history
            WHERE creator_address = $1
            "#,
        )
        .bind(address)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Get pixels painted by multiple addresses
    pub async fn get_pixels_by_addresses(
        &self,
        addresses: &[String],
        limit: i32,
    ) -> Result<Vec<UserPixel>> {
        if addresses.is_empty() {
            return Ok(vec![]);
        }

        let rows: Vec<(
            i32,
            i32,
            i16,
            i16,
            i16,
            Vec<u8>,
            i32,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
                SELECT x, y, r, g, b, txid, vout, block_height, created_at
                FROM pixel_history
                WHERE creator_address = ANY($1)
                ORDER BY created_at DESC
                LIMIT $2
                "#,
        )
        .bind(addresses)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UserPixel {
                x: r.0,
                y: r.1,
                r: r.2,
                g: r.3,
                b: r.4,
                txid: hex::encode(&r.5),
                vout: r.6,
                block_height: r.7,
                created_at: r.8,
            })
            .collect())
    }

    /// Get pixel statistics for multiple addresses
    pub async fn get_pixels_stats_by_addresses(
        &self,
        addresses: &[String],
    ) -> Result<(i64, i64, i64)> {
        if addresses.is_empty() {
            return Ok((0, 0, 0));
        }

        let row: (i64, i64, i64) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*) as total_pixels,
                COUNT(DISTINCT txid) as unique_transactions,
                COUNT(DISTINCT (x, y)) as unique_positions
            FROM pixel_history
            WHERE creator_address = ANY($1)
            "#,
        )
        .bind(addresses)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }
}
