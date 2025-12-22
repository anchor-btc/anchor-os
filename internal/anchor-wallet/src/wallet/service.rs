//! WalletService core implementation

use anyhow::{Context, Result};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tracing::{info, warn};

use crate::config::Config;
use super::types::{Balance, Utxo};

/// The wallet service wrapping Bitcoin Core RPC
pub struct WalletService {
    pub(crate) rpc: Client,
    pub(crate) base_rpc: Client,
    pub(crate) wallet_name: String,
    pub(crate) wallet_loaded: AtomicBool,
    /// Mutex to serialize two-stage transaction creation (commit/reveal)
    /// This prevents race conditions where multiple transactions try to use the same UTXOs
    pub(crate) tx_creation_mutex: Mutex<()>,
}

impl WalletService {
    /// Create a new wallet service
    pub fn new(config: &Config) -> Result<Self> {
        let base_rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )
        .context("Failed to connect to Bitcoin RPC")?;

        // Verify connection
        let blockchain_info = base_rpc.get_blockchain_info()?;
        info!(
            "Connected to Bitcoin node: chain={}, blocks={}",
            blockchain_info.chain, blockchain_info.blocks
        );

        // Try to load or create wallet
        let wallet_name = config.wallet_name.clone();
        
        // First, check if wallet is already loaded by trying to get wallet info
        let wallet_url = format!("{}/wallet/{}", config.bitcoin_rpc_url, wallet_name);
        let test_rpc = Client::new(
            &wallet_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;
        
        match test_rpc.get_wallet_info() {
            Ok(_) => {
                info!("Wallet already loaded: {}", wallet_name);
            }
            Err(_) => {
                // Wallet not loaded, try to load it
                match base_rpc.load_wallet(&wallet_name) {
                    Ok(_) => {
                        info!("Loaded existing wallet: {}", wallet_name);
                    }
                    Err(e) => {
                        let error_str = e.to_string();
                        // Check if wallet already exists but just needs to be loaded differently
                        if error_str.contains("already exists") || error_str.contains("already loaded") {
                            info!("Wallet already exists, trying alternative load: {}", wallet_name);
                            // Try unloading and reloading
                            let _ = base_rpc.unload_wallet(Some(&wallet_name));
                            match base_rpc.load_wallet(&wallet_name) {
                                Ok(_) => info!("Reloaded wallet: {}", wallet_name),
                                Err(e2) => {
                                    warn!("Could not reload wallet, continuing anyway: {}", e2);
                                }
                            }
                        } else {
                            // Wallet doesn't exist, create it
                            info!("Creating new wallet: {}", wallet_name);
                            base_rpc.create_wallet(&wallet_name, None, None, None, None)?;
                        }
                    }
                }
            }
        }

        // Create wallet-specific RPC client
        let wallet_url = format!("{}/wallet/{}", config.bitcoin_rpc_url, wallet_name);
        let wallet_rpc = Client::new(
            &wallet_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;

        Ok(Self {
            rpc: wallet_rpc,
            base_rpc,
            wallet_name,
            wallet_loaded: AtomicBool::new(true),
            tx_creation_mutex: Mutex::new(()),
        })
    }

    /// Ensure the wallet is loaded, attempting to reload if necessary
    /// Returns true if wallet is available, false otherwise
    pub(crate) fn ensure_wallet_loaded(&self) -> bool {
        // Quick check - if we think wallet is loaded, verify it
        if self.wallet_loaded.load(Ordering::Relaxed) {
            // Try a simple RPC call to verify
            if self.rpc.get_wallet_info().is_ok() {
                return true;
            }
            // Wallet is not responding, mark as not loaded
            self.wallet_loaded.store(false, Ordering::Relaxed);
            warn!("Wallet {} became unresponsive, attempting recovery...", self.wallet_name);
        }

        // Attempt to reload the wallet
        info!("Attempting to reload wallet: {}", self.wallet_name);
        
        // First try to load it directly
        match self.base_rpc.load_wallet(&self.wallet_name) {
            Ok(_) => {
                info!("Successfully reloaded wallet: {}", self.wallet_name);
                self.wallet_loaded.store(true, Ordering::Relaxed);
                return true;
            }
            Err(e) => {
                let error_str = e.to_string();
                if error_str.contains("already loaded") {
                    // Wallet is already loaded, our check just failed temporarily
                    info!("Wallet was already loaded: {}", self.wallet_name);
                    self.wallet_loaded.store(true, Ordering::Relaxed);
                    return true;
                } else if error_str.contains("not found") || error_str.contains("does not exist") {
                    // Wallet doesn't exist, try to create it
                    warn!("Wallet not found, creating new wallet: {}", self.wallet_name);
                    match self.base_rpc.create_wallet(&self.wallet_name, None, None, None, None) {
                        Ok(_) => {
                            info!("Created new wallet: {}", self.wallet_name);
                            self.wallet_loaded.store(true, Ordering::Relaxed);
                            return true;
                        }
                        Err(e2) => {
                            warn!("Failed to create wallet: {}", e2);
                        }
                    }
                } else {
                    warn!("Failed to load wallet: {}", e);
                }
            }
        }

        // Last resort: try unload + reload
        info!("Attempting unload/reload cycle for wallet: {}", self.wallet_name);
        let _ = self.base_rpc.unload_wallet(Some(&self.wallet_name));
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        match self.base_rpc.load_wallet(&self.wallet_name) {
            Ok(_) => {
                info!("Successfully reloaded wallet after unload: {}", self.wallet_name);
                self.wallet_loaded.store(true, Ordering::Relaxed);
                true
            }
            Err(e) => {
                warn!("All wallet recovery attempts failed: {}", e);
                false
            }
        }
    }

    /// Wrapper to ensure wallet is loaded before RPC operations
    pub(crate) fn with_wallet_check<T, F>(&self, operation: F) -> Result<T>
    where
        F: Fn() -> Result<T>,
    {
        // Ensure wallet is loaded
        if !self.ensure_wallet_loaded() {
            anyhow::bail!("Wallet is not available and could not be recovered");
        }
        
        // Try the operation
        match operation() {
            Ok(result) => Ok(result),
            Err(e) => {
                let error_str = e.to_string();
                // Check if the error is wallet-related
                if error_str.contains("wallet does not exist") || 
                   error_str.contains("not loaded") ||
                   error_str.contains("code: -18") {
                    // Mark wallet as not loaded for next attempt
                    self.wallet_loaded.store(false, Ordering::Relaxed);
                    
                    // Try one more time after recovery
                    if self.ensure_wallet_loaded() {
                        return operation();
                    }
                }
                Err(e)
            }
        }
    }

    /// Get wallet balance
    pub fn get_balance(&self) -> Result<Balance> {
        self.with_wallet_check(|| {
            let balances = self.rpc.get_balances()?;
            
            let confirmed = balances.mine.trusted.to_btc();
            let unconfirmed = balances.mine.untrusted_pending.to_btc();
            
            Ok(Balance {
                confirmed,
                unconfirmed,
                total: confirmed + unconfirmed,
            })
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self) -> Result<String> {
        self.with_wallet_check(|| {
            let address = self.rpc.get_new_address(None, None)?;
            Ok(address.assume_checked().to_string())
        })
    }

    /// List all addresses that have ever received funds (including those with 0 balance)
    /// Also includes addresses from current UTXOs to capture all address types
    pub fn list_received_addresses(&self) -> Result<Vec<String>> {
        self.with_wallet_check(|| {
            use std::collections::HashSet;
            let mut all_addresses: HashSet<String> = HashSet::new();
            
            // 1. Get addresses from list_received_by_address
            // address_filter: None (all addresses)
            // minconf: Some(0) (include unconfirmed)
            // include_empty: Some(true) (include addresses with 0 balance)
            // include_watchonly: None
            let received = self.rpc.list_received_by_address(None, Some(0), Some(true), None)?;
            for r in received {
                all_addresses.insert(r.address.assume_checked().to_string());
            }
            
            // 2. Get addresses from current UTXOs (captures taproot and other address types)
            if let Ok(utxos) = self.rpc.list_unspent(None, None, None, None, None) {
                for u in utxos {
                    if let Some(addr) = u.address {
                        all_addresses.insert(addr.assume_checked().to_string());
                    }
                }
            }
            
            // 3. Get addresses from list_transactions (past transactions)
            // This captures addresses used in spent outputs
            if let Ok(txs) = self.rpc.list_transactions(None, Some(1000), None, Some(true)) {
                for tx in txs {
                    if let Some(addr) = tx.detail.address {
                        all_addresses.insert(addr.assume_checked().to_string());
                    }
                }
            }
            
            Ok(all_addresses.into_iter().collect())
        })
    }

    /// List unspent outputs
    pub fn list_utxos(&self) -> Result<Vec<Utxo>> {
        self.with_wallet_check(|| {
            let utxos = self.rpc.list_unspent(None, None, None, None, None)?;
            
            Ok(utxos
                .into_iter()
                .map(|u| Utxo {
                    txid: u.txid.to_string(),
                    vout: u.vout,
                    amount: u.amount.to_btc(),
                    confirmations: u.confirmations,
                    address: u.address.map(|a| a.assume_checked().to_string()),
                })
                .collect())
        })
    }

    /// List unspent outputs, excluding locked UTXOs
    pub fn list_utxos_unlocked(&self, locked_set: &HashSet<(String, u32)>) -> Result<Vec<Utxo>> {
        let all_utxos = self.list_utxos()?;
        Ok(all_utxos
            .into_iter()
            .filter(|u| !locked_set.contains(&(u.txid.clone(), u.vout)))
            .collect())
    }

    /// Internal: List unspent from RPC, filtering out locked UTXOs
    /// Returns RPC ListUnspent entries for transaction building
    pub(crate) fn list_unspent_unlocked(
        &self,
        min_conf: Option<usize>,
        locked_set: Option<&HashSet<(String, u32)>>,
    ) -> Result<Vec<bitcoincore_rpc::json::ListUnspentResultEntry>> {
        let utxos = self.rpc.list_unspent(min_conf, None, None, None, None)?;
        
        if let Some(locked) = locked_set {
            Ok(utxos
                .into_iter()
                .filter(|u| !locked.contains(&(u.txid.to_string(), u.vout)))
                .collect())
        } else {
            Ok(utxos)
        }
    }

    /// Mine blocks (regtest only)
    pub fn mine_blocks(&self, count: u32) -> Result<Vec<String>> {
        self.with_wallet_check(|| {
            let address = self.rpc.get_new_address(None, None)?;
            let hashes = self.rpc.generate_to_address(count as u64, &address.assume_checked())?;
            Ok(hashes.into_iter().map(|h| h.to_string()).collect())
        })
    }

    /// Broadcast a raw transaction
    pub fn broadcast(&self, tx_hex: &str) -> Result<String> {
        self.with_wallet_check(|| {
            let txid: String = self.rpc.call(
                "sendrawtransaction",
                &[serde_json::json!(tx_hex)],
            )?;
            Ok(txid)
        })
    }

    /// Get raw transaction by txid
    pub fn get_raw_transaction(&self, txid: &str) -> Result<(String, serde_json::Value, Option<u64>)> {
        self.with_wallet_check(|| {
            // Get raw hex
            let hex: String = self.rpc.call(
                "getrawtransaction",
                &[serde_json::json!(txid)],
            )?;

            // Get decoded transaction
            let decoded: serde_json::Value = self.rpc.call(
                "getrawtransaction",
                &[serde_json::json!(txid), serde_json::json!(true)],
            )?;

            // Calculate fee by summing input values and subtracting output values
            let fee = self.calculate_tx_fee(&decoded);

            Ok((hex, decoded, fee))
        })
    }

    /// Calculate transaction fee by fetching input values
    pub(crate) fn calculate_tx_fee(&self, decoded: &serde_json::Value) -> Option<u64> {
        let vin = decoded.get("vin")?.as_array()?;
        let vout = decoded.get("vout")?.as_array()?;

        // Sum output values (in BTC, convert to sats)
        let output_total: f64 = vout
            .iter()
            .filter_map(|out| out.get("value")?.as_f64())
            .sum();

        // Sum input values by fetching each input's previous output
        let mut input_total: f64 = 0.0;
        for input in vin {
            // Skip coinbase inputs
            if input.get("coinbase").is_some() {
                return None; // Coinbase txs have no fee
            }

            let prev_txid = input.get("txid")?.as_str()?;
            let prev_vout = input.get("vout")?.as_u64()? as usize;

            // Fetch previous transaction
            if let Ok(prev_decoded) = self.rpc.call::<serde_json::Value>(
                "getrawtransaction",
                &[serde_json::json!(prev_txid), serde_json::json!(true)],
            ) {
                if let Some(prev_outputs) = prev_decoded.get("vout").and_then(|v| v.as_array()) {
                    if let Some(prev_out) = prev_outputs.get(prev_vout) {
                        if let Some(value) = prev_out.get("value").and_then(|v| v.as_f64()) {
                            input_total += value;
                        }
                    }
                }
            }
        }

        // Fee in satoshis
        let fee_btc = input_total - output_total;
        if fee_btc >= 0.0 {
            Some((fee_btc * 100_000_000.0).round() as u64)
        } else {
            None
        }
    }
}

