//! Backup and recovery handlers
//!
//! Endpoints for wallet backup, mnemonic display, and recovery.

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::migration::{MigrationNotification, WalletMigrator};
use crate::AppState;

/// Mnemonic response (seed phrase)
#[derive(Serialize, ToSchema)]
pub struct MnemonicResponse {
    /// Whether the wallet has a mnemonic
    pub available: bool,
    /// The 24 words of the seed phrase (only if available)
    pub words: Option<Vec<String>>,
    /// Number of words
    pub word_count: Option<usize>,
    /// Warning message
    pub warning: String,
}

/// Wallet info response
#[derive(Serialize, ToSchema)]
pub struct WalletInfoResponse {
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
    /// Address type (e.g., "Native SegWit (P2WPKH)")
    pub address_type: String,
    /// Whether the wallet has a mnemonic (vs watch-only)
    pub has_mnemonic: bool,
    /// Number of addresses used
    pub addresses_used: u32,
    /// BDK wallet enabled
    pub bdk_enabled: bool,
}

/// Descriptors response
#[derive(Serialize, ToSchema)]
pub struct DescriptorsResponse {
    /// External descriptor (for receiving)
    pub external: String,
    /// Internal descriptor (for change)  
    pub internal: String,
    /// Checksum included
    pub has_checksum: bool,
}

/// Verify mnemonic request
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyMnemonicRequest {
    /// The mnemonic words to verify
    pub words: Vec<String>,
}

/// Verify mnemonic response
#[derive(Serialize, ToSchema)]
pub struct VerifyMnemonicResponse {
    /// Whether the mnemonic is valid
    pub valid: bool,
    /// Whether the mnemonic matches the wallet
    pub matches_wallet: bool,
    /// Error message if invalid
    pub error: Option<String>,
}

/// Restore wallet request
#[derive(Debug, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct RestoreWalletRequest {
    /// The 12 or 24 mnemonic words
    pub mnemonic: String,
    /// Password for encrypting the restored mnemonic
    pub password: String,
}

/// Restore wallet response
#[derive(Serialize, ToSchema)]
pub struct RestoreWalletResponse {
    /// Whether the restore was successful
    pub success: bool,
    /// Message
    pub message: String,
    /// First address of the restored wallet
    pub first_address: Option<String>,
}

/// Get wallet mnemonic (seed phrase)
///
/// WARNING: This endpoint exposes sensitive information. Only call when the user
/// explicitly requests to view their seed phrase.
#[utoipa::path(
    get,
    path = "/wallet/backup/mnemonic",
    tag = "Backup",
    responses(
        (status = 200, description = "Mnemonic response", body = MnemonicResponse),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn get_mnemonic(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Ok(Json(MnemonicResponse {
                available: false,
                words: None,
                word_count: None,
                warning: "BDK wallet is not enabled. Mnemonic not available.".to_string(),
            }));
        }
    };

    match bdk_wallet.get_mnemonic() {
        Some(words) => {
            info!("Mnemonic requested - {} words", words.len());
            Ok(Json(MnemonicResponse {
                available: true,
                word_count: Some(words.len()),
                words: Some(words),
                warning: "NEVER share your seed phrase with anyone! Store it securely offline."
                    .to_string(),
            }))
        }
        None => Ok(Json(MnemonicResponse {
            available: false,
            words: None,
            word_count: None,
            warning: "Mnemonic not available. Wallet may have been imported without seed phrase."
                .to_string(),
        })),
    }
}

