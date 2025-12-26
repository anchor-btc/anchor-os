//! Database operations for AnchorCanvas
//!
//! This module is organized into submodules for different data types:
//! - `pixels` - Pixel state and history operations
//! - `indexer` - Indexer state tracking

mod indexer;
mod pixels;

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
}
