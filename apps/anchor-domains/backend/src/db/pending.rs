//! Pending transaction database operations

#![allow(clippy::type_complexity)]

use anyhow::Result;
use tracing::debug;

use super::Database;
use crate::models::{DnsRecordInput, PendingTransaction};

impl Database {
    /// Create a pending transaction record
    pub async fn create_pending_transaction(
        &self,
        txid: &[u8],
        domain_name: &str,
        operation: i16,
        records: Option<&[DnsRecordInput]>,
        carrier: Option<i16>,
    ) -> Result<i32> {
        let records_json = records.map(|r| serde_json::to_value(r).unwrap_or_default());

        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO pending_transactions (txid, domain_name, operation, records_json, carrier)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (txid) DO UPDATE SET
                domain_name = EXCLUDED.domain_name,
                operation = EXCLUDED.operation,
                records_json = EXCLUDED.records_json,
                carrier = EXCLUDED.carrier,
                created_at = NOW(),
                expires_at = NOW() + INTERVAL '24 hours'
            RETURNING id
            "#,
        )
        .bind(txid)
        .bind(domain_name)
        .bind(operation)
        .bind(&records_json)
        .bind(carrier)
        .fetch_one(&self.pool)
        .await?;

        debug!("Created pending transaction for domain: {}", domain_name);
        Ok(row.0)
    }

    /// Get pending transaction for a domain
    pub async fn get_pending_transaction(
        &self,
        domain_name: &str,
    ) -> Result<Option<PendingTransaction>> {
        let row: Option<(
            i32,
            Vec<u8>,
            String,
            i16,
            Option<serde_json::Value>,
            Option<i16>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT id, txid, domain_name, operation, records_json, carrier, created_at
            FROM pending_transactions
            WHERE LOWER(domain_name) = LOWER($1)
            AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(domain_name)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => Ok(Some(Self::row_to_pending_transaction(r))),
            None => Ok(None),
        }
    }

    /// Check if a domain has a pending transaction
    pub async fn has_pending_transaction(&self, domain_name: &str) -> Result<bool> {
        let row: (bool,) = sqlx::query_as(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM pending_transactions 
                WHERE LOWER(domain_name) = LOWER($1)
                AND expires_at > NOW()
            )
            "#,
        )
        .bind(domain_name)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    /// Delete a pending transaction by txid
    pub async fn delete_pending_transaction(&self, txid: &[u8]) -> Result<bool> {
        let result = sqlx::query("DELETE FROM pending_transactions WHERE txid = $1")
            .bind(txid)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    /// Delete a pending transaction by domain name
    pub async fn delete_pending_by_domain(&self, domain_name: &str) -> Result<bool> {
        let result =
            sqlx::query("DELETE FROM pending_transactions WHERE LOWER(domain_name) = LOWER($1)")
                .bind(domain_name)
                .execute(&self.pool)
                .await?;
        Ok(result.rows_affected() > 0)
    }

    /// Get all pending transactions for domains owned by given txids
    pub async fn get_pending_by_owner_domains(
        &self,
        domain_names: &[String],
    ) -> Result<Vec<PendingTransaction>> {
        if domain_names.is_empty() {
            return Ok(vec![]);
        }

        let rows: Vec<(
            i32,
            Vec<u8>,
            String,
            i16,
            Option<serde_json::Value>,
            Option<i16>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT id, txid, domain_name, operation, records_json, carrier, created_at
            FROM pending_transactions
            WHERE LOWER(domain_name) = ANY(SELECT LOWER(unnest($1::text[])))
            AND expires_at > NOW()
            ORDER BY created_at DESC
            "#,
        )
        .bind(domain_names)
        .fetch_all(&self.pool)
        .await?;

        let pending = rows
            .into_iter()
            .map(Self::row_to_pending_transaction)
            .collect();

        Ok(pending)
    }

    /// Cleanup expired pending transactions
    pub async fn cleanup_expired_pending(&self) -> Result<u64> {
        let result = sqlx::query("DELETE FROM pending_transactions WHERE expires_at < NOW()")
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    /// List all active pending transactions
    pub async fn list_pending_transactions(&self) -> Result<Vec<PendingTransaction>> {
        let rows: Vec<(
            i32,
            Vec<u8>,
            String,
            i16,
            Option<serde_json::Value>,
            Option<i16>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT id, txid, domain_name, operation, records_json, carrier, created_at
            FROM pending_transactions
            WHERE expires_at > NOW()
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let pending = rows
            .into_iter()
            .map(Self::row_to_pending_transaction)
            .collect();

        Ok(pending)
    }

    /// Helper to convert database row to PendingTransaction
    fn row_to_pending_transaction(
        row: (
            i32,
            Vec<u8>,
            String,
            i16,
            Option<serde_json::Value>,
            Option<i16>,
            chrono::DateTime<chrono::Utc>,
        ),
    ) -> PendingTransaction {
        let operation = match row.3 {
            1 => "register".to_string(),
            2 => "update".to_string(),
            3 => "transfer".to_string(),
            _ => format!("unknown({})", row.3),
        };

        let records: Option<Vec<DnsRecordInput>> =
            row.4.and_then(|v| serde_json::from_value(v).ok());

        PendingTransaction {
            id: row.0,
            txid: hex::encode(&row.1),
            domain_name: row.2,
            operation,
            records,
            carrier: row.5,
            created_at: row.6,
        }
    }
}
