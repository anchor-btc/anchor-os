//! Core wallet implementation

use bitcoin::{Address, Network};
use bitcoincore_rpc::{Auth, Client, RpcApi};

use crate::config::WalletConfig;
use crate::error::Result;
use crate::types::{Balance, Utxo};

/// ANCHOR wallet for creating and broadcasting messages
pub struct AnchorWallet {
    pub(crate) config: WalletConfig,
    pub(crate) client: Client,
}

impl AnchorWallet {
    /// Create a new wallet connected to a Bitcoin Core node
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_wallet_lib::{AnchorWallet, WalletConfig};
    ///
    /// let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass");
    /// let wallet = AnchorWallet::new(config)?;
    /// ```
    pub fn new(config: WalletConfig) -> Result<Self> {
        config.validate()?;

        let auth = Auth::UserPass(config.rpc_user.clone(), config.rpc_password.clone());
        
        let client = if let Some(ref wallet_name) = config.wallet_name {
            let url = format!("{}/wallet/{}", config.rpc_url, wallet_name);
            Client::new(&url, auth)?
        } else {
            Client::new(&config.rpc_url, auth)?
        };

        Ok(Self { config, client })
    }

    /// Get the wallet configuration
    pub fn config(&self) -> &WalletConfig {
        &self.config
    }

    /// Get the network
    pub fn network(&self) -> Network {
        self.config.network
    }

    /// Get wallet balance
    pub fn get_balance(&self) -> Result<Balance> {
        let balances = self.client.get_balances()?;
        
        let confirmed = balances.mine.trusted.to_sat();
        let unconfirmed = balances.mine.untrusted_pending.to_sat();
        
        Ok(Balance {
            confirmed,
            unconfirmed,
            total: confirmed + unconfirmed,
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self) -> Result<Address<bitcoin::address::NetworkUnchecked>> {
        let address = self.client.get_new_address(None, None)?;
        Ok(address)
    }

    /// List unspent transaction outputs (UTXOs)
    pub fn list_utxos(&self) -> Result<Vec<Utxo>> {
        let unspent = self.client.list_unspent(
            Some(self.config.min_confirmations as usize),
            None,
            None,
            None,
            None,
        )?;

        let utxos = unspent
            .into_iter()
            .map(|u| Utxo {
                txid: u.txid,
                vout: u.vout,
                amount: u.amount.to_sat(),
                script_pubkey: u.script_pub_key,
                confirmations: u.confirmations,
            })
            .collect();

        Ok(utxos)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_validation() {
        let config = WalletConfig::new("", "user", "pass");
        assert!(config.validate().is_err());

        let config = WalletConfig::new("http://localhost:18443", "user", "pass");
        assert!(config.validate().is_ok());
    }
}

