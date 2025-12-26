//! Identity Manager for Anchor Wallet
//!
//! This module manages decentralized identities (Nostr, Pubky, etc.) that can be
//! linked to oracles and published to DNS via Selfie Records.
//!
//! Identities are persisted to a JSON file and loaded on startup.
//! Private keys are encrypted using the wallet's encryption key.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tracing::{debug, info, warn};
use uuid::Uuid;

/// Type of identity (cryptographic curve/protocol)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IdentityType {
    /// Nostr - secp256k1 Schnorr (npub format)
    Nostr,
    /// Pubky - Ed25519 (pk: format)
    Pubky,
}

impl std::fmt::Display for IdentityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IdentityType::Nostr => write!(f, "nostr"),
            IdentityType::Pubky => write!(f, "pubky"),
        }
    }
}

impl IdentityType {
    /// Get the DNS record prefix for Selfie Records
    pub fn dns_prefix(&self) -> &'static str {
        match self {
            IdentityType::Nostr => "_nostr",
            IdentityType::Pubky => "_pubky",
        }
    }

    /// Get a human-readable name
    pub fn display_name(&self) -> &'static str {
        match self {
            IdentityType::Nostr => "Nostr",
            IdentityType::Pubky => "Pubky",
        }
    }

    /// Get the key type byte for protocol encoding
    pub fn key_type_byte(&self) -> u8 {
        match self {
            IdentityType::Nostr => 0x00, // secp256k1
            IdentityType::Pubky => 0x01, // Ed25519
        }
    }
}

/// Nostr-specific metadata
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NostrMetadata {
    /// List of relay URLs
    pub relays: Vec<String>,
    /// NIP-05 identifier (e.g., "user@domain.com")
    pub nip05: Option<String>,
    /// Profile name
    pub name: Option<String>,
    /// About/bio
    pub about: Option<String>,
    /// Profile picture URL
    pub picture: Option<String>,
}

/// Pubky-specific metadata
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PubkyMetadata {
    /// Homeserver URL
    pub homeserver: Option<String>,
    /// Whether registered on homeserver
    pub registered: bool,
    /// Profile URL on homeserver
    pub profile_url: Option<String>,
}

/// Protocol-specific metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum IdentityMetadata {
    Nostr(NostrMetadata),
    Pubky(PubkyMetadata),
}

impl Default for IdentityMetadata {
    fn default() -> Self {
        IdentityMetadata::Nostr(NostrMetadata::default())
    }
}

/// DNS publication status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsPublishInfo {
    /// Domain where identity is published
    pub domain: String,
    /// Subdomain (optional, for user._type.subdomain.domain.com format)
    pub subdomain: Option<String>,
    /// When published
    pub published_at: DateTime<Utc>,
    /// Full DNS record name
    pub record_name: String,
}

/// A decentralized identity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Identity {
    /// Unique identifier
    pub id: String,
    /// Identity type (Nostr, Pubky, etc.)
    pub identity_type: IdentityType,
    /// User-friendly label
    pub label: String,
    /// Public key (32 bytes, hex encoded for JSON)
    pub public_key: String,
    /// Encrypted private key (hex encoded)
    pub private_key_encrypted: String,
    /// Whether this is the primary identity of this type
    pub is_primary: bool,
    /// Protocol-specific metadata
    pub metadata: IdentityMetadata,
    /// DNS publication status (if published)
    pub dns_published: Option<DnsPublishInfo>,
    /// When created
    pub created_at: DateTime<Utc>,
    /// When last updated
    pub updated_at: DateTime<Utc>,
}

