//! Wallet configuration

use crate::error::{Result, WalletError};

/// Configuration for connecting to a Bitcoin Core node
#[derive(Debug, Clone)]
pub struct WalletConfig {
    /// Bitcoin Core RPC URL (e.g., "http://127.0.0.1:18443")
    pub rpc_url: String,
    
    /// RPC username
    pub rpc_user: String,
    
    /// RPC password
    pub rpc_password: String,
    
    /// Wallet name (optional, for multi-wallet setups)
    pub wallet_name: Option<String>,
    
    /// Bitcoin network
    pub network: bitcoin::Network,
    
    /// Default fee rate in sat/vB
    pub fee_rate: f64,
    
    /// Minimum confirmations for UTXOs
    pub min_confirmations: u32,
}

impl WalletConfig {
    /// Create a new configuration with required parameters
    ///
    /// # Example
    ///
    /// ```rust
    /// use anchor_wallet_lib::WalletConfig;
    ///
    /// let config = WalletConfig::new(
    ///     "http://127.0.0.1:18443",
    ///     "bitcoin",
    ///     "password",
    /// );
    /// ```
    pub fn new(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        Self {
            rpc_url: rpc_url.to_string(),
            rpc_user: rpc_user.to_string(),
            rpc_password: rpc_password.to_string(),
            wallet_name: None,
            network: bitcoin::Network::Regtest,
            fee_rate: 1.0,
            min_confirmations: 1,
        }
    }

    /// Create configuration for mainnet
    pub fn mainnet(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        let mut config = Self::new(rpc_url, rpc_user, rpc_password);
        config.network = bitcoin::Network::Bitcoin;
        config.min_confirmations = 6;
        config
    }

    /// Create configuration for testnet
    pub fn testnet(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        let mut config = Self::new(rpc_url, rpc_user, rpc_password);
        config.network = bitcoin::Network::Testnet;
        config.min_confirmations = 1;
        config
    }

    /// Create configuration for signet
    pub fn signet(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        let mut config = Self::new(rpc_url, rpc_user, rpc_password);
        config.network = bitcoin::Network::Signet;
        config.min_confirmations = 1;
        config
    }

    /// Create configuration for regtest
    pub fn regtest(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        let mut config = Self::new(rpc_url, rpc_user, rpc_password);
        config.network = bitcoin::Network::Regtest;
        config.min_confirmations = 0;
        config
    }

    /// Set wallet name
    pub fn with_wallet(mut self, wallet_name: &str) -> Self {
        self.wallet_name = Some(wallet_name.to_string());
        self
    }

    /// Set fee rate in sat/vB
    pub fn with_fee_rate(mut self, fee_rate: f64) -> Self {
        self.fee_rate = fee_rate;
        self
    }

    /// Set minimum confirmations
    pub fn with_min_confirmations(mut self, confirmations: u32) -> Self {
        self.min_confirmations = confirmations;
        self
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<()> {
        if self.rpc_url.is_empty() {
            return Err(WalletError::Config("RPC URL cannot be empty".to_string()));
        }
        if self.fee_rate <= 0.0 {
            return Err(WalletError::Config("Fee rate must be positive".to_string()));
        }
        Ok(())
    }
}

impl Default for WalletConfig {
    fn default() -> Self {
        Self::regtest("http://127.0.0.1:18443", "bitcoin", "bitcoin")
    }
}

