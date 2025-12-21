//! Configuration for the AnchorProofs backend

use serde::Deserialize;

/// Application configuration
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Database connection URL
    #[serde(default = "default_database_url")]
    pub database_url: String,

    /// HTTP server host
    #[serde(default = "default_host")]
    pub host: String,

    /// HTTP server port
    #[serde(default = "default_port")]
    pub port: u16,

    /// Bitcoin RPC URL
    #[serde(default = "default_bitcoin_rpc_url")]
    pub bitcoin_rpc_url: String,

    /// Bitcoin RPC username
    #[serde(default = "default_bitcoin_rpc_user")]
    pub bitcoin_rpc_user: String,

    /// Bitcoin RPC password
    #[serde(default = "default_bitcoin_rpc_password")]
    pub bitcoin_rpc_password: String,

    /// Wallet service URL
    #[serde(default = "default_wallet_url")]
    pub wallet_url: String,

    /// Number of confirmations before indexing
    #[serde(default = "default_confirmations")]
    pub confirmations: u32,

    /// Poll interval for new blocks (seconds)
    #[serde(default = "default_poll_interval")]
    pub poll_interval_secs: u64,

    /// Enable indexer
    #[serde(default = "default_indexer_enabled")]
    pub indexer_enabled: bool,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        envy::from_env().unwrap_or_else(|e| {
            tracing::warn!("Failed to load config from env: {}, using defaults", e);
            Config::default()
        })
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: default_database_url(),
            host: default_host(),
            port: default_port(),
            bitcoin_rpc_url: default_bitcoin_rpc_url(),
            bitcoin_rpc_user: default_bitcoin_rpc_user(),
            bitcoin_rpc_password: default_bitcoin_rpc_password(),
            wallet_url: default_wallet_url(),
            confirmations: default_confirmations(),
            poll_interval_secs: default_poll_interval(),
            indexer_enabled: default_indexer_enabled(),
        }
    }
}

fn default_database_url() -> String {
    "postgres://anchor:anchor@localhost:5432/anchor".to_string()
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    3501
}

fn default_bitcoin_rpc_url() -> String {
    "http://localhost:18443".to_string()
}

fn default_bitcoin_rpc_user() -> String {
    "bitcoin".to_string()
}

fn default_bitcoin_rpc_password() -> String {
    "bitcoin".to_string()
}

fn default_wallet_url() -> String {
    "http://localhost:8001".to_string()
}

fn default_confirmations() -> u32 {
    1
}

fn default_poll_interval() -> u64 {
    5
}

fn default_indexer_enabled() -> bool {
    true
}
