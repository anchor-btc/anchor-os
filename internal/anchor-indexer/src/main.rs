//! ANCHOR Protocol Indexer
//!
//! Scans the Bitcoin blockchain and indexes ANCHOR messages.

mod config;
mod db;
mod indexer;

use anyhow::Result;
use tracing::info;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::indexer::Indexer;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    info!("Starting ANCHOR Indexer");

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    // Create and run indexer
    let indexer = Indexer::new(config).await?;
    indexer.run().await?;

    Ok(())
}

