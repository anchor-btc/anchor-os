//! S3-compatible storage

use anyhow::Result;
use tracing::{info, error};

use crate::config::Config;
use super::StorageInfo;

/// Get S3 storage info
pub async fn get_storage_info(config: &Config) -> Result<StorageInfo> {
    let configured = config.s3_configured();
    
    if !configured {
        return Ok(StorageInfo {
            name: "Amazon S3".to_string(),
            storage_type: super::StorageType::S3,
            configured: false,
            total_bytes: None,
            used_bytes: None,
            available_bytes: None,
        });
    }
    
    // S3 doesn't have traditional size limits, but we could query bucket size
    // For now, just return configured status
    Ok(StorageInfo {
        name: format!("S3: {}", config.s3_bucket.as_deref().unwrap_or("unknown")),
        storage_type: super::StorageType::S3,
        configured: true,
        total_bytes: None, // S3 is unlimited
        used_bytes: None,  // Would require listing all objects
        available_bytes: None,
    })
}

/// Check S3 connection
pub async fn check_connection(config: &Config) -> Result<bool> {
    if !config.s3_configured() {
        return Ok(false);
    }
    
    // Use restic to check repository
    let output = tokio::process::Command::new("restic")
        .arg("snapshots")
        .arg("--json")
        .env("RESTIC_PASSWORD", &config.restic_password)
        .env("RESTIC_REPOSITORY", format!(
            "s3:{}/{}",
            config.s3_endpoint.as_deref().unwrap_or("s3.amazonaws.com"),
            config.s3_bucket.as_deref().unwrap_or("")
        ))
        .env("AWS_ACCESS_KEY_ID", config.s3_access_key.as_deref().unwrap_or(""))
        .env("AWS_SECRET_ACCESS_KEY", config.s3_secret_key.as_deref().unwrap_or(""))
        .output()
        .await?;
    
    Ok(output.status.success())
}