/// Get wallet info (fingerprint, descriptors, network)
#[utoipa::path(
    get,
    path = "/wallet/backup/info",
    tag = "Backup",
    responses(
        (status = 200, description = "Wallet information", body = WalletInfoResponse),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn get_wallet_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Ok(Json(WalletInfoResponse {
                fingerprint: "unknown".to_string(),
                network: state.config.network.clone(),
                external_descriptor: "N/A - BDK not enabled".to_string(),
                internal_descriptor: "N/A - BDK not enabled".to_string(),
                derivation_path: "N/A".to_string(),
                address_type: "N/A".to_string(),
                has_mnemonic: false,
                addresses_used: 0,
                bdk_enabled: false,
            }));
        }
    };

    match bdk_wallet.get_wallet_info() {
        Ok(info) => Ok(Json(WalletInfoResponse {
            fingerprint: info.fingerprint,
            network: info.network,
            external_descriptor: info.external_descriptor,
            internal_descriptor: info.internal_descriptor,
            derivation_path: info.derivation_path,
            address_type: info.address_type,
            has_mnemonic: info.has_mnemonic,
            addresses_used: info.addresses_used,
            bdk_enabled: true,
        })),
        Err(e) => {
            error!("Failed to get wallet info: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get wallet descriptors (for watch-only import)
#[utoipa::path(
    get,
    path = "/wallet/backup/descriptors",
    tag = "Backup",
    responses(
        (status = 200, description = "Wallet descriptors", body = DescriptorsResponse),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn get_descriptors(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "BDK wallet not enabled".to_string(),
            ));
        }
    };

    match bdk_wallet.get_descriptors() {
        Ok((external, internal)) => Ok(Json(DescriptorsResponse {
            external,
            internal,
            has_checksum: true,
        })),
        Err(e) => {
            error!("Failed to get descriptors: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Verify a mnemonic phrase
#[utoipa::path(
    post,
    path = "/wallet/backup/verify",
    tag = "Backup",
    request_body = VerifyMnemonicRequest,
    responses(
        (status = 200, description = "Verification result", body = VerifyMnemonicResponse),
        (status = 400, description = "Invalid request")
    )
)]
pub async fn verify_mnemonic(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyMnemonicRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use bdk_wallet::keys::bip39::{Language, Mnemonic};

    // Try to parse the mnemonic
    let mnemonic_str = req.words.join(" ");
    let parsed = match Mnemonic::parse_in(Language::English, &mnemonic_str) {
        Ok(m) => m,
        Err(e) => {
            return Ok(Json(VerifyMnemonicResponse {
                valid: false,
                matches_wallet: false,
                error: Some(format!("Invalid mnemonic: {:?}", e)),
            }));
        }
    };

    // Check if it matches the wallet's mnemonic
    let matches_wallet = if let Some(ref bdk) = state.bdk_wallet {
        if let Some(wallet_words) = bdk.get_mnemonic() {
            let wallet_mnemonic = wallet_words.join(" ");
            wallet_mnemonic == parsed.to_string()
        } else {
            false
        }
    } else {
        false
    };

    Ok(Json(VerifyMnemonicResponse {
        valid: true,
        matches_wallet,
        error: None,
    }))
}

/// Sync BDK wallet with blockchain
#[utoipa::path(
    post,
    path = "/wallet/backup/sync",
    tag = "Backup",
    responses(
        (status = 200, description = "Sync successful"),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn sync_bdk_wallet(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "BDK wallet not enabled".to_string(),
            ));
        }
    };

    match bdk_wallet.sync() {
        Ok(()) => {
            info!("BDK wallet sync completed");
            Ok(Json(serde_json::json!({
                "success": true,
                "message": "Wallet synced successfully"
            })))
        }
        Err(e) => {
            error!("Failed to sync BDK wallet: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get BDK wallet balance
#[utoipa::path(
    get,
    path = "/wallet/bdk/balance",
    tag = "Backup",
    responses(
        (status = 200, description = "BDK wallet balance"),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn get_bdk_balance(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                "BDK wallet not enabled".to_string(),
            ));
        }
    };

    match bdk_wallet.get_balance() {
        Ok(balance) => Ok(Json(balance)),
        Err(e) => {
            error!("Failed to get BDK balance: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

// ============================================================================
// Encrypted Backup Export/Import
// ============================================================================

/// Encrypted backup file format
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct EncryptedBackup {
    /// Backup format version
    pub version: u32,
    /// Creation timestamp
    pub created_at: String,
    /// Network (regtest, testnet, mainnet)
    pub network: String,
    /// Encrypted mnemonic (base64)
    pub encrypted_mnemonic: String,
    /// Salt for key derivation (base64)
    pub salt: String,
    /// Nonce for AES-GCM (base64)
    pub nonce: String,
    /// External descriptor (public, not encrypted)
    pub external_descriptor: String,
    /// Internal descriptor (public, not encrypted)
    pub internal_descriptor: String,
    /// Locked UTXOs data
    pub locked_utxos: Vec<LockedUtxoBackup>,
    /// Checksum of the backup (SHA256 of content before encryption)
    pub checksum: String,
}

/// Locked UTXO backup data
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct LockedUtxoBackup {
    pub txid: String,
    pub vout: u32,
    pub reason: String,
    pub asset_type: Option<String>,
    pub asset_id: Option<String>,
}

/// Export backup request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ExportBackupRequest {
    /// Password to encrypt the backup
    pub password: String,
}

/// Export backup response
#[derive(Serialize, ToSchema)]
pub struct ExportBackupResponse {
    /// Whether the export was successful
    pub success: bool,
    /// The encrypted backup data (JSON string, base64 encoded for transport)
    pub backup: Option<EncryptedBackup>,
    /// Error message if failed
    pub error: Option<String>,
}

/// Import backup request
#[derive(Debug, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ImportBackupRequest {
    /// The encrypted backup data
    pub backup: EncryptedBackup,
    /// Password to decrypt the backup
    pub password: String,
}

/// Import backup response
#[derive(Serialize, ToSchema)]
pub struct ImportBackupResponse {
    /// Whether the import was successful
    pub success: bool,
    /// Message
    pub message: String,
    /// Number of locked UTXOs restored
    pub locked_utxos_restored: usize,
}

/// Verify backup request
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyBackupRequest {
    /// The encrypted backup data
    pub backup: EncryptedBackup,
    /// Password to decrypt and verify
    pub password: String,
}

/// Verify backup response
#[derive(Serialize, ToSchema)]
pub struct VerifyBackupResponse {
    /// Whether the backup is valid
    pub valid: bool,
    /// Whether the checksum matches
    pub checksum_valid: bool,
    /// Network of the backup
    pub network: String,
    /// Number of locked UTXOs in backup
    pub locked_utxos_count: usize,
    /// Error message if invalid
    pub error: Option<String>,
}

/// Export encrypted wallet backup
#[utoipa::path(
    post,
    path = "/wallet/backup/export",
    tag = "Backup",
    request_body = ExportBackupRequest,
    responses(
        (status = 200, description = "Encrypted backup", body = ExportBackupResponse),
        (status = 503, description = "BDK wallet not available")
    )
)]
pub async fn export_backup(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExportBackupRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use argon2::Argon2;
    use rand::RngCore;
    use sha2::{Digest, Sha256};

    let bdk_wallet = match &state.bdk_wallet {
        Some(w) => w,
        None => {
            return Ok(Json(ExportBackupResponse {
                success: false,
                backup: None,
                error: Some("BDK wallet not enabled".to_string()),
            }));
        }
    };

    // Get mnemonic
    let mnemonic_words = match bdk_wallet.get_mnemonic() {
        Some(words) => words.join(" "),
        None => {
            return Ok(Json(ExportBackupResponse {
                success: false,
                backup: None,
                error: Some("Mnemonic not available".to_string()),
            }));
        }
    };

    // Get wallet info
    let wallet_info = bdk_wallet
        .get_wallet_info()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get locked UTXOs
    let locked_utxos: Vec<LockedUtxoBackup> = state
        .lock_manager
        .list_locked()
        .into_iter()
        .map(|u| {
            let (reason, asset_type, asset_id) = match &u.reason {
                crate::locked::LockReason::Manual => ("manual".to_string(), None, None),
                crate::locked::LockReason::Domain { name } => (
                    "domain".to_string(),
                    Some("domain".to_string()),
                    Some(name.clone()),
                ),
                crate::locked::LockReason::Token { ticker, amount } => (
                    "token".to_string(),
                    Some("token".to_string()),
                    Some(format!("{} {}", amount, ticker)),
                ),
                crate::locked::LockReason::Asset {
                    asset_type,
                    asset_id,
                } => (
                    "asset".to_string(),
                    Some(asset_type.clone()),
                    Some(asset_id.clone()),
                ),
            };
            LockedUtxoBackup {
                txid: u.txid,
                vout: u.vout,
                reason,
                asset_type,
                asset_id,
            }
        })
        .collect();

    // Generate salt
    let mut salt = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut salt);

    // Derive key using Argon2
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(req.password.as_bytes(), &salt, &mut key)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Key derivation failed: {:?}", e),
            )
        })?;

    // Generate nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt mnemonic
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Cipher creation failed: {:?}", e),
        )
    })?;

    let ciphertext = cipher
        .encrypt(nonce, mnemonic_words.as_bytes())
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Encryption failed: {:?}", e),
            )
        })?;

    // Calculate checksum (hash of mnemonic + descriptors + locked UTXOs)
    let mut hasher = Sha256::new();
    hasher.update(mnemonic_words.as_bytes());
    hasher.update(wallet_info.external_descriptor.as_bytes());
    hasher.update(wallet_info.internal_descriptor.as_bytes());
    for utxo in &locked_utxos {
        hasher.update(utxo.txid.as_bytes());
        hasher.update(utxo.vout.to_le_bytes());
    }
    let checksum = hex::encode(hasher.finalize());

    let backup = EncryptedBackup {
        version: 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        network: wallet_info.network,
        encrypted_mnemonic: base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &ciphertext,
        ),
        salt: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, salt),
        nonce: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, nonce_bytes),
        external_descriptor: wallet_info.external_descriptor,
        internal_descriptor: wallet_info.internal_descriptor,
        locked_utxos,
        checksum,
    };

    info!("Exported encrypted wallet backup");

    Ok(Json(ExportBackupResponse {
        success: true,
        backup: Some(backup),
        error: None,
    }))
}

