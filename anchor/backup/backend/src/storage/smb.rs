//! SMB/CIFS storage (NAS)

use anyhow::Result;
use tokio::process::Command;
use tracing::{info, error};

use crate::config::Config;
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

/// Mount SMB share
pub async fn mount_share(config: &Config) -> Result<()> {
    if !config.smb_configured() {
        return Err(anyhow::anyhow!("SMB not configured"));
    }
    
    let mount_point = config.smb_mount_point.as_deref().unwrap_or("/mnt/nas");
    let host = config.smb_host.as_deref().unwrap_or("");
    let share = config.smb_share.as_deref().unwrap_or("");
    let user = config.smb_user.as_deref().unwrap_or("guest");
    let password = config.smb_password.as_deref().unwrap_or("");
    
    // Create mount point
    tokio::fs::create_dir_all(mount_point).await?;
    
    // Mount SMB share
    let output = Command::new("mount")
        .args([
            "-t", "cifs",
            &format!("//{}/{}", host, share),
            mount_point,
            "-o", &format!("username={},password={}", user, password)
        ])
        .output()
        .await?;
    
    if output.status.success() {
        info!("SMB share mounted at {}", mount_point);
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Failed to mount SMB share: {}", stderr);
        Err(anyhow::anyhow!("Failed to mount: {}", stderr))
    }
}

/// Check if SMB share is mounted
pub async fn is_mounted(config: &Config) -> bool {
    let mount_point = config.smb_mount_point.as_deref().unwrap_or("/mnt/nas");
    
    let output = Command::new("mountpoint")
        .arg("-q")
        .arg(mount_point)
        .output()
        .await;
    
    output.map(|o| o.status.success()).unwrap_or(false)
}
