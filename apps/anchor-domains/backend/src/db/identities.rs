//! Domain identity database operations

use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::Database;

/// Domain identity record from the database
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DomainIdentityRow {
    pub id: i32,
    pub domain_id: i32,
    pub identity_type: String,
    pub public_key: String,
    pub subdomain: Option<String>,
    pub record_name: String,
    pub published_at: chrono::DateTime<chrono::Utc>,
}

impl Database {
    /// Insert a new domain identity and create corresponding TXT record
    pub async fn insert_domain_identity(
        &self,
        domain_id: i32,
        identity_type: &str,
        public_key: &str,
        subdomain: Option<&str>,
        record_name: &str,
        record_value: &str,
    ) -> Result<i32> {
        let mut tx = self.pool.begin().await?;

        // Insert into domain_identities
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO domain_identities (domain_id, identity_type, public_key, subdomain, record_name)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (domain_id, identity_type, subdomain) DO UPDATE SET
                public_key = EXCLUDED.public_key,
                record_name = EXCLUDED.record_name,
                published_at = NOW()
            RETURNING id
            "#,
        )
        .bind(domain_id)
        .bind(identity_type)
        .bind(public_key)
        .bind(subdomain)
        .bind(record_name)
        .fetch_one(&mut *tx)
        .await?;

        let identity_id = row.0;

        // Get the domain's current txid for the DNS record reference
        let domain_txid: (Vec<u8>, i32, Option<i32>) =
            sqlx::query_as("SELECT txid, vout, block_height FROM domains WHERE id = $1")
                .bind(domain_id)
                .fetch_one(&mut *tx)
                .await?;

        // Create the TXT record for this identity (Selfie Records format)
        // Record type 4 = TXT (in anchor-specs enum)
        // Selfie Records format:
        //   TXT key (record_name): user._nostr.domain or subdomain.user._nostr.domain
        //   TXT value: just the formatted public key (npub1xxx... or pk:xxx...)
        // We store: record_name=value as the TXT record value since DNS record names
        // are not separately stored in our schema

        // First, deactivate any existing identity TXT records for this identity type on this domain
        let identity_prefix = if identity_type == "nostr" {
            "npub1"
        } else {
            "pk:"
        };
        sqlx::query(
            r#"
            UPDATE dns_records 
            SET is_active = FALSE 
            WHERE domain_id = $1 AND record_type = 4 AND value LIKE $2
            "#,
        )
        .bind(domain_id)
        .bind(format!("{}%", identity_prefix))
        .execute(&mut *tx)
        .await?;

        // Insert the new TXT record with the formatted public key as value
        // record_name stores just the prefix/subdomain (e.g., "user._nostr" or "hello.user._nostr")
        // The full DNS name is: {record_name}.{domain}
        let name_prefix = if let Some(sub) = subdomain {
            format!("{}.user._{}", sub, identity_type)
        } else {
            format!("user._{}", identity_type)
        };

        sqlx::query(
            r#"
            INSERT INTO dns_records (domain_id, txid, vout, record_type, ttl, value, record_name, block_height, is_active)
            VALUES ($1, $2, $3, 4, 300, $4, $5, $6, TRUE)
            "#,
        )
        .bind(domain_id)
        .bind(&domain_txid.0)
        .bind(domain_txid.1)
        .bind(record_value) // Just the formatted public key: npub1xxx... or pk:xxx...
        .bind(&name_prefix) // Just the prefix: user._nostr or hello.user._nostr
        .bind(domain_txid.2)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(identity_id)
    }

    /// Get all identities for a domain
    pub async fn get_domain_identities(&self, domain_id: i32) -> Result<Vec<DomainIdentityRow>> {
        let rows = sqlx::query_as::<_, DomainIdentityRow>(
            r#"
            SELECT id, domain_id, identity_type, public_key, subdomain, record_name, published_at
            FROM domain_identities
            WHERE domain_id = $1
            ORDER BY published_at DESC
            "#,
        )
        .bind(domain_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    /// Delete a domain identity and its corresponding TXT record
    pub async fn delete_domain_identity(
        &self,
        domain_id: i32,
        identity_type: &str,
        subdomain: Option<&str>,
    ) -> Result<bool> {
        let mut tx = self.pool.begin().await?;

        // Delete the identity record
        let result = if subdomain.is_some() {
            sqlx::query(
                r#"
                DELETE FROM domain_identities
                WHERE domain_id = $1 AND identity_type = $2 AND subdomain = $3
                "#,
            )
            .bind(domain_id)
            .bind(identity_type)
            .bind(subdomain)
            .execute(&mut *tx)
            .await?
        } else {
            sqlx::query(
                r#"
                DELETE FROM domain_identities
                WHERE domain_id = $1 AND identity_type = $2 AND subdomain IS NULL
                "#,
            )
            .bind(domain_id)
            .bind(identity_type)
            .execute(&mut *tx)
            .await?
        };

        // Also deactivate the TXT record (record_type 4 = TXT in anchor-specs)
        // Identity TXT records start with npub1 (nostr) or pk: (pubky)
        let identity_prefix = if identity_type == "nostr" {
            "npub1"
        } else {
            "pk:"
        };
        sqlx::query(
            r#"
            UPDATE dns_records 
            SET is_active = FALSE 
            WHERE domain_id = $1 AND record_type = 4 AND value LIKE $2
            "#,
        )
        .bind(domain_id)
        .bind(format!("{}%", identity_prefix))
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(result.rows_affected() > 0)
    }
}
