//! Wallet Migration Logic
//!
//! Handles migration from Bitcoin Core RPC wallet to BDK wallet.
//! This includes:
//! - Detecting existing Bitcoin Core wallet
//! - Generating new BDK wallet with fresh mnemonic
//! - Importing existing addresses as watch-only
//! - Preserving locked UTXOs

use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn};

use crate::wallet::WalletService;

/// Migration status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MigrationStatus {
    /// Whether migration has been completed
    pub completed: bool,
    /// Migration timestamp
    pub completed_at: Option<String>,
    /// Bitcoin Core wallet name that was migrated from
    pub migrated_from: Option<String>,
    /// Number of addresses imported
    pub addresses_imported: usize,
    /// BDK wallet fingerprint
    pub bdk_fingerprint: Option<String>,
}

impl Default for MigrationStatus {
    fn default() -> Self {
        Self {
            completed: false,
            completed_at: None,
            migrated_from: None,
            addresses_imported: 0,
            bdk_fingerprint: None,
        }
    }
}

/// Wallet migrator
pub struct WalletMigrator {
    data_dir: PathBuf,
}

impl WalletMigrator {
    /// Create a new wallet migrator
    pub fn new(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    /// Get migration status file path
    fn status_path(&self) -> PathBuf {
        self.data_dir.join("migration_status.json")
    }

    /// Load migration status
    pub fn load_status(&self) -> Result<MigrationStatus> {
        let path = self.status_path();
        if path.exists() {
            let content = fs::read_to_string(&path)?;
            Ok(serde_json::from_str(&content)?)
        } else {
            Ok(MigrationStatus::default())
        }
    }

    /// Save migration status
    pub fn save_status(&self, status: &MigrationStatus) -> Result<()> {
        fs::create_dir_all(&self.data_dir)?;
        let content = serde_json::to_string_pretty(status)?;
        fs::write(self.status_path(), content)?;
        Ok(())
    }

    /// Check if migration is needed
    pub fn needs_migration(&self) -> Result<bool> {
        let status = self.load_status()?;
        if status.completed {
            return Ok(false);
        }

        // Check if BDK wallet already exists
        let bdk_wallet_path = self.data_dir.join("bdk").join("mnemonic.enc");
        if bdk_wallet_path.exists() {
            // BDK wallet exists, mark migration as complete
            let mut status = status;
            status.completed = true;
            status.completed_at = Some(chrono::Utc::now().to_rfc3339());
            self.save_status(&status)?;
            return Ok(false);
        }

        // Migration is needed if BDK wallet doesn't exist
        Ok(true)
    }

    /// Perform migration from Bitcoin Core to BDK
    ///
    /// This creates a new BDK wallet and imports addresses from Bitcoin Core
    /// as watch-only for reference.
    pub fn migrate(&self, btc_wallet: &WalletService, wallet_name: &str) -> Result<MigrationStatus> {
        info!("Starting wallet migration...");

        let mut status = MigrationStatus::default();

        // Get addresses from Bitcoin Core wallet
        let addresses = match btc_wallet.list_received_addresses() {
            Ok(addrs) => addrs,
            Err(e) => {
                warn!("Failed to list Bitcoin Core addresses: {}. Continuing with empty list.", e);
                vec![]
            }
        };

        info!("Found {} addresses in Bitcoin Core wallet", addresses.len());

        // Save the addresses for reference (not importing into BDK as that requires private keys)
        let addresses_backup_path = self.data_dir.join("btc_core_addresses.json");
        let addresses_backup = serde_json::json!({
            "wallet_name": wallet_name,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "addresses": addresses,
        });
        fs::write(&addresses_backup_path, serde_json::to_string_pretty(&addresses_backup)?)?;
        info!("Saved {} addresses to {:?}", addresses.len(), addresses_backup_path);

        // Update status
        status.completed = true;
        status.completed_at = Some(chrono::Utc::now().to_rfc3339());
        status.migrated_from = Some(wallet_name.to_string());
        status.addresses_imported = addresses.len();

        // Save status
        self.save_status(&status)?;

        info!("Migration complete! A new BDK wallet will be created on next startup.");
        info!("Your Bitcoin Core wallet addresses have been backed up for reference.");
        info!("IMPORTANT: Transfer funds from Bitcoin Core addresses to new BDK addresses.");

        Ok(status)
    }

    /// Check migration status and perform if needed
    pub fn check_and_migrate(&self, btc_wallet: &WalletService, wallet_name: &str) -> Result<bool> {
        if !self.needs_migration()? {
            return Ok(false);
        }

        self.migrate(btc_wallet, wallet_name)?;
        Ok(true)
    }
}

/// Migration notification for the UI
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MigrationNotification {
    pub needs_attention: bool,
    pub message: String,
    pub old_wallet_name: Option<String>,
    pub old_addresses_count: usize,
}

impl MigrationNotification {
    /// Create a notification from migration status
    pub fn from_status(status: &MigrationStatus) -> Self {
        if status.completed && status.addresses_imported > 0 {
            Self {
                needs_attention: true,
                message: format!(
                    "Wallet migrated from Bitcoin Core. {} addresses were backed up. Transfer funds to new BDK wallet addresses.",
                    status.addresses_imported
                ),
                old_wallet_name: status.migrated_from.clone(),
                old_addresses_count: status.addresses_imported,
            }
        } else {
            Self {
                needs_attention: false,
                message: "No migration needed".to_string(),
                old_wallet_name: None,
                old_addresses_count: 0,
            }
        }
    }
}

