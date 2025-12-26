//! Configuration for the indexer

use anyhow::{Context, Result};
use std::env;

/// Indexer configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Bitcoin RPC URL
    pub bitcoin_rpc_url: String,
    /// Bitcoin RPC username
    pub bitcoin_rpc_user: String,
    /// Bitcoin RPC password
    pub bitcoin_rpc_password: String,
    /// Database URL
    pub database_url: String,
    /// Polling interval in seconds
    pub poll_interval_secs: u64,
    /// Number of confirmations before considering a block final
    pub confirmations: u32,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            bitcoin_rpc_url: env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:18443".to_string()),
            bitcoin_rpc_user: env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "anchor".to_string()),
            bitcoin_rpc_password: env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "anchor".to_string()),
            database_url: env::var("DATABASE_URL").context("DATABASE_URL must be set")?,
            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .unwrap_or(5),
            confirmations: env::var("CONFIRMATIONS")
                .unwrap_or_else(|_| "1".to_string())
                .parse()
                .unwrap_or(1),
        })
    }
}
