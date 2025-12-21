//! Database operations for Anchor Oracles

use anyhow::Result;
use sqlx::postgres::PgPool;

use crate::models::{
    Attestation, CategoryInfo, Dispute, EventRequest, Oracle, OracleCategories, OracleStats,
    category_name, dispute_reason_name,
};

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    // Oracle operations

    pub async fn get_oracles(&self, limit: i64, offset: i64) -> Result<Vec<Oracle>> {
        let rows = sqlx::query_as::<_, (
            i32, Vec<u8>, String, Option<String>, i32, i64, String,
            Option<i32>, i32, i32, i32, f32, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, pubkey, name, description, categories, stake_sats, status,
                   registered_at, total_attestations, successful_attestations,
                   disputed_attestations, reputation_score, created_at
            FROM oracles
            ORDER BY reputation_score DESC, total_attestations DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| {
            let cats = OracleCategories(r.4);
            Oracle {
                id: r.0,
                pubkey: hex::encode(&r.1),
                name: r.2,
                description: r.3,
                categories: r.4,
                category_names: cats.names().into_iter().map(String::from).collect(),
                stake_sats: r.5,
                status: r.6,
                registered_at: r.7,
                total_attestations: r.8,
                successful_attestations: r.9,
                disputed_attestations: r.10,
                reputation_score: r.11,
                created_at: r.12.to_rfc3339(),
            }
        }).collect())
    }

    pub async fn get_oracle_by_pubkey(&self, pubkey: &[u8]) -> Result<Option<Oracle>> {
        let row = sqlx::query_as::<_, (
            i32, Vec<u8>, String, Option<String>, i32, i64, String,
            Option<i32>, i32, i32, i32, f32, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, pubkey, name, description, categories, stake_sats, status,
                   registered_at, total_attestations, successful_attestations,
                   disputed_attestations, reputation_score, created_at
            FROM oracles
            WHERE pubkey = $1
            "#,
        )
        .bind(pubkey)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let cats = OracleCategories(r.4);
            Oracle {
                id: r.0,
                pubkey: hex::encode(&r.1),
                name: r.2,
                description: r.3,
                categories: r.4,
                category_names: cats.names().into_iter().map(String::from).collect(),
                stake_sats: r.5,
                status: r.6,
                registered_at: r.7,
                total_attestations: r.8,
                successful_attestations: r.9,
                disputed_attestations: r.10,
                reputation_score: r.11,
                created_at: r.12.to_rfc3339(),
            }
        }))
    }

    pub async fn insert_oracle(
        &self,
        pubkey: &[u8],
        name: &str,
        description: Option<&str>,
        categories: i32,
        txid: &[u8],
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO oracles (pubkey, name, description, categories, registered_txid, registered_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (pubkey) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                categories = EXCLUDED.categories,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(pubkey)
        .bind(name)
        .bind(description)
        .bind(categories)
        .bind(txid)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    // Attestation operations

    pub async fn get_attestations(&self, limit: i64, offset: i64) -> Result<Vec<Attestation>> {
        let rows = sqlx::query_as::<_, (
            i32, i32, Vec<u8>, i32, Option<i32>, i32, Vec<u8>,
            Option<String>, Vec<u8>, Vec<u8>, String, chrono::DateTime<chrono::Utc>, Option<String>,
        )>(
            r#"
            SELECT a.id, a.oracle_id, a.txid, a.vout, a.block_height, a.category,
                   a.event_id, a.event_description, a.outcome_data, a.schnorr_signature,
                   a.status, a.created_at, o.name as oracle_name
            FROM attestations a
            LEFT JOIN oracles o ON a.oracle_id = o.id
            ORDER BY a.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Attestation {
            id: r.0,
            oracle_id: r.1,
            oracle_name: r.12,
            txid: hex::encode(&r.2),
            vout: r.3,
            block_height: r.4,
            category: r.5,
            category_name: category_name(r.5),
            event_id: hex::encode(&r.6),
            event_description: r.7,
            outcome_data: hex::encode(&r.8),
            schnorr_signature: hex::encode(&r.9),
            status: r.10,
            created_at: r.11.to_rfc3339(),
        }).collect())
    }

    pub async fn get_attestations_by_oracle(&self, oracle_id: i32, limit: i64) -> Result<Vec<Attestation>> {
        let rows = sqlx::query_as::<_, (
            i32, i32, Vec<u8>, i32, Option<i32>, i32, Vec<u8>,
            Option<String>, Vec<u8>, Vec<u8>, String, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, oracle_id, txid, vout, block_height, category,
                   event_id, event_description, outcome_data, schnorr_signature,
                   status, created_at
            FROM attestations
            WHERE oracle_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(oracle_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Attestation {
            id: r.0,
            oracle_id: r.1,
            oracle_name: None,
            txid: hex::encode(&r.2),
            vout: r.3,
            block_height: r.4,
            category: r.5,
            category_name: category_name(r.5),
            event_id: hex::encode(&r.6),
            event_description: r.7,
            outcome_data: hex::encode(&r.8),
            schnorr_signature: hex::encode(&r.9),
            status: r.10,
            created_at: r.11.to_rfc3339(),
        }).collect())
    }

    // Dispute operations

    pub async fn get_disputes(&self, status: Option<&str>, limit: i64) -> Result<Vec<Dispute>> {
        let rows = if let Some(s) = status {
            sqlx::query_as::<_, (
                i32, i32, Vec<u8>, Vec<u8>, i32, Option<i32>, i32, i64,
                String, Option<String>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, attestation_id, disputer_pubkey, txid, vout, block_height,
                       reason, stake_sats, status, resolution, created_at
                FROM disputes
                WHERE status = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(s)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, (
                i32, i32, Vec<u8>, Vec<u8>, i32, Option<i32>, i32, i64,
                String, Option<String>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, attestation_id, disputer_pubkey, txid, vout, block_height,
                       reason, stake_sats, status, resolution, created_at
                FROM disputes
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows.into_iter().map(|r| Dispute {
            id: r.0,
            attestation_id: r.1,
            disputer_pubkey: hex::encode(&r.2),
            txid: hex::encode(&r.3),
            vout: r.4,
            block_height: r.5,
            reason: r.6,
            reason_name: dispute_reason_name(r.6),
            stake_sats: r.7,
            status: r.8,
            resolution: r.9,
            created_at: r.10.to_rfc3339(),
        }).collect())
    }

    // Event request operations

    pub async fn get_event_requests(&self, status: Option<&str>, limit: i64) -> Result<Vec<EventRequest>> {
        let rows = if let Some(s) = status {
            sqlx::query_as::<_, (
                i32, Vec<u8>, i32, String, Option<i32>, i64, String,
                Option<i32>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, event_id, category, description, resolution_block,
                       bounty_sats, status, fulfilled_by, created_at
                FROM event_requests
                WHERE status = $1
                ORDER BY bounty_sats DESC, created_at ASC
                LIMIT $2
                "#,
            )
            .bind(s)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, (
                i32, Vec<u8>, i32, String, Option<i32>, i64, String,
                Option<i32>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, event_id, category, description, resolution_block,
                       bounty_sats, status, fulfilled_by, created_at
                FROM event_requests
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows.into_iter().map(|r| EventRequest {
            id: r.0,
            event_id: hex::encode(&r.1),
            category: r.2,
            category_name: category_name(r.2),
            description: r.3,
            resolution_block: r.4,
            bounty_sats: r.5,
            status: r.6,
            fulfilled_by: r.7,
            created_at: r.8.to_rfc3339(),
        }).collect())
    }

    // Stats

    pub async fn get_stats(&self) -> Result<OracleStats> {
        let oracle_stats: (i64, i64, Option<i64>, Option<f64>, Option<i64>) = sqlx::query_as(
            r#"
            SELECT 
                COUNT(*)::BIGINT,
                COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
                COALESCE(SUM(stake_sats), 0)::BIGINT,
                AVG(reputation_score)::FLOAT8,
                COALESCE(SUM(total_attestations), 0)::BIGINT
            FROM oracles
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        let pending_events: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM event_requests WHERE status = 'pending'"
        )
        .fetch_one(&self.pool)
        .await?;

        let active_disputes: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM disputes WHERE status = 'pending'"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(OracleStats {
            total_oracles: oracle_stats.0,
            active_oracles: oracle_stats.1,
            total_staked: oracle_stats.2.unwrap_or(0),
            avg_reputation: oracle_stats.3.unwrap_or(50.0),
            total_attestations: oracle_stats.4.unwrap_or(0),
            pending_events: pending_events.0,
            active_disputes: active_disputes.0,
        })
    }

    pub async fn get_categories(&self) -> Result<Vec<CategoryInfo>> {
        let categories = vec![
            (1, "Block", "Block and chain data"),
            (2, "Prices", "Cryptocurrency and asset prices"),
            (4, "Sports", "Sports events and results"),
            (8, "Weather", "Weather data and forecasts"),
            (16, "Elections", "Election and political outcomes"),
            (32, "Random", "Random number generation (VRF)"),
            (64, "Custom", "Custom event types"),
        ];

        let mut result = Vec::new();
        for (id, name, desc) in categories {
            let oracle_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM oracles WHERE categories & $1 != 0 AND status = 'active'"
            )
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

            let attestation_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM attestations WHERE category = $1"
            )
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

            result.push(CategoryInfo {
                id,
                name: name.to_string(),
                description: desc.to_string(),
                oracle_count: oracle_count.0,
                attestation_count: attestation_count.0,
            });
        }

        Ok(result)
    }

    // Indexer state

    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            "SELECT last_block_height FROM indexer_state WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

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
}

