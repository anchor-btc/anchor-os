//! Configuration for the wallet service

use anyhow::{Context, Result};
use std::env;

/// Wallet service configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Bitcoin RPC URL
    pub bitcoin_rpc_url: String,
    /// Bitcoin RPC username
    pub bitcoin_rpc_user: String,
    /// Bitcoin RPC password
    pub bitcoin_rpc_password: String,
    /// Wallet name in Bitcoin Core
    pub wallet_name: String,
    /// HTTP server port
    pub port: u16,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            bitcoin_rpc_url: env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:18443".to_string()),
            bitcoin_rpc_user: env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "anchor".to_string()),
            bitcoin_rpc_password: env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "anchor".to_string()),
            wallet_name: env::var("WALLET_NAME")
                .unwrap_or_else(|_| "anchor_wallet".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .context("Invalid PORT")?,
        })
    }
}

