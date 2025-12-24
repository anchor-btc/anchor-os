//! BDK-based Wallet Service
//!
//! This module provides a wallet service built on Bitcoin Dev Kit (BDK)
//! for full control over keys, descriptors, and mnemonics.
//!
//! Features:
//! - Mnemonic generation and storage
//! - Address derivation (BIP84 Native SegWit)
//! - Electrum-based UTXO tracking
//! - Encrypted mnemonic storage

use anyhow::{Context, Result};
use bdk_electrum::electrum_client::{self, ElectrumApi};
use bdk_electrum::BdkElectrumClient;
use bdk_wallet::{
    bitcoin::Network,
    keys::{
        bip39::{Language, Mnemonic},
        DerivableKey, ExtendedKey,
    },
    template::Bip84,
    KeychainKind, Wallet,
};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use tracing::{info, warn};

use super::types::{Balance, Utxo};

/// Encrypted mnemonic storage format
#[derive(serde::Serialize, serde::Deserialize)]
struct EncryptedMnemonicFile {
    /// Version of the file format
    version: u32,
    /// Salt for key derivation (base64)
    salt: String,
    /// Nonce for AES-GCM (base64)
    nonce: String,
    /// Encrypted mnemonic (base64)
    ciphertext: String,
    /// Network the wallet is for
    network: String,
    /// Creation timestamp
    created_at: String,
}

/// Wallet state persisted to JSON
#[derive(serde::Serialize, serde::Deserialize, Default)]
struct WalletState {
    /// Last revealed external address index
    last_external_index: u32,
    /// Last revealed internal address index
    last_internal_index: u32,
    /// Wallet changeset serialized
    changeset: Option<String>,
}

/// Wallet information for display
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WalletInfo {
    /// Master fingerprint
    pub fingerprint: String,
    /// Network (regtest, testnet, mainnet)
    pub network: String,
    /// External descriptor (for receiving)
    pub external_descriptor: String,
    /// Internal descriptor (for change)
    pub internal_descriptor: String,
    /// Derivation path used
    pub derivation_path: String,
    /// Address type
    pub address_type: String,
    /// Whether the wallet has a mnemonic (vs watch-only)
    pub has_mnemonic: bool,
    /// Number of addresses used
    pub addresses_used: u32,
}

/// BDK-based wallet service with full key management
pub struct BdkWalletService {
    /// The BDK wallet instance
    wallet: Arc<Mutex<Wallet>>,
    /// Electrum client for blockchain queries
    electrum_client: Arc<BdkElectrumClient<electrum_client::Client>>,
    /// Cached mnemonic (only available if we created the wallet)
    mnemonic: Option<Mnemonic>,
    /// Network
    network: Network,
    /// Data directory
    data_dir: PathBuf,
    /// Wallet password (used for encrypting mnemonic)
    #[allow(dead_code)]
    password: RwLock<Option<String>>,
    /// Current chain tip height
    chain_tip: Arc<Mutex<u32>>,
}

impl BdkWalletService {
    /// Create or load a BDK wallet
    ///
    /// If the wallet doesn't exist, generates a new mnemonic.
    /// If it exists, loads from the persistent store.
    pub fn new(
        data_dir: PathBuf,
        electrum_url: &str,
        network: Network,
        password: Option<String>,
    ) -> Result<Self> {
        info!("Initializing BDK wallet service...");

        // Ensure data directory exists
        fs::create_dir_all(&data_dir).context("Failed to create data directory")?;

        // Initialize Electrum client
        let electrum_client = Self::create_electrum_client(electrum_url)?;
        let chain_tip = electrum_client.block_headers_subscribe()?.height as u32;

        // Check if wallet exists
        let mnemonic_path = data_dir.join("mnemonic.enc");
        let state_path = data_dir.join("wallet_state.json");

        let (wallet, mnemonic) = if mnemonic_path.exists() {
            // Load existing wallet from mnemonic
            info!("Loading existing BDK wallet from {:?}", mnemonic_path);

            if password.is_none() {
                anyhow::bail!("Password required to load existing wallet");
            }

            let mnemonic = Self::load_encrypted_mnemonic(&mnemonic_path, password.as_ref().unwrap())?;
            let wallet = Self::create_wallet_from_mnemonic(&mnemonic, network)?;

            // Load state if available
            if state_path.exists() {
                if let Ok(content) = fs::read_to_string(&state_path) {
                    if let Ok(state) = serde_json::from_str::<WalletState>(&content) {
                        // Reveal addresses up to the stored indices
                        let mut w = wallet;
                        for _ in 0..state.last_external_index {
                            w.reveal_next_address(KeychainKind::External);
                        }
                        for _ in 0..state.last_internal_index {
                            w.reveal_next_address(KeychainKind::Internal);
                        }
                        info!("Restored wallet state: {} external, {} internal addresses",
                            state.last_external_index, state.last_internal_index);
                        (w, Some(mnemonic))
                    } else {
                        (wallet, Some(mnemonic))
                    }
                } else {
                    (wallet, Some(mnemonic))
                }
            } else {
                (wallet, Some(mnemonic))
            }
        } else {
            // Create new wallet with fresh mnemonic
            info!("Creating new BDK wallet");
            let mnemonic = Mnemonic::generate_in(Language::English, 24)
                .map_err(|e| anyhow::anyhow!("Failed to generate mnemonic: {:?}", e))?;

            // Save encrypted mnemonic if password provided
            if let Some(ref pwd) = password {
                Self::save_encrypted_mnemonic(&mnemonic_path, &mnemonic, pwd, network)?;
                info!("Saved encrypted mnemonic to {:?}", mnemonic_path);
            } else {
                warn!("No password provided - mnemonic will NOT be persisted!");
            }

            let wallet = Self::create_wallet_from_mnemonic(&mnemonic, network)?;
            (wallet, Some(mnemonic))
        };

        let bdk_electrum = BdkElectrumClient::new(electrum_client);

        let service = Self {
            wallet: Arc::new(Mutex::new(wallet)),
            electrum_client: Arc::new(bdk_electrum),
            mnemonic,
            network,
            data_dir,
            password: RwLock::new(password),
            chain_tip: Arc::new(Mutex::new(chain_tip)),
        };

        Ok(service)
    }