/// Verify encrypted wallet backup
#[utoipa::path(
    post,
    path = "/wallet/backup/verify-backup",
    tag = "Backup",
    request_body = VerifyBackupRequest,
    responses(
        (status = 200, description = "Verification result", body = VerifyBackupResponse)
    )
)]
pub async fn verify_backup(
    Json(req): Json<VerifyBackupRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use argon2::Argon2;
    use sha2::{Digest, Sha256};

    if req.backup.version != 1 {
        return Ok(Json(VerifyBackupResponse {
            valid: false,
            checksum_valid: false,
            network: req.backup.network,
            locked_utxos_count: 0,
            error: Some(format!(
                "Unsupported backup version: {}",
                req.backup.version
            )),
        }));
    }

    // Decode base64 fields
    let salt = match base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &req.backup.salt,
    ) {
        Ok(s) => s,
        Err(e) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some(format!("Invalid salt: {:?}", e)),
            }));
        }
    };

    let nonce_bytes = match base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &req.backup.nonce,
    ) {
        Ok(n) => n,
        Err(e) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some(format!("Invalid nonce: {:?}", e)),
            }));
        }
    };

    let ciphertext = match base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &req.backup.encrypted_mnemonic,
    ) {
        Ok(c) => c,
        Err(e) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some(format!("Invalid ciphertext: {:?}", e)),
            }));
        }
    };

    // Derive key
    let mut key = [0u8; 32];
    if Argon2::default()
        .hash_password_into(req.password.as_bytes(), &salt, &mut key)
        .is_err()
    {
        return Ok(Json(VerifyBackupResponse {
            valid: false,
            checksum_valid: false,
            network: req.backup.network,
            locked_utxos_count: 0,
            error: Some("Key derivation failed".to_string()),
        }));
    }

    // Decrypt
    let cipher = match Aes256Gcm::new_from_slice(&key) {
        Ok(c) => c,
        Err(_) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some("Cipher creation failed".to_string()),
            }));
        }
    };

    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = match cipher.decrypt(nonce, ciphertext.as_ref()) {
        Ok(p) => p,
        Err(_) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some("Decryption failed - wrong password?".to_string()),
            }));
        }
    };

    let mnemonic_str = match String::from_utf8(plaintext) {
        Ok(s) => s,
        Err(_) => {
            return Ok(Json(VerifyBackupResponse {
                valid: false,
                checksum_valid: false,
                network: req.backup.network,
                locked_utxos_count: 0,
                error: Some("Invalid decrypted content".to_string()),
            }));
        }
    };

    // Verify checksum
    let mut hasher = Sha256::new();
    hasher.update(mnemonic_str.as_bytes());
    hasher.update(req.backup.external_descriptor.as_bytes());
    hasher.update(req.backup.internal_descriptor.as_bytes());
    for utxo in &req.backup.locked_utxos {
        hasher.update(utxo.txid.as_bytes());
        hasher.update(utxo.vout.to_le_bytes());
    }
    let calculated_checksum = hex::encode(hasher.finalize());
    let checksum_valid = calculated_checksum == req.backup.checksum;

    // Verify mnemonic is valid
    use bdk_wallet::keys::bip39::{Language, Mnemonic};
    let mnemonic_valid = Mnemonic::parse_in(Language::English, &mnemonic_str).is_ok();

    Ok(Json(VerifyBackupResponse {
        valid: mnemonic_valid && checksum_valid,
        checksum_valid,
        network: req.backup.network,
        locked_utxos_count: req.backup.locked_utxos.len(),
        error: if mnemonic_valid {
            None
        } else {
            Some("Invalid mnemonic in backup".to_string())
        },
    }))
}

/// Get migration status
#[utoipa::path(
    get,
    path = "/wallet/backup/migration-status",
    tag = "Backup",
    responses(
        (status = 200, description = "Migration status"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_migration_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let migrator = WalletMigrator::new(state.config.data_dir.clone());

    let status = migrator
        .load_status()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let notification = MigrationNotification::from_status(&status);

    Ok(Json(serde_json::json!({
        "status": status,
        "notification": notification
    })))
}
