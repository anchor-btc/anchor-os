//! UTXO Lock Manager for Anchor Wallet
//!
//! This module manages locked UTXOs that should not be spent automatically.
//! UTXOs can be locked for various reasons:
//! - Domain ownership (DNS domains)
//! - Token ownership
//! - Manual locks by user
//!
//! Locked UTXOs are persisted to a JSON file and loaded on startup.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tracing::{debug, info, warn};

/// Reason why a UTXO is locked
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum LockReason {
    /// Manually locked by user
    Manual,
    /// Locked because it represents domain ownership
    Domain { name: String },
    /// Locked because it holds tokens
    Token { ticker: String, amount: String },
    /// Locked for a generic asset
    Asset {
        asset_type: String,
        asset_id: String,
    },
}

impl LockReason {
    /// Get a human-readable description of the lock reason
    pub fn description(&self) -> String {
        match self {
            LockReason::Manual => "Manually locked".to_string(),
            LockReason::Domain { name } => format!("Domain: {}", name),
            LockReason::Token { ticker, amount } => format!("Token: {} {}", amount, ticker),
            LockReason::Asset {
                asset_type,
                asset_id,
            } => {
                format!("Asset: {} ({})", asset_id, asset_type)
            }
        }
    }

    /// Check if this is a domain lock
    pub fn is_domain(&self) -> bool {
        matches!(self, LockReason::Domain { .. })
    }

    /// Check if this is a token lock
    pub fn is_token(&self) -> bool {
        matches!(self, LockReason::Token { .. })
    }
}

/// A locked UTXO entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockedUtxo {
    /// Transaction ID
    pub txid: String,
    /// Output index
    pub vout: u32,
    /// Reason for locking
    pub reason: LockReason,
    /// When the lock was created
    pub locked_at: DateTime<Utc>,
}

impl LockedUtxo {
    /// Create a new locked UTXO entry
    pub fn new(txid: String, vout: u32, reason: LockReason) -> Self {
        Self {
            txid,
            vout,
            reason,
            locked_at: Utc::now(),
        }
    }

    /// Get the UTXO key (txid, vout) tuple
    pub fn key(&self) -> (String, u32) {
        (self.txid.clone(), self.vout)
    }
}

/// Persisted lock state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct LockState {
    /// All locked UTXOs
    locked_utxos: Vec<LockedUtxo>,
    /// Whether auto-lock is enabled
    auto_lock_enabled: bool,
    /// Last sync timestamp
    last_sync: Option<DateTime<Utc>>,
}

/// Manager for UTXO locks
///
/// This manager handles locking and unlocking UTXOs to prevent them from being
/// spent accidentally. Locks are persisted to disk and loaded on startup.
pub struct LockManager {
    /// Path to the lock state file
    state_path: PathBuf,
    /// In-memory lock state protected by RwLock
    state: Arc<RwLock<LockState>>,
}

impl LockManager {
    /// Create a new LockManager with the given data directory
    pub fn new(data_dir: PathBuf) -> Result<Self> {
        let state_path = data_dir.join("locked_utxos.json");

        // Ensure data directory exists
        if let Some(parent) = state_path.parent() {
            fs::create_dir_all(parent).context("Failed to create data directory")?;
        }

        // Load existing state or create default
        let state = if state_path.exists() {
            match fs::read_to_string(&state_path) {
                Ok(content) => match serde_json::from_str::<LockState>(&content) {
                    Ok(state) => {
                        info!("Loaded {} locked UTXOs from disk", state.locked_utxos.len());
                        state
                    }
                    Err(e) => {
                        warn!("Failed to parse lock state, starting fresh: {}", e);
                        LockState::default()
                    }
                },
                Err(e) => {
                    warn!("Failed to read lock state file, starting fresh: {}", e);
                    LockState::default()
                }
            }
        } else {
            debug!("No existing lock state file, starting fresh");
            LockState::default()
        };

        let manager = Self {
            state_path,
            state: Arc::new(RwLock::new(state)),
        };

        // Save initial state to ensure file exists
        manager.save()?;

        Ok(manager)
    }