impl Identity {
    /// Create a new identity
    pub fn new(
        identity_type: IdentityType,
        label: String,
        public_key: String,
        private_key_encrypted: String,
        metadata: IdentityMetadata,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            identity_type,
            label,
            public_key,
            private_key_encrypted,
            is_primary: false,
            metadata,
            dns_published: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Get formatted public key for display
    pub fn formatted_public_key(&self) -> String {
        match self.identity_type {
            IdentityType::Nostr => {
                // Convert to npub format (simplified - full implementation would use bech32)
                format!("npub1{}", &self.public_key[..16])
            }
            IdentityType::Pubky => {
                // Pubky pk: format
                format!("pk:{}", &self.public_key[..16])
            }
        }
    }

    /// Get the public key bytes
    pub fn public_key_bytes(&self) -> Result<[u8; 32]> {
        let bytes = hex::decode(&self.public_key).context("Invalid public key hex")?;
        if bytes.len() != 32 {
            anyhow::bail!("Public key must be 32 bytes");
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(arr)
    }
}

/// Persisted identity state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct IdentityState {
    /// All identities
    identities: Vec<Identity>,
    /// Schema version for migrations
    version: u32,
}

/// Default Nostr relays for quick setup
pub const NOSTR_DEFAULT_RELAYS: &[&str] = &[
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://nostr.wine",
];

/// Known Pubky homeservers
pub struct PubkyHomeserver {
    pub name: &'static str,
    pub url: &'static str,
    pub requires_invite: bool,
}

pub const PUBKY_HOMESERVERS: &[PubkyHomeserver] = &[PubkyHomeserver {
    name: "Synonym (Official)",
    url: "https://homeserver.pubky.app",
    requires_invite: true,
}];

/// Manager for decentralized identities
pub struct IdentityManager {
    /// Path to the identity state file
    state_path: PathBuf,
    /// In-memory state protected by RwLock
    state: Arc<RwLock<IdentityState>>,
}

impl IdentityManager {
    /// Create a new IdentityManager with the given data directory
    pub fn new(data_dir: PathBuf) -> Result<Self> {
        let state_path = data_dir.join("identities.json");

        // Ensure data directory exists
        if let Some(parent) = state_path.parent() {
            fs::create_dir_all(parent).context("Failed to create data directory")?;
        }

        // Load existing state or create default
        let state = if state_path.exists() {
            match fs::read_to_string(&state_path) {
                Ok(content) => match serde_json::from_str::<IdentityState>(&content) {
                    Ok(state) => {
                        info!("Loaded {} identities from disk", state.identities.len());
                        state
                    }
                    Err(e) => {
                        warn!("Failed to parse identity state, starting fresh: {}", e);
                        IdentityState {
                            version: 1,
                            ..Default::default()
                        }
                    }
                },
                Err(e) => {
                    warn!("Failed to read identity state file, starting fresh: {}", e);
                    IdentityState {
                        version: 1,
                        ..Default::default()
                    }
                }
            }
        } else {
            debug!("No existing identity state file, starting fresh");
            IdentityState {
                version: 1,
                ..Default::default()
            }
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
        fs::write(&self.state_path, content).context("Failed to write identity state")?;
        debug!(
            "Saved identity state with {} identities",
            state.identities.len()
        );
        Ok(())
    }

    /// Create a new identity
    pub fn create(&self, identity: Identity) -> Result<Identity> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        // Check for duplicate public key
        if state
            .identities
            .iter()
            .any(|i| i.public_key == identity.public_key)
        {
            anyhow::bail!("Identity with this public key already exists");
        }

        // If this is the first identity of this type, make it primary
        let mut identity = identity;
        if !state
            .identities
            .iter()
            .any(|i| i.identity_type == identity.identity_type)
        {
            identity.is_primary = true;
        }

        let result = identity.clone();
        state.identities.push(identity);

        drop(state);
        self.save()?;

        info!(
            "Created new {} identity: {}",
            result.identity_type.display_name(),
            result.label
        );
        Ok(result)
    }

    /// Get all identities
    pub fn list(&self) -> Vec<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.identities.clone()
    }