    /// Create Electrum client
    fn create_electrum_client(url: &str) -> Result<electrum_client::Client> {
        info!("Connecting to Electrum server: {}", url);
        let client = electrum_client::Client::new(url)
            .context("Failed to connect to Electrum server")?;

        // Test connection
        let header = client.block_headers_subscribe()?;
        info!("Connected to Electrum, chain tip height: {}", header.height);

        Ok(client)
    }

    /// Create a new wallet from mnemonic
    fn create_wallet_from_mnemonic(mnemonic: &Mnemonic, network: Network) -> Result<Wallet> {
        // Create extended key from mnemonic
        let xkey: ExtendedKey = mnemonic
            .clone()
            .into_extended_key()
            .map_err(|e| anyhow::anyhow!("Failed to create extended key: {:?}", e))?;

        let xprv = xkey
            .into_xprv(network)
            .ok_or_else(|| anyhow::anyhow!("Failed to get xprv from extended key"))?;

        // Create BIP84 descriptors (Native SegWit)
        let external_desc = Bip84(xprv.clone(), KeychainKind::External);
        let internal_desc = Bip84(xprv, KeychainKind::Internal);

        // Create wallet
        let wallet = Wallet::create(external_desc, internal_desc)
            .network(network)
            .create_wallet_no_persist()
            .context("Failed to create BDK wallet")?;

        info!("Created new BDK wallet");
        Ok(wallet)
    }

    /// Save wallet state to file
    fn save_state(&self) -> Result<()> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let state = WalletState {
            last_external_index: wallet.derivation_index(KeychainKind::External).unwrap_or(0),
            last_internal_index: wallet.derivation_index(KeychainKind::Internal).unwrap_or(0),
            changeset: None, // We'll serialize changeset if needed
        };

        let state_path = self.data_dir.join("wallet_state.json");
        let content = serde_json::to_string_pretty(&state)?;
        fs::write(&state_path, content)?;

