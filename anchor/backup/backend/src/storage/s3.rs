//! S3-compatible storage

use anyhow::Result;

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
