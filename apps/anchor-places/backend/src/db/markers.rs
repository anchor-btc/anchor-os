//! Marker database operations

use anyhow::Result;
use tracing::debug;

use super::Database;
use crate::models::{Category, Marker, MarkerDetail};

impl Database {
    /// Insert a new marker
    pub async fn insert_marker(
        &self,
        txid: &[u8],
        vout: i32,
        category_id: i16,
        latitude: f32,
        longitude: f32,
        message: &str,
        creator_address: Option<&str>,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO markers (txid, vout, category_id, latitude, longitude, message, creator_address, block_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (txid, vout) DO UPDATE SET
                category_id = EXCLUDED.category_id,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                message = EXCLUDED.message,
                creator_address = EXCLUDED.creator_address,
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
        .bind(creator_address)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        debug!(
            "Inserted marker at ({}, {}) with message: {} (creator: {:?})",
            latitude, longitude, message, creator_address
        );
        Ok(row.0)
    }

    /// Find the first marker at exact coordinates (for ownership rule)
    pub async fn find_marker_at_coordinates(
        &self,
        latitude: f32,
        longitude: f32,
    ) -> Result<Option<(Vec<u8>, i32)>> {
        let row: Option<(Vec<u8>, i32)> = sqlx::query_as(
            r#"
            SELECT txid, vout FROM markers 
            WHERE latitude = $1 AND longitude = $2 
            ORDER BY id ASC 
            LIMIT 1
            "#,
        )
        .bind(latitude)
        .bind(longitude)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
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
                creator_address: None, // SQL function doesn't return this
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
                creator_address: None, // SQL function doesn't return this
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
                creator_address: None, // SQL function doesn't return this
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
            creator_address: None, // Will be filled later if needed
            block_height: r.10,
            reply_count: 0, // Will be filled later
            created_at: r.11,
        }))
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

    /// Get markers created by a specific address
    pub async fn get_markers_by_creator(
        &self,
        address: &str,
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
            SELECT * FROM get_markers_by_creator($1, $2, $3)
            "#,
        )
        .bind(address)
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
                creator_address: None, // SQL function doesn't return this
                block_height: r.10,
                reply_count: r.11,
                created_at: r.12,
            })
            .collect())
    }
}

