//! Configuration for the wallet service

use anyhow::{Context, Result};
use bdk_wallet::bitcoin::Network;
use std::env;
use std::path::PathBuf;

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
    /// Data directory for wallet files (locks, etc.)
    pub data_dir: PathBuf,
    /// Anchor Domains backend URL
    pub domains_url: String,
    /// Anchor Tokens backend URL
    pub tokens_url: String,
    /// Whether to auto-lock ownership UTXOs
    pub auto_lock_enabled: bool,
    /// Electrum server URL for BDK
    pub electrum_url: String,
    /// Enable BDK wallet (key management)
    pub bdk_enabled: bool,
    /// BDK wallet password (for mnemonic encryption)
    pub bdk_password: Option<String>,
    /// Bitcoin network
    pub network: String,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        let data_dir = env::var("ANCHOR_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                dirs::data_local_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("anchor-wallet")
            });

        let network = env::var("BITCOIN_NETWORK")
            .unwrap_or_else(|_| "regtest".to_string());

        // Default Electrum URL based on network
        // In Docker, use the service name; on host, use localhost
        let default_electrum = match network.as_str() {
            "mainnet" | "bitcoin" => "ssl://electrum.blockstream.info:50002",
            "testnet" => "ssl://electrum.blockstream.info:60002",
            _ => "tcp://core-electrs:50001", // regtest/signet - use docker service name
        };

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
                .unwrap_or_else(|_| "8001".to_string())
                .parse()
                .context("Invalid PORT")?,
            data_dir,
            domains_url: env::var("ANCHOR_DOMAINS_URL")
                .unwrap_or_else(|_| "http://localhost:3400".to_string()),
            tokens_url: env::var("ANCHOR_TOKENS_URL")
                .unwrap_or_else(|_| "http://localhost:3500".to_string()),
            auto_lock_enabled: env::var("AUTO_LOCK_OWNERSHIP_UTXOS")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            electrum_url: env::var("ELECTRUM_URL")
                .unwrap_or_else(|_| default_electrum.to_string()),
            bdk_enabled: env::var("BDK_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            bdk_password: env::var("BDK_PASSWORD").ok(),
            network,
        })
    }

    /// Get the Bitcoin network
    pub fn get_network(&self) -> Network {
        match self.network.as_str() {
            "mainnet" | "bitcoin" => Network::Bitcoin,
            "testnet" => Network::Testnet,
            "signet" => Network::Signet,
            _ => Network::Regtest,
        }
    }
}