    /// Save the current state to disk
    fn save(&self) -> Result<()> {
        let state = self
            .state
            .read()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;
        let content = serde_json::to_string_pretty(&*state)?;
        fs::write(&self.state_path, content).context("Failed to write lock state")?;
        debug!("Saved lock state with {} UTXOs", state.locked_utxos.len());
        Ok(())
    }

    /// Lock a UTXO with the given reason
    ///
    /// Returns Ok(true) if the UTXO was newly locked, Ok(false) if already locked
    pub fn lock(&self, txid: String, vout: u32, reason: LockReason) -> Result<bool> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        // Check if already locked
        if state
            .locked_utxos
            .iter()
            .any(|u| u.txid == txid && u.vout == vout)
        {
            debug!("UTXO {}:{} is already locked", txid, vout);
            return Ok(false);
        }

        // Add new lock
        let locked_utxo = LockedUtxo::new(txid.clone(), vout, reason.clone());
        state.locked_utxos.push(locked_utxo);

        drop(state);
        self.save()?;

        info!("Locked UTXO {}:{} - {}", txid, vout, reason.description());
        Ok(true)
    }

    /// Unlock a specific UTXO
    ///
    /// Returns Ok(true) if the UTXO was unlocked, Ok(false) if it wasn't locked
    pub fn unlock(&self, txid: &str, vout: u32) -> Result<bool> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let initial_len = state.locked_utxos.len();
        state
            .locked_utxos
            .retain(|u| !(u.txid == txid && u.vout == vout));
        let removed = state.locked_utxos.len() < initial_len;

        if removed {
            drop(state);
            self.save()?;
            info!("Unlocked UTXO {}:{}", txid, vout);
        }

        Ok(removed)
    }

    /// Unlock a UTXO only if it has a specific reason type
    ///
    /// This is useful for unlocking domain UTXOs only when doing a DNS update
    pub fn unlock_if_reason(
        &self,
        txid: &str,
        vout: u32,
        expected_reason: &LockReason,
    ) -> Result<bool> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let initial_len = state.locked_utxos.len();
        state.locked_utxos.retain(|u| {
            !(u.txid == txid
                && u.vout == vout
                && std::mem::discriminant(&u.reason) == std::mem::discriminant(expected_reason))
        });
        let removed = state.locked_utxos.len() < initial_len;

        if removed {
            drop(state);
            self.save()?;
            info!("Unlocked UTXO {}:{} (reason matched)", txid, vout);
        }

        Ok(removed)
    }

    /// Bulk lock multiple UTXOs at once
    ///
    /// Returns the number of newly locked UTXOs
    pub fn bulk_lock(&self, utxos: Vec<(String, u32, LockReason)>) -> Result<usize> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let mut newly_locked = 0;

        for (txid, vout, reason) in utxos {
            // Check if already locked
            if state
                .locked_utxos
                .iter()
                .any(|u| u.txid == txid && u.vout == vout)
            {
                continue;
            }

            // Add new lock
            let locked_utxo = LockedUtxo::new(txid.clone(), vout, reason.clone());
            state.locked_utxos.push(locked_utxo);
            newly_locked += 1;
            debug!(
                "Bulk locked UTXO {}:{} - {}",
                txid,
                vout,
                reason.description()
            );
        }

        if newly_locked > 0 {
            drop(state);
            self.save()?;
            info!("Bulk locked {} new UTXOs", newly_locked);
        }

        Ok(newly_locked)
    }

    /// Remove locks for UTXOs that no longer exist in the wallet
    ///
    /// Returns the number of stale locks removed
    pub fn prune_stale_locks(&self, current_utxos: &HashSet<(String, u32)>) -> Result<usize> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let initial_len = state.locked_utxos.len();
        state
            .locked_utxos
            .retain(|u| current_utxos.contains(&(u.txid.clone(), u.vout)));
        let removed = initial_len - state.locked_utxos.len();

        if removed > 0 {
            drop(state);
            self.save()?;
            info!("Pruned {} stale locks", removed);
        }

        Ok(removed)
    }

    /// Get a set of all locked (txid, vout) pairs for efficient lookup
    pub fn get_locked_set(&self) -> HashSet<(String, u32)> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.locked_utxos.iter().map(|u| u.key()).collect()
    }

    /// List all locked UTXOs
    pub fn list_locked(&self) -> Vec<LockedUtxo> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.locked_utxos.clone()
    }

    /// Check if a specific UTXO is locked
    pub fn is_locked(&self, txid: &str, vout: u32) -> bool {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .locked_utxos
            .iter()
            .any(|u| u.txid == txid && u.vout == vout)
    }

    /// Get the lock reason for a specific UTXO
    pub fn get_lock_reason(&self, txid: &str, vout: u32) -> Option<LockReason> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .locked_utxos
            .iter()
            .find(|u| u.txid == txid && u.vout == vout)
            .map(|u| u.reason.clone())
    }

    /// Check if auto-lock is enabled
    pub fn is_auto_lock_enabled(&self) -> bool {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.auto_lock_enabled
    }

    /// Set auto-lock enabled/disabled
    pub fn set_auto_lock(&self, enabled: bool) -> Result<()> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;
        state.auto_lock_enabled = enabled;
        drop(state);
        self.save()?;
        info!("Auto-lock set to: {}", enabled);
        Ok(())
    }

    /// Get the last sync timestamp
    pub fn get_last_sync(&self) -> Option<DateTime<Utc>> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.last_sync
    }

    /// Update the last sync timestamp
    pub fn update_last_sync(&self) -> Result<()> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;
        state.last_sync = Some(Utc::now());
        drop(state);
        self.save()?;
        Ok(())
    }

    /// Get all locked domain UTXOs
    pub fn get_domain_locks(&self) -> Vec<LockedUtxo> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .locked_utxos
            .iter()
            .filter(|u| u.reason.is_domain())
            .cloned()
            .collect()
    }

    /// Get all locked token UTXOs
    pub fn get_token_locks(&self) -> Vec<LockedUtxo> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .locked_utxos
            .iter()
            .filter(|u| u.reason.is_token())
            .cloned()
            .collect()
    }

    /// Find a domain lock by domain name
    pub fn find_domain_lock(&self, domain_name: &str) -> Option<LockedUtxo> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .locked_utxos
            .iter()
            .find(|u| matches!(&u.reason, LockReason::Domain { name } if name == domain_name))
            .cloned()
    }

    /// Transfer a domain lock to a new UTXO
    ///
    /// This is used when a domain is updated - the old UTXO is unlocked and the new one is locked
    pub fn transfer_domain_lock(
        &self,
        domain_name: &str,
        old_txid: &str,
        old_vout: u32,
        new_txid: String,
        new_vout: u32,
    ) -> Result<bool> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        // Find and remove the old lock
        let old_lock_idx = state.locked_utxos.iter().position(|u| {
            u.txid == old_txid
                && u.vout == old_vout
                && matches!(&u.reason, LockReason::Domain { name } if name == domain_name)
        });

        if old_lock_idx.is_none() {
            warn!(
                "No existing domain lock found for {} at {}:{}",
                domain_name, old_txid, old_vout
            );
            return Ok(false);
        }

        // Remove old lock
        state.locked_utxos.remove(old_lock_idx.unwrap());

        // Add new lock
        let new_lock = LockedUtxo::new(
            new_txid.clone(),
            new_vout,
            LockReason::Domain {
                name: domain_name.to_string(),
            },
        );
        state.locked_utxos.push(new_lock);

        drop(state);
        self.save()?;

        info!(
            "Transferred domain lock for {} from {}:{} to {}:{}",
            domain_name, old_txid, old_vout, new_txid, new_vout
        );

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_manager() -> (LockManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let manager = LockManager::new(temp_dir.path().to_path_buf()).unwrap();
        (manager, temp_dir)
    }

    #[test]
    fn test_lock_unlock() {
        let (manager, _temp) = create_test_manager();

        // Lock a UTXO
        assert!(manager
            .lock("abc123".to_string(), 0, LockReason::Manual)
            .unwrap());

        // Try to lock again - should return false
        assert!(!manager
            .lock("abc123".to_string(), 0, LockReason::Manual)
            .unwrap());

        // Check it's locked
        assert!(manager.is_locked("abc123", 0));

        // Unlock
        assert!(manager.unlock("abc123", 0).unwrap());

        // Check it's no longer locked
        assert!(!manager.is_locked("abc123", 0));
    }

    #[test]
    fn test_domain_lock() {
        let (manager, _temp) = create_test_manager();

        // Lock for domain
        let reason = LockReason::Domain {
            name: "test.btc".to_string(),
        };
        assert!(manager.lock("txid123".to_string(), 0, reason).unwrap());

        // Find domain lock
        let lock = manager.find_domain_lock("test.btc");
        assert!(lock.is_some());
        assert_eq!(lock.unwrap().txid, "txid123");
    }

    #[test]
    fn test_transfer_domain_lock() {
        let (manager, _temp) = create_test_manager();

        // Lock for domain
        let reason = LockReason::Domain {
            name: "test.btc".to_string(),
        };
        manager.lock("old_txid".to_string(), 0, reason).unwrap();

        // Transfer lock
        assert!(manager
            .transfer_domain_lock("test.btc", "old_txid", 0, "new_txid".to_string(), 1)
            .unwrap());

        // Old should be unlocked
        assert!(!manager.is_locked("old_txid", 0));

        // New should be locked
        assert!(manager.is_locked("new_txid", 1));

        // Domain lock should point to new UTXO
        let lock = manager.find_domain_lock("test.btc").unwrap();
        assert_eq!(lock.txid, "new_txid");
        assert_eq!(lock.vout, 1);
    }

    #[test]
    fn test_bulk_lock() {
        let (manager, _temp) = create_test_manager();

        let utxos = vec![
            ("tx1".to_string(), 0, LockReason::Manual),
            (
                "tx2".to_string(),
                1,
                LockReason::Domain {
                    name: "a.btc".to_string(),
                },
            ),
            (
                "tx3".to_string(),
                2,
                LockReason::Token {
                    ticker: "BTC".to_string(),
                    amount: "100".to_string(),
                },
            ),
        ];

        assert_eq!(manager.bulk_lock(utxos).unwrap(), 3);
        assert_eq!(manager.list_locked().len(), 3);
    }

    #[test]
    fn test_prune_stale_locks() {
        let (manager, _temp) = create_test_manager();

        // Lock some UTXOs
        manager
            .lock("tx1".to_string(), 0, LockReason::Manual)
            .unwrap();
        manager
            .lock("tx2".to_string(), 1, LockReason::Manual)
            .unwrap();
        manager
            .lock("tx3".to_string(), 2, LockReason::Manual)
            .unwrap();

        // Only tx2 exists now
        let current_utxos: HashSet<(String, u32)> = [("tx2".to_string(), 1)].into_iter().collect();

        // Prune stale locks
        assert_eq!(manager.prune_stale_locks(&current_utxos).unwrap(), 2);
        assert_eq!(manager.list_locked().len(), 1);
        assert!(manager.is_locked("tx2", 1));
    }

    #[test]
    fn test_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();

        // Create manager and lock something
        {
            let manager = LockManager::new(path.clone()).unwrap();
            manager
                .lock(
                    "persistent_tx".to_string(),
                    0,
                    LockReason::Domain {
                        name: "test.btc".to_string(),
                    },
                )
                .unwrap();
        }

        // Create new manager from same path - should load lock
        {
            let manager = LockManager::new(path).unwrap();
            assert!(manager.is_locked("persistent_tx", 0));
            let lock = manager.find_domain_lock("test.btc");
            assert!(lock.is_some());
        }
    }
}