        Ok(())
    }

    /// Save encrypted mnemonic to file
    fn save_encrypted_mnemonic(
        path: &PathBuf,
        mnemonic: &Mnemonic,
        password: &str,
        network: Network,
    ) -> Result<()> {
        use aes_gcm::{
            aead::{Aead, KeyInit},
            Aes256Gcm, Nonce,
        };
        use argon2::Argon2;
        use rand::RngCore;

        // Generate salt
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);

        // Derive key using Argon2
        let mut key = [0u8; 32];
        Argon2::default()
            .hash_password_into(password.as_bytes(), &salt, &mut key)
            .map_err(|e| anyhow::anyhow!("Failed to derive key: {:?}", e))?;

        // Generate nonce
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt mnemonic
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {:?}", e))?;

        let mnemonic_str = mnemonic.to_string();
        let ciphertext = cipher
            .encrypt(nonce, mnemonic_str.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to encrypt mnemonic: {:?}", e))?;

        // Create file content
        let file = EncryptedMnemonicFile {
            version: 1,
            salt: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &salt),
            nonce: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &nonce_bytes),
            ciphertext: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &ciphertext),
            network: format!("{:?}", network).to_lowercase(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let content = serde_json::to_string_pretty(&file)?;
        fs::write(path, content)?;

        Ok(())
    }

    /// Load encrypted mnemonic from file
    fn load_encrypted_mnemonic(path: &PathBuf, password: &str) -> Result<Mnemonic> {
        use aes_gcm::{
            aead::{Aead, KeyInit},
            Aes256Gcm, Nonce,
        };
        use argon2::Argon2;

        let content = fs::read_to_string(path)?;
        let file: EncryptedMnemonicFile = serde_json::from_str(&content)?;

        if file.version != 1 {
            anyhow::bail!("Unsupported mnemonic file version: {}", file.version);
        }

        // Decode base64 fields
        let salt = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &file.salt)?;
        let nonce_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &file.nonce)?;
        let ciphertext = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &file.ciphertext)?;

        // Derive key
        let mut key = [0u8; 32];
        Argon2::default()
            .hash_password_into(password.as_bytes(), &salt, &mut key)
            .map_err(|e| anyhow::anyhow!("Failed to derive key: {:?}", e))?;

        // Decrypt
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {:?}", e))?;

        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| anyhow::anyhow!("Failed to decrypt mnemonic (wrong password?)"))?;

        let mnemonic_str = String::from_utf8(plaintext)?;
        let mnemonic = Mnemonic::parse_in(Language::English, &mnemonic_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse mnemonic: {:?}", e))?;

        Ok(mnemonic)
    }

    /// Sync wallet with Electrum server
    pub fn sync(&self) -> Result<()> {
        info!("Syncing wallet with Electrum...");

        let mut wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        // Full scan
        let request = wallet.start_full_scan();
        let update = self.electrum_client.full_scan(request, 10, 10, false)?;

        // Update chain tip
        if let Some(tip) = update.chain_update.as_ref() {
            let mut chain_tip = self.chain_tip.lock()
                .map_err(|e| anyhow::anyhow!("Failed to lock chain_tip: {}", e))?;
            *chain_tip = tip.height();
        }

        wallet.apply_update(update)?;

        // Save state after sync
        drop(wallet);
        self.save_state()?;

        info!("Wallet sync complete");
        Ok(())
    }

    /// Get wallet balance
    pub fn get_balance(&self) -> Result<Balance> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let balance = wallet.balance();

        Ok(Balance {
            confirmed: balance.confirmed.to_sat() as f64 / 100_000_000.0,
            unconfirmed: (balance.untrusted_pending.to_sat() + balance.trusted_pending.to_sat()) as f64 / 100_000_000.0,
            total: balance.total().to_sat() as f64 / 100_000_000.0,
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self) -> Result<String> {
        let mut wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let address_info = wallet.reveal_next_address(KeychainKind::External);

        // Save state after revealing new address
        drop(wallet);
        self.save_state()?;

        Ok(address_info.address.to_string())
    }

    /// Peek at the next address without revealing it
    pub fn peek_address(&self, index: u32) -> Result<String> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let address_info = wallet.peek_address(KeychainKind::External, index);
        Ok(address_info.address.to_string())
    }

    /// List all UTXOs
    pub fn list_utxos(&self) -> Result<Vec<Utxo>> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let chain_tip = *self.chain_tip.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock chain_tip: {}", e))?;

        let utxos: Vec<Utxo> = wallet
            .list_unspent()
            .map(|utxo| {
                let confirmations = match utxo.chain_position {
                    bdk_wallet::chain::ChainPosition::Confirmed { anchor, .. } => {
                        // Calculate confirmations from chain tip
                        chain_tip.saturating_sub(anchor.block_id.height) + 1
                    }
                    bdk_wallet::chain::ChainPosition::Unconfirmed { .. } => 0,
                };

                Utxo {
                    txid: utxo.outpoint.txid.to_string(),
                    vout: utxo.outpoint.vout,
                    amount: utxo.txout.value.to_sat() as f64 / 100_000_000.0,
                    confirmations,
                    address: None,
                }
            })
            .collect();

        Ok(utxos)
    }

    /// List all addresses that have been used
    pub fn list_addresses(&self) -> Result<Vec<String>> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let mut addresses = Vec::new();

        // Get all revealed external addresses
        let last_external = wallet.derivation_index(KeychainKind::External).unwrap_or(0);
        for i in 0..=last_external {
            let addr_info = wallet.peek_address(KeychainKind::External, i);
            addresses.push(addr_info.address.to_string());
        }

        // Get all revealed internal (change) addresses
        let last_internal = wallet.derivation_index(KeychainKind::Internal).unwrap_or(0);
        for i in 0..=last_internal {
            let addr_info = wallet.peek_address(KeychainKind::Internal, i);
            addresses.push(addr_info.address.to_string());
        }

        Ok(addresses)
    }

    /// Get the mnemonic (seed phrase) if available
    ///
    /// Returns None if the wallet was loaded without the mnemonic.
    pub fn get_mnemonic(&self) -> Option<Vec<String>> {
        self.mnemonic.as_ref().map(|m| {
            m.words().map(|w| w.to_string()).collect()
        })
    }

    /// Get wallet info for display
    pub fn get_wallet_info(&self) -> Result<WalletInfo> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        // Get descriptors
        let external_desc = wallet
            .public_descriptor(KeychainKind::External)
            .to_string();
        let internal_desc = wallet
            .public_descriptor(KeychainKind::Internal)
            .to_string();

        // Extract fingerprint from descriptor
        let fingerprint = external_desc
            .split('[')
            .nth(1)
            .and_then(|s| s.split('/').next())
            .unwrap_or("unknown")
            .to_string();

        let addresses_used = wallet.derivation_index(KeychainKind::External).unwrap_or(0);

        Ok(WalletInfo {
            fingerprint,
            network: format!("{:?}", self.network).to_lowercase(),
            external_descriptor: external_desc,
            internal_descriptor: internal_desc,
            derivation_path: "m/84'/0'/0'".to_string(), // BIP84
            address_type: "Native SegWit (P2WPKH)".to_string(),
            has_mnemonic: self.mnemonic.is_some(),
            addresses_used,
        })
    }

    /// Get public descriptors for watch-only wallet
    pub fn get_descriptors(&self) -> Result<(String, String)> {
        let wallet = self.wallet.lock()
            .map_err(|e| anyhow::anyhow!("Failed to lock wallet: {}", e))?;

        let external = wallet.public_descriptor(KeychainKind::External).to_string();
        let internal = wallet.public_descriptor(KeychainKind::Internal).to_string();

        Ok((external, internal))
    }

    /// Check if mnemonic is available
    pub fn has_mnemonic(&self) -> bool {
        self.mnemonic.is_some()
    }

    /// Get network
    pub fn network(&self) -> Network {
        self.network
    }

    /// Update password for mnemonic encryption
    pub fn update_password(&self, new_password: &str) -> Result<()> {
        let mnemonic = self.mnemonic.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No mnemonic available to re-encrypt"))?;

        let mnemonic_path = self.data_dir.join("mnemonic.enc");
        Self::save_encrypted_mnemonic(&mnemonic_path, mnemonic, new_password, self.network)?;

        info!("Updated mnemonic encryption password");
        Ok(())
    }

    /// Get the chain tip height
    pub fn get_chain_tip(&self) -> u32 {
        *self.chain_tip.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Check if wallet file exists
    pub fn wallet_exists(data_dir: &PathBuf) -> bool {
        data_dir.join("mnemonic.enc").exists()
    }

    /// Restore wallet from mnemonic
    pub fn restore_from_mnemonic(
        data_dir: PathBuf,
        electrum_url: &str,
        network: Network,
        mnemonic_words: &str,
        password: &str,
    ) -> Result<Self> {
        info!("Restoring wallet from mnemonic...");

        // Parse mnemonic
        let mnemonic = Mnemonic::parse_in(Language::English, mnemonic_words)
            .map_err(|e| anyhow::anyhow!("Invalid mnemonic: {:?}", e))?;

        // Ensure data directory exists
        fs::create_dir_all(&data_dir).context("Failed to create data directory")?;

        // Save encrypted mnemonic
        let mnemonic_path = data_dir.join("mnemonic.enc");
        Self::save_encrypted_mnemonic(&mnemonic_path, &mnemonic, password, network)?;

        // Create the wallet
        Self::new(data_dir, electrum_url, network, Some(password.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_mnemonic_generation() {
        let mnemonic = Mnemonic::generate_in(Language::English, 24).unwrap();
        let words: Vec<_> = mnemonic.words().collect();
        assert_eq!(words.len(), 24);
    }

    #[test]
    fn test_encrypted_mnemonic_roundtrip() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("test_mnemonic.enc");

        let mnemonic = Mnemonic::generate_in(Language::English, 24).unwrap();
        let password = "test_password_123";

        // Save
        BdkWalletService::save_encrypted_mnemonic(
            &path,
            &mnemonic,
            password,
            Network::Regtest,
        ).unwrap();

        // Load
        let loaded = BdkWalletService::load_encrypted_mnemonic(&path, password).unwrap();
        assert_eq!(mnemonic.to_string(), loaded.to_string());

        // Wrong password should fail
        let result = BdkWalletService::load_encrypted_mnemonic(&path, "wrong_password");
        assert!(result.is_err());
    }
}
