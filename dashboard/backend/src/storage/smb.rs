//! SMB/CIFS storage (NAS)

use anyhow::Result;
use tokio::process::Command;

use crate::backup_config::BackupConfig as Config;
use super::StorageInfo;

/// Get SMB storage info
pub async fn get_storage_info(config: &Config) -> Result<StorageInfo> {
    let configured = config.smb_configured();
    
    if !configured {
        return Ok(StorageInfo {
            name: "NAS / SMB".to_string(),
            storage_type: super::StorageType::Smb,
            configured: false,
            total_bytes: None,
            used_bytes: None,
            available_bytes: None,
        });
    }
    
    let mount_point = config.smb_mount_point.as_deref().unwrap_or("/mnt/nas");
    
    // Check if mounted and get size
    let output = Command::new("df")
        .args(["-B1", mount_point])
        .output()
        .await?;
    
    let mut total_bytes = None;
    let mut used_bytes = None;
    let mut available_bytes = None;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = stdout.lines().nth(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 {
                total_bytes = parts.get(1).and_then(|s| s.parse().ok());
                used_bytes = parts.get(2).and_then(|s| s.parse().ok());
                available_bytes = parts.get(3).and_then(|s| s.parse().ok());
            }
        }
    }
    
    Ok(StorageInfo {
        name: format!("NAS: {}", config.smb_host.as_deref().unwrap_or("unknown")),
        storage_type: super::StorageType::Smb,
        configured: true,
        total_bytes,
        used_bytes,
        available_bytes,
    })
}
