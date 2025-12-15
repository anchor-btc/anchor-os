//! Database operations for AnchorMap

use anyhow::Result;
use sqlx::postgres::PgPool;
use tracing::debug;

use crate::models::{Category, MapStats, Marker, MarkerDetail, MarkerReply};

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
            sqlx::query_as("SELECT last_block_height FROM anchormap_indexer_state WHERE id = 1")
                .fetch_one(&self.pool)
                .await?;
        Ok(row.0)
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], block_height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE anchormap_indexer_state SET last_block_hash = $1, last_block_height = $2, updated_at = NOW() WHERE id = 1"
        )
        .bind(block_hash)
        .bind(block_height)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Insert a new marker
    pub async fn insert_marker(
        &self,
        txid: &[u8],
        vout: i32,
        category_id: i16,
        latitude: f32,
        longitude: f32,
        message: &str,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO markers (txid, vout, category_id, latitude, longitude, message, block_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (txid, vout) DO UPDATE SET
                category_id = EXCLUDED.category_id,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                message = EXCLUDED.message,
                block_hash = EXCLUDED.block_hash,
                block_height = EXCLUDED.block_height
            RETURNING id
            "#,
        )
        .bind(txid)
        .bind(vout)
        .bind(category_id)
        .bind(latitude)
        .bind(longitude)
        .bind(message)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        debug!(
            "Inserted marker at ({}, {}) with message: {}",
            latitude, longitude, message
        );
        Ok(row.0)
    }

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

    /// Get map statistics
    pub async fn get_stats(&self) -> Result<MapStats> {
        let row: (i64, i64, i64, Option<i32>, Option<chrono::DateTime<chrono::Utc>>) = sqlx::query_as(
            r#"
            SELECT 
                total_markers,
                total_transactions,
                total_replies,
                last_block_height,
                last_update
            FROM anchormap_stats
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(MapStats {
            total_markers: row.0,
            total_transactions: row.1,
            total_replies: row.2,
            last_block_height: row.3,
            last_update: row.4,
        })
    }

    /// Get all categories
    pub async fn get_categories(&self) -> Result<Vec<Category>> {
        let rows: Vec<(i16, String, String, String)> = sqlx::query_as(
            "SELECT id, name, icon, color FROM marker_categories ORDER BY id",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Category {
                id: r.0,
                name: r.1,
                icon: r.2,
                color: r.3,
            })
            .collect())
    }

    /// Get markers within bounds
    pub async fn get_markers_in_bounds(
        &self,
        lat_min: f32,
        lat_max: f32,
        lng_min: f32,
        lng_max: f32,
        category: Option<i16>,
        limit: i32,
    ) -> Result<Vec<Marker>> {
        let rows: Vec<(
            i32,
            Vec<u8>,
            i32,
            i16,
            String,
            String,
            String,
            f32,
            f32,
            String,
            Option<i32>,
            i64,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT * FROM get_markers_in_bounds($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(lat_min)
        .bind(lat_max)
        .bind(lng_min)
        .bind(lng_max)
        .bind(category)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Marker {
                id: r.0,
                txid: hex::encode(&r.1),
                vout: r.2,
                category: Category {
                    id: r.3,
                    name: r.4,
                    icon: r.5,
                    color: r.6,
                },
                latitude: r.7,
                longitude: r.8,
                message: r.9,
                block_height: r.10,
                reply_count: r.11,
                created_at: r.12,
            })
            .collect())
    }

    /// Search markers by message
    pub async fn search_markers(
        &self,
        query: &str,
        category: Option<i16>,
        limit: i32,
    ) -> Result<Vec<Marker>> {
        let rows: Vec<(
            i32,
            Vec<u8>,
            i32,
            i16,
            String,
            String,
            String,
            f32,
            f32,
            String,
            Option<i32>,
            i64,
            chrono::DateTime<chrono::Utc>,
            f32,
        )> = sqlx::query_as(
            r#"
            SELECT * FROM search_markers($1, $2, $3)
            "#,
        )
        .bind(query)
        .bind(category)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Marker {
                id: r.0,
                txid: hex::encode(&r.1),
                vout: r.2,
                category: Category {
                    id: r.3,
                    name: r.4,
                    icon: r.5,
                    color: r.6,
                },
                latitude: r.7,
                longitude: r.8,
                message: r.9,
                block_height: r.10,
                reply_count: r.11,
                created_at: r.12,
            })
            .collect())
    }

    /// Get recent markers
    pub async fn get_recent_markers(&self, limit: i32) -> Result<Vec<Marker>> {
        let rows: Vec<(
            i32,
            Vec<u8>,
            i32,
            i16,
            String,
            String,
            String,
            f32,
            f32,
            String,
            Option<i32>,
            i64,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT * FROM get_recent_markers($1)
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Marker {
                id: r.0,
                txid: hex::encode(&r.1),
                vout: r.2,
                category: Category {
                    id: r.3,
                    name: r.4,
                    icon: r.5,
                    color: r.6,
                },
                latitude: r.7,
                longitude: r.8,
                message: r.9,
                block_height: r.10,
                reply_count: r.11,
                created_at: r.12,
            })
            .collect())
    }

    /// Get a single marker by txid (hex string) and vout
    pub async fn get_marker(&self, txid_hex: &str, vout: i32) -> Result<Option<Marker>> {
        let row: Option<(
            i32,
            Vec<u8>,
            i32,
            i16,
            String,
            String,
            String,
            f32,
            f32,
            String,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT 
                m.id, m.txid, m.vout, m.category_id,
                c.name, c.icon, c.color,
                m.latitude, m.longitude, m.message, m.block_height, m.created_at
            FROM markers m
            JOIN marker_categories c ON m.category_id = c.id
            WHERE m.txid = decode($1, 'hex') AND m.vout = $2
            "#,
        )
        .bind(txid_hex)
        .bind(vout)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Marker {
            id: r.0,
            txid: hex::encode(&r.1),
            vout: r.2,
            category: Category {
                id: r.3,
                name: r.4,
                icon: r.5,
                color: r.6,
            },
            latitude: r.7,
            longitude: r.8,
            message: r.9,
            block_height: r.10,
            reply_count: 0, // Will be filled later
            created_at: r.11,
        }))
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

    /// Get marker with replies
    pub async fn get_marker_detail(&self, txid_hex: &str, vout: i32) -> Result<Option<MarkerDetail>> {
        let marker = self.get_marker(txid_hex, vout).await?;
        
        match marker {
            Some(mut m) => {
                let replies = self.get_marker_replies(txid_hex, vout).await?;
                m.reply_count = replies.len() as i64;
                Ok(Some(MarkerDetail { marker: m, replies }))
            }
            None => Ok(None),
        }
    }

    /// Check if a marker exists
    pub async fn marker_exists(&self, txid_hex: &str, vout: i32) -> Result<bool> {
        let row: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM markers WHERE txid = decode($1, 'hex') AND vout = $2)",
        )
        .bind(txid_hex)
        .bind(vout)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(row.0)
    }

    /// Try to resolve an anchor prefix to a marker's full txid
    pub async fn resolve_anchor_to_marker(
        &self,
        txid_prefix: &[u8; 8],
        vout: i32,
    ) -> Result<Option<Vec<u8>>> {
        // The txid_prefix contains the first 8 bytes in internal byte order
        // In display order (hex string), this corresponds to the LAST 16 characters
        // So we need to match the SUFFIX of the displayed txid
        
        // Reverse the prefix to match display order
        let mut reversed_prefix = *txid_prefix;
        reversed_prefix.reverse();
        let suffix_hex = hex::encode(reversed_prefix);
        
        let row: Option<(Vec<u8>,)> = sqlx::query_as(
            r#"
            SELECT txid FROM markers 
            WHERE encode(txid, 'hex') LIKE '%' || $1
            AND vout = $2
            LIMIT 1
            "#,
        )
        .bind(&suffix_hex)
        .bind(vout)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| r.0))
    }

    /// Handle a blockchain reorganization
    pub async fn handle_reorg(&self, from_height: i32) -> Result<u64> {
        // Remove replies from reorged blocks
        sqlx::query("DELETE FROM marker_replies WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Remove markers from reorged blocks
        let result = sqlx::query("DELETE FROM markers WHERE block_height >= $1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        // Update indexer state
        sqlx::query("UPDATE anchormap_indexer_state SET last_block_height = $1 - 1 WHERE id = 1")
            .bind(from_height)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }
}

