//! Domain CRUD operations

#![allow(clippy::type_complexity)]

use anyhow::Result;
use tracing::debug;

use super::Database;
use crate::models::{DnsRecord, DnsStats, Domain, DomainListItem, ResolveResponse};

impl Database {
    /// Check if a domain name is available
    pub async fn is_domain_available(&self, name: &str) -> Result<bool> {
        let row: (bool,) = sqlx::query_as(
            "SELECT NOT EXISTS(SELECT 1 FROM domains WHERE LOWER(name) = LOWER($1))",
        )
        .bind(name)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    /// Register a new domain
    pub async fn register_domain(
        &self,
        name: &str,
        txid: &[u8],
        vout: i32,
        records: &[DnsRecord],
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Insert domain
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO domains (name, txid, vout, owner_txid, owner_vout, block_hash, block_height)
            VALUES ($1, $2, $3, $2, $3, $4, $5)
            ON CONFLICT (name) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(name)
        .bind(txid)
        .bind(vout)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&mut *tx)
        .await?;

        let domain_id = row.0;

        // Insert records
        for record in records {
            sqlx::query(
                r#"
                INSERT INTO dns_records (domain_id, txid, vout, record_type, ttl, value, priority, weight, port, block_hash, block_height)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
            )
            .bind(domain_id)
            .bind(txid)
            .bind(vout)
            .bind(record.record_type as i16)
            .bind(record.ttl as i32)
            .bind(&record.value)
            .bind(record.priority.map(|p| p as i32))
            .bind(record.weight.map(|w| w as i32))
            .bind(record.port.map(|p| p as i32))
            .bind(block_hash)
            .bind(block_height)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        debug!("Registered domain: {} with {} records", name, records.len());
        Ok(domain_id)
    }

    /// Update domain records
    pub async fn update_domain(
        &self,
        name: &str,
        txid: &[u8],
        vout: i32,
        records: &[DnsRecord],
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<bool> {
        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Get domain ID
        let domain_row: Option<(i32,)> =
            sqlx::query_as("SELECT id FROM domains WHERE LOWER(name) = LOWER($1)")
                .bind(name)
                .fetch_optional(&mut *tx)
                .await?;

        let domain_id = match domain_row {
            Some((id,)) => id,
            None => return Ok(false),
        };

        // Update domain txid AND owner_txid to maintain ownership chain
        sqlx::query(
            r#"
            UPDATE domains 
            SET txid = $1, vout = $2, owner_txid = $1, owner_vout = $2, 
                block_hash = $3, block_height = $4, updated_at = NOW()
            WHERE id = $5
            "#,
        )
        .bind(txid)
        .bind(vout)
        .bind(block_hash)
        .bind(block_height)
        .bind(domain_id)
        .execute(&mut *tx)
        .await?;

        // Deactivate old records
        sqlx::query("UPDATE dns_records SET is_active = FALSE WHERE domain_id = $1")
            .bind(domain_id)
            .execute(&mut *tx)
            .await?;

        // Insert new records
        for record in records {
            sqlx::query(
                r#"
                INSERT INTO dns_records (domain_id, txid, vout, record_type, ttl, value, priority, weight, port, block_hash, block_height)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
            )
            .bind(domain_id)
            .bind(txid)
            .bind(vout)
            .bind(record.record_type as i16)
            .bind(record.ttl as i32)
            .bind(&record.value)
            .bind(record.priority.map(|p| p as i32))
            .bind(record.weight.map(|w| w as i32))
            .bind(record.port.map(|p| p as i32))
            .bind(block_hash)
            .bind(block_height)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        debug!("Updated domain: {} with {} records", name, records.len());
        Ok(true)
    }

    /// Resolve a domain by name
    pub async fn resolve_by_name(&self, name: &str) -> Result<Option<ResolveResponse>> {
        let domain_row: Option<(i32, String, Vec<u8>, i32)> = sqlx::query_as(
            "SELECT id, name, txid, vout FROM domains WHERE LOWER(name) = LOWER($1)",
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        match domain_row {
            Some((domain_id, name, txid, vout)) => {
                let records = self.get_domain_records(domain_id).await?;
                let txid_hex = hex::encode(&txid);
                let txid_prefix = hex::encode(&txid[..8]);

                Ok(Some(ResolveResponse {
                    name,
                    txid: txid_hex,
                    vout,
                    txid_prefix,
                    records,
                }))
            }
            None => Ok(None),
        }
    }

    /// Resolve a domain by txid prefix (first 8 bytes)
    pub async fn resolve_by_txid_prefix(
        &self,
        prefix_hex: &str,
    ) -> Result<Option<ResolveResponse>> {
        let prefix_bytes =
            hex::decode(prefix_hex).map_err(|e| anyhow::anyhow!("Invalid hex: {}", e))?;
        if prefix_bytes.len() != 8 {
            return Err(anyhow::anyhow!("Prefix must be 8 bytes (16 hex chars)"));
        }

        let domain_row: Option<(i32, String, Vec<u8>, i32)> = sqlx::query_as(
            r#"
            SELECT id, name, txid, vout 
            FROM domains 
            WHERE substring(txid from 1 for 8) = $1
            "#,
        )
        .bind(&prefix_bytes)
        .fetch_optional(&self.pool)
        .await?;

        match domain_row {
            Some((domain_id, name, txid, vout)) => {
                let records = self.get_domain_records(domain_id).await?;
                let txid_hex = hex::encode(&txid);

                Ok(Some(ResolveResponse {
                    name,
                    txid: txid_hex,
                    vout,
                    txid_prefix: prefix_hex.to_string(),
                    records,
                }))
            }
            None => Ok(None),
        }
    }

    /// Get a domain by name with all details
    pub async fn get_domain(&self, name: &str) -> Result<Option<Domain>> {
        let row: Option<(
            i32,
            String,
            Vec<u8>,
            i32,
            Vec<u8>,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
            SELECT id, name, txid, vout, owner_txid, block_height, created_at, updated_at
            FROM domains
            WHERE LOWER(name) = LOWER($1)
            "#,
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => {
                let records = self.get_domain_records(r.0).await?;
                let txid_hex = hex::encode(&r.2);
                let txid_prefix = hex::encode(&r.2[..8]);

                Ok(Some(Domain {
                    id: r.0,
                    name: r.1,
                    txid: txid_hex,
                    vout: r.3,
                    txid_prefix,
                    owner_txid: hex::encode(&r.4),
                    block_height: r.5,
                    records,
                    created_at: r.6,
                    updated_at: r.7,
                }))
            }
            None => Ok(None),
        }
    }

    /// List all domains with pagination
    pub async fn list_domains(
        &self,
        page: i32,
        per_page: i32,
        search: Option<&str>,
    ) -> Result<(Vec<DomainListItem>, i64)> {
        let offset = (page - 1) * per_page;

        let (rows, total): (Vec<_>, i64) = if let Some(q) = search {
            let rows: Vec<(
                i32,
                String,
                Vec<u8>,
                i64,
                Option<i32>,
                chrono::DateTime<chrono::Utc>,
            )> = sqlx::query_as(
                r#"
                    SELECT d.id, d.name, d.txid, 
                           COUNT(r.id) FILTER (WHERE r.is_active = TRUE) as record_count,
                           d.block_height, d.created_at
                    FROM domains d
                    LEFT JOIN dns_records r ON r.domain_id = d.id
                    WHERE d.name ILIKE '%' || $1 || '%'
                    GROUP BY d.id
                    ORDER BY d.created_at DESC
                    LIMIT $2 OFFSET $3
                    "#,
            )
            .bind(q)
            .bind(per_page)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let total: (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM domains WHERE name ILIKE '%' || $1 || '%'")
                    .bind(q)
                    .fetch_one(&self.pool)
                    .await?;

            (rows, total.0)
        } else {
            let rows: Vec<(
                i32,
                String,
                Vec<u8>,
                i64,
                Option<i32>,
                chrono::DateTime<chrono::Utc>,
            )> = sqlx::query_as(
                r#"
                    SELECT d.id, d.name, d.txid,
                           COUNT(r.id) FILTER (WHERE r.is_active = TRUE) as record_count,
                           d.block_height, d.created_at
                    FROM domains d
                    LEFT JOIN dns_records r ON r.domain_id = d.id
                    GROUP BY d.id
                    ORDER BY d.created_at DESC
                    LIMIT $1 OFFSET $2
                    "#,
            )
            .bind(per_page)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM domains")
                .fetch_one(&self.pool)
                .await?;

            (rows, total.0)
        };

        let items = rows
            .into_iter()
            .map(|r| {
                let txid_hex = hex::encode(&r.2);
                let txid_prefix = hex::encode(&r.2[..8.min(r.2.len())]);

                DomainListItem {
                    id: r.0,
                    name: r.1,
                    txid: txid_hex,
                    txid_prefix,
                    record_count: r.3,
                    block_height: r.4,
                    created_at: r.5,
                }
            })
            .collect();

        Ok((items, total))
    }

    /// Get domain history
    pub async fn get_domain_history(
        &self,
        name: &str,
    ) -> Result<
        Vec<(
            Vec<u8>,
            i32,
            i16,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )>,
    > {
        let rows = sqlx::query_as(
            r#"
            SELECT h.txid, h.vout, h.operation, h.block_height, h.created_at
            FROM domain_history h
            JOIN domains d ON d.id = h.domain_id
            WHERE LOWER(d.name) = LOWER($1)
            ORDER BY h.created_at DESC
            "#,
        )
        .bind(name)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    /// Get statistics
    pub async fn get_stats(&self) -> Result<DnsStats> {
        let row: (
            i64,
            i64,
            i64,
            Option<i32>,
            Option<chrono::DateTime<chrono::Utc>>,
        ) = sqlx::query_as("SELECT * FROM anchor_domains_stats")
            .fetch_one(&self.pool)
            .await?;

        Ok(DnsStats {
            total_domains: row.0,
            total_records: row.1,
            total_transactions: row.2,
            last_block_height: row.3,
            last_update: row.4,
        })
    }

    /// Check if a transaction exists
    pub async fn tx_exists(&self, txid: &[u8], vout: i32) -> Result<bool> {
        let row: (bool,) =
            sqlx::query_as("SELECT EXISTS(SELECT 1 FROM domains WHERE txid = $1 AND vout = $2)")
                .bind(txid)
                .bind(vout)
                .fetch_one(&self.pool)
                .await?;
        Ok(row.0)
    }

    /// Get domain owner txid for update verification
    pub async fn get_domain_owner(&self, name: &str) -> Result<Option<(Vec<u8>, i32)>> {
        let row: Option<(Vec<u8>, i32)> = sqlx::query_as(
            "SELECT owner_txid, owner_vout FROM domains WHERE LOWER(name) = LOWER($1)",
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    /// Optimistically update domain owner after successful broadcast
    pub async fn update_domain_owner_optimistic(
        &self,
        name: &str,
        new_owner_txid: &[u8],
        new_owner_vout: i32,
    ) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE domains 
            SET owner_txid = $1, owner_vout = $2, updated_at = NOW()
            WHERE LOWER(name) = LOWER($3)
            "#,
        )
        .bind(new_owner_txid)
        .bind(new_owner_vout)
        .bind(name)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get domains owned by a list of txids (for "My Domains" feature)
    pub async fn get_domains_by_owner_txids(
        &self,
        txids: &[Vec<u8>],
    ) -> Result<Vec<DomainListItem>> {
        if txids.is_empty() {
            return Ok(vec![]);
        }

        let rows: Vec<(
            i32,
            String,
            Vec<u8>,
            i64,
            Option<i32>,
            chrono::DateTime<chrono::Utc>,
        )> = sqlx::query_as(
            r#"
                SELECT d.id, d.name, d.txid, 
                       COUNT(r.id) FILTER (WHERE r.is_active = TRUE) as record_count,
                       d.block_height, d.created_at
                FROM domains d
                LEFT JOIN dns_records r ON r.domain_id = d.id
                WHERE d.owner_txid = ANY($1)
                GROUP BY d.id
                ORDER BY d.created_at DESC
                "#,
        )
        .bind(txids)
        .fetch_all(&self.pool)
        .await?;

        let items = rows
            .into_iter()
            .map(|r| {
                let txid_hex = hex::encode(&r.2);
                let txid_prefix = hex::encode(&r.2[..std::cmp::min(8, r.2.len())]);
                DomainListItem {
                    id: r.0,
                    name: r.1,
                    txid: txid_hex,
                    txid_prefix,
                    record_count: r.3,
                    block_height: r.4,
                    created_at: r.5,
                }
            })
            .collect();

        Ok(items)
    }
}
