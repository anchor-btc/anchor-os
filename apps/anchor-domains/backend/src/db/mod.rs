//! Database operations for Anchor Domains
//!
//! This module is organized into submodules by functionality:
//! - `domains`: Domain CRUD operations
//! - `records`: DNS record operations
//! - `pending`: Pending transaction management
//! - `indexer`: Indexer state management

mod domains;
mod indexer;
mod pending;
mod records;

use anyhow::Result;
use sqlx::postgres::PgPool;

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

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

// The submodules implement methods on Database via impl blocks,
// so we don't need explicit re-exports.

