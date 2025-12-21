//! Configuration for the Anchor Places backend

use std::env;

/// Application configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Database connection URL
    pub database_url: String,
    /// Bitcoin Core RPC URL
    pub bitcoin_rpc_url: String,
    /// Bitcoin Core RPC username
    pub bitcoin_rpc_user: String,
    /// Bitcoin Core RPC password
    pub bitcoin_rpc_password: String,
    /// Wallet API URL for creating transactions
    pub wallet_url: String,
    /// Server host
    pub host: String,
    /// Server port
    pub port: u16,
    /// Indexer poll interval in seconds
    pub poll_interval_secs: u64,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/anchor".to_string()),
            bitcoin_rpc_url: env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:18443".to_string()),
            bitcoin_rpc_user: env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "user".to_string()),
            bitcoin_rpc_password: env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "pass".to_string()),
            wallet_url: env::var("WALLET_URL")
                .unwrap_or_else(|_| "http://localhost:8001".to_string()),
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3301),
            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5),
        }
    }
}

