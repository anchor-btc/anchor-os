//! Configuration for the Dashboard backend

use anyhow::{Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub wallet_url: String,
    pub bitcoin_rpc_url: String,
    pub bitcoin_rpc_user: String,
    pub bitcoin_rpc_password: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8010".to_string())
                .parse()
                .context("Invalid PORT")?,
            wallet_url: std::env::var("WALLET_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
            bitcoin_rpc_url: std::env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:18443".to_string()),
            bitcoin_rpc_user: std::env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "anchor".to_string()),
            bitcoin_rpc_password: std::env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "anchor".to_string()),
        })
    }
}