    /// Get identities by type
    pub fn list_by_type(&self, identity_type: IdentityType) -> Vec<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .identities
            .iter()
            .filter(|i| i.identity_type == identity_type)
            .cloned()
            .collect()
    }

    /// Get identity by ID
    pub fn get(&self, id: &str) -> Option<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state.identities.iter().find(|i| i.id == id).cloned()
    }

    /// Get identity by public key
    pub fn get_by_pubkey(&self, public_key: &str) -> Option<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .identities
            .iter()
            .find(|i| i.public_key == public_key)
            .cloned()
    }

    /// Get primary identity for a type
    pub fn get_primary(&self, identity_type: IdentityType) -> Option<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .identities
            .iter()
            .find(|i| i.identity_type == identity_type && i.is_primary)
            .cloned()
    }

    /// Update an identity
    pub fn update(
        &self,
        id: &str,
        label: Option<String>,
        metadata: Option<IdentityMetadata>,
    ) -> Result<Identity> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let identity = state
            .identities
            .iter_mut()
            .find(|i| i.id == id)
            .ok_or_else(|| anyhow::anyhow!("Identity not found"))?;

        if let Some(new_label) = label {
            identity.label = new_label;
        }
        if let Some(new_metadata) = metadata {
            identity.metadata = new_metadata;
        }
        identity.updated_at = Utc::now();

        let result = identity.clone();
        drop(state);
        self.save()?;

        info!("Updated identity: {}", result.label);
        Ok(result)
    }

    /// Set an identity as primary for its type
    pub fn set_primary(&self, id: &str) -> Result<Identity> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        // Find the identity and its type
        let identity_type = state
            .identities
            .iter()
            .find(|i| i.id == id)
            .map(|i| i.identity_type)
            .ok_or_else(|| anyhow::anyhow!("Identity not found"))?;

        // Unset all primaries of this type
        for identity in state.identities.iter_mut() {
            if identity.identity_type == identity_type {
                identity.is_primary = identity.id == id;
            }
        }

        let result = state
            .identities
            .iter()
            .find(|i| i.id == id)
            .cloned()
            .unwrap();

        drop(state);
        self.save()?;

        info!(
            "Set {} as primary {} identity",
            result.label,
            result.identity_type.display_name()
        );
        Ok(result)
    }

    /// Delete an identity
    pub fn delete(&self, id: &str) -> Result<bool> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let initial_len = state.identities.len();
        let deleted_identity = state.identities.iter().find(|i| i.id == id).cloned();
        state.identities.retain(|i| i.id != id);
        let removed = state.identities.len() < initial_len;

        if removed {
            // If we deleted a primary, make another one primary
            if let Some(deleted) = &deleted_identity {
                if deleted.is_primary {
                    if let Some(new_primary) = state
                        .identities
                        .iter_mut()
                        .find(|i| i.identity_type == deleted.identity_type)
                    {
                        new_primary.is_primary = true;
                    }
                }
            }

            drop(state);
            self.save()?;
            info!(
                "Deleted identity: {}",
                deleted_identity.map(|i| i.label).unwrap_or_default()
            );
        }

        Ok(removed)
    }

    /// Update DNS publication status
    pub fn set_dns_published(&self, id: &str, info: Option<DnsPublishInfo>) -> Result<Identity> {
        let mut state = self
            .state
            .write()
            .map_err(|e| anyhow::anyhow!("Lock poisoned: {}", e))?;

        let identity = state
            .identities
            .iter_mut()
            .find(|i| i.id == id)
            .ok_or_else(|| anyhow::anyhow!("Identity not found"))?;

        identity.dns_published = info.clone();
        identity.updated_at = Utc::now();

        let result = identity.clone();
        drop(state);
        self.save()?;

        if info.is_some() {
            info!("Published identity {} to DNS", result.label);
        } else {
            info!("Removed DNS publication for identity {}", result.label);
        }

        Ok(result)
    }

    /// Get identities published to a specific domain
    pub fn get_published_to_domain(&self, domain: &str) -> Vec<Identity> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        state
            .identities
            .iter()
            .filter(|i| {
                i.dns_published
                    .as_ref()
                    .map(|d| d.domain == domain)
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Count identities by type
    pub fn count_by_type(&self) -> Vec<(IdentityType, usize)> {
        let state = self.state.read().unwrap_or_else(|e| e.into_inner());
        let nostr_count = state
            .identities
            .iter()
            .filter(|i| i.identity_type == IdentityType::Nostr)
            .count();
        let pubky_count = state
            .identities
            .iter()
            .filter(|i| i.identity_type == IdentityType::Pubky)
            .count();
        vec![
            (IdentityType::Nostr, nostr_count),
            (IdentityType::Pubky, pubky_count),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_manager() -> (IdentityManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let manager = IdentityManager::new(temp_dir.path().to_path_buf()).unwrap();
        (manager, temp_dir)
    }

    #[test]
    fn test_create_identity() {
        let (manager, _temp) = create_test_manager();

        let identity = Identity::new(
            IdentityType::Nostr,
            "My Nostr Key".to_string(),
            "a".repeat(64),
            "encrypted".to_string(),
            IdentityMetadata::Nostr(NostrMetadata::default()),
        );

        let created = manager.create(identity).unwrap();
        assert_eq!(created.label, "My Nostr Key");
        assert!(created.is_primary); // First identity should be primary
    }

    #[test]
    fn test_list_identities() {
        let (manager, _temp) = create_test_manager();

        // Create two identities
        let id1 = Identity::new(
            IdentityType::Nostr,
            "Nostr 1".to_string(),
            "a".repeat(64),
            "enc1".to_string(),
            IdentityMetadata::Nostr(NostrMetadata::default()),
        );
        let id2 = Identity::new(
            IdentityType::Pubky,
            "Pubky 1".to_string(),
            "b".repeat(64),
            "enc2".to_string(),
            IdentityMetadata::Pubky(PubkyMetadata::default()),
        );

        manager.create(id1).unwrap();
        manager.create(id2).unwrap();

        let all = manager.list();
        assert_eq!(all.len(), 2);

        let nostr_only = manager.list_by_type(IdentityType::Nostr);
        assert_eq!(nostr_only.len(), 1);
        assert_eq!(nostr_only[0].label, "Nostr 1");
    }

    #[test]
    fn test_primary_identity() {
        let (manager, _temp) = create_test_manager();

        // Create two Nostr identities
        let id1 = Identity::new(
            IdentityType::Nostr,
            "Nostr 1".to_string(),
            "a".repeat(64),
            "enc1".to_string(),
            IdentityMetadata::Nostr(NostrMetadata::default()),
        );
        let id2 = Identity::new(
            IdentityType::Nostr,
            "Nostr 2".to_string(),
            "b".repeat(64),
            "enc2".to_string(),
            IdentityMetadata::Nostr(NostrMetadata::default()),
        );

        let created1 = manager.create(id1).unwrap();
        let created2 = manager.create(id2).unwrap();

        // First should be primary
        assert!(created1.is_primary);
        assert!(!created2.is_primary);

        // Set second as primary
        manager.set_primary(&created2.id).unwrap();

        let primary = manager.get_primary(IdentityType::Nostr).unwrap();
        assert_eq!(primary.id, created2.id);
    }

    #[test]
    fn test_delete_identity() {
        let (manager, _temp) = create_test_manager();

        let identity = Identity::new(
            IdentityType::Nostr,
            "To Delete".to_string(),
            "a".repeat(64),
            "enc".to_string(),
            IdentityMetadata::Nostr(NostrMetadata::default()),
        );

        let created = manager.create(identity).unwrap();
        assert!(manager.delete(&created.id).unwrap());
        assert!(manager.get(&created.id).is_none());
    }

    #[test]
    fn test_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();

        // Create manager and add identity
        let id = {
            let manager = IdentityManager::new(path.clone()).unwrap();
            let identity = Identity::new(
                IdentityType::Nostr,
                "Persistent".to_string(),
                "a".repeat(64),
                "enc".to_string(),
                IdentityMetadata::Nostr(NostrMetadata::default()),
            );
            manager.create(identity).unwrap().id
        };

        // Create new manager and verify identity exists
        {
            let manager = IdentityManager::new(path).unwrap();
            let loaded = manager.get(&id);
            assert!(loaded.is_some());
            assert_eq!(loaded.unwrap().label, "Persistent");
        }
    }
}
