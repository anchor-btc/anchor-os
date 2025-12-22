//! Database operations for AnchorProofs
//!
//! This module is organized into submodules for different data types:
//! - `proofs` - Proof CRUD operations
//! - `indexer_state` - Indexer state tracking

mod indexer_state;
mod proofs;

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

/// Database connection pool wrapper
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Create a new database connection pool
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await
            .context("Failed to connect to database")?;

        info!("Connected to database");

        Ok(Self { pool })
    }
}

