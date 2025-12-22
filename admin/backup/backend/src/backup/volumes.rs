//! Docker volume backup utilities

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tracing::{info, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerVolume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub size_bytes: Option<i64>,
}

/// List all Docker volumes
pub async fn list_volumes() -> Result<Vec<DockerVolume>> {
    let output = Command::new("docker")
        .args(["volume", "ls", "--format", "{{json .}}"])
        .output()
        .await?;
    
    if !output.status.success() {
        return Err(anyhow::anyhow!("Failed to list Docker volumes"));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut volumes = Vec::new();
    
    for line in stdout.lines() {
        if let Ok(vol) = serde_json::from_str::<serde_json::Value>(line) {
            let name = vol.get("Name").and_then(|v| v.as_str()).unwrap_or_default();
            let driver = vol.get("Driver").and_then(|v| v.as_str()).unwrap_or("local");
            
            volumes.push(DockerVolume {
                name: name.to_string(),
                driver: driver.to_string(),
                mountpoint: String::new(),
                size_bytes: None,
            });
        }
    }
    
    Ok(volumes)
}

/// Get list of Anchor-related volumes to backup
pub fn get_anchor_volumes() -> Vec<&'static str> {
    vec![
        "anchor_bitcoin-data",
        "anchor_postgres-data",
        "anchor_electrs-data",
        "anchor_mempool-db-data",
    ]
}

/// Create a tar archive of a Docker volume for backup
/// This approach works on both Linux and macOS with Docker Desktop
pub async fn prepare_volume_for_backup(volume_name: &str, temp_dir: &str) -> Result<String> {
    let safe_name = volume_name.replace("/", "_").replace(":", "_");
    let tar_file = format!("{}/{}.tar", temp_dir, safe_name);
    
    // Get host backup path for the bind mount
    let host_backup_path = std::env::var("HOST_BACKUP_PATH")
        .unwrap_or_else(|_| "/backups".to_string());
    
    info!("Backing up volume {} to tar archive", volume_name);
    
    // First, check if the volume exists
    let check_output = Command::new("docker")
        .args(["volume", "inspect", volume_name])
        .output()
        .await?;
    
    if !check_output.status.success() {
        info!("Volume {} does not exist, skipping", volume_name);
        return Err(anyhow::anyhow!("Volume does not exist"));
    }
    
    // Create the volumes directory on the host using docker
    // This ensures the directory exists in the shared filesystem
    let relative_vol_dir = temp_dir.replace("/backups/", "");
    let mkdir_output = Command::new("docker")
        .args([
            "run", "--rm",
            "-v", &format!("{}:/host_backup", host_backup_path),
            "alpine",
            "mkdir", "-p", &format!("/host_backup/{}", relative_vol_dir)
        ])
        .output()
        .await?;
    
    if !mkdir_output.status.success() {
        let stderr = String::from_utf8_lossy(&mkdir_output.stderr);
        error!("Failed to create directory: {}", stderr);
        return Err(anyhow::anyhow!("Failed to create directory"));
    }
    
    // Create tar archive by mounting both the volume and the backup directory
    let relative_tar = format!("{}/{}.tar", relative_vol_dir, safe_name);
    let tar_output = Command::new("docker")
        .args([
            "run", "--rm",
            "-v", &format!("{}:/source:ro", volume_name),
            "-v", &format!("{}:/backup", host_backup_path),
            "alpine",
            "sh", "-c", &format!(
                "tar -cf /backup/{} -C /source . 2>/dev/null || true",
                relative_tar
            )
        ])
        .output()
        .await?;
    
    // Allow time for file to be written
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    
    // Check size using docker
    let size_output = Command::new("docker")
        .args([
            "run", "--rm",
            "-v", &format!("{}:/backup:ro", host_backup_path),
            "alpine",
            "sh", "-c", &format!(
                "ls -la /backup/{} 2>/dev/null | awk '{{print $5}}' || echo 0",
                relative_tar
            )
        ])
        .output()
        .await?;
    
    let size_str = String::from_utf8_lossy(&size_output.stdout);
    let size: u64 = size_str.trim().parse().unwrap_or(0);
    
    if size > 0 {
        info!("Prepared volume {} as tar archive ({} bytes)", volume_name, size);
        // Also ensure the container can see the file
        tokio::fs::create_dir_all(temp_dir).await.ok();
        Ok(tar_file)
    } else {
        let stderr = String::from_utf8_lossy(&tar_output.stderr);
        error!("Failed to backup volume {} (size=0): {}", volume_name, stderr);
        Err(anyhow::anyhow!("Tar archive is empty"))
    }
}
