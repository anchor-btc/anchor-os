//! DNS record database operations

use anyhow::Result;

use super::Database;
use crate::models::{DnsRecordResponse, RecordType};

impl Database {
    /// Get active records for a domain
    pub async fn get_domain_records(&self, domain_id: i32) -> Result<Vec<DnsRecordResponse>> {
        let rows: Vec<(
            i32,
            i16,
            i32,
            String,
            Option<i32>,
            Option<i32>,
            Option<i32>,
            Vec<u8>,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT id, record_type, ttl, value, priority, weight, port, txid, block_height, created_at
            FROM dns_records
            WHERE domain_id = $1 AND is_active = TRUE
            ORDER BY record_type, created_at
            "#,
        )
        .bind(domain_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let record_type = RecordType::try_from(r.1 as u8)
                    .map(|rt| rt.name().to_string())
                    .unwrap_or_else(|_| format!("TYPE{}", r.1));

                DnsRecordResponse {
                    id: r.0,
                    record_type,
                    ttl: r.2,
                    value: r.3,
                    priority: r.4,
                    weight: r.5,
                    port: r.6,
                    txid: hex::encode(&r.7),
                    block_height: r.8,
                    created_at: r.9,
                }
            })
            .collect())
    }
}

