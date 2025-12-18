//! Local filesystem storage

use anyhow::Result;
use std::path::Path;
use tokio::process::Command;
use tracing::info;

use super::StorageInfo;

/// Get local storage info
pub async fn get_storage_info(backup_dir: &str) -> Result<StorageInfo> {
    let path = Path::new(backup_dir);
    
    // Ensure directory exists
    if !path.exists() {
        tokio::fs::create_dir_all(path).await?;
    }
    
    // Get disk usage using df
    let output = Command::new("df")
        .args(["-B1", backup_dir])
        .output()
        .await?;
    
    let mut total_bytes = None;
    let mut used_bytes = None;
    let mut available_bytes = None;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Parse df output (skip header line)
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
        name: "Local Storage".to_string(),
        storage_type: super::StorageType::Local,
        configured: true,
        total_bytes,
        used_bytes,
        available_bytes,
    })
}

/// Get size of backup directory
pub async fn get_backup_size(backup_dir: &str) -> Result<i64> {
    let output = Command::new("du")
        .args(["-sb", backup_dir])
        .output()
        .await?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let size_str = stdout.split_whitespace().next().unwrap_or("0");
        Ok(size_str.parse().unwrap_or(0))
    } else {
        Ok(0)
    }
}

/// Clean up old backup files
pub async fn cleanup_old_backups(backup_dir: &str, keep_days: u32) -> Result<()> {
    info!("Cleaning up backups older than {} days in {}", keep_days, backup_dir);
    
    let output = Command::new("find")
        .args([
            backup_dir,
            "-type", "f",
            "-mtime", &format!("+{}", keep_days),
            "-delete"
        ])
        .output()
        .await?;
    
    if output.status.success() {
        info!("Cleanup completed");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("Cleanup failed: {}", stderr))
    }
}
