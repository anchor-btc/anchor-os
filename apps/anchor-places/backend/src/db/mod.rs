//! Database operations for Anchor Places
//!
//! This module contains all database-related functionality split into
//! focused submodules for better maintainability.

mod categories;
mod indexer_state;
mod markers;
mod replies;

use anyhow::Result;
use sqlx::postgres::PgPool;

pub use categories::*;
pub use indexer_state::*;
pub use markers::*;
pub use replies::*;

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

    /// Get the underlying pool reference
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

