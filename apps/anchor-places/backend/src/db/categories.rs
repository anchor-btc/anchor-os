//! Category database operations

use anyhow::Result;

use super::Database;
use crate::models::{Category, MapStats};

impl Database {
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
            FROM places_stats
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
}

