//! Docker volume backup utilities

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerVolume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub size_bytes: Option<i64>,
}

/// List all Docker volumes
#[allow(dead_code)]
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
            let driver = vol
                .get("Driver")
                .and_then(|v| v.as_str())
                .unwrap_or("local");

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
/// Uses the shared backup-data volume to store tar files
pub async fn prepare_volume_for_backup(volume_name: &str, temp_dir: &str) -> Result<String> {
    let safe_name = volume_name.replace("/", "_").replace(":", "_");
    let tar_file = format!("{}/{}.tar", temp_dir, safe_name);

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

    // Create the temp directory in the shared backup volume
    tokio::fs::create_dir_all(temp_dir).await?;

    // Create tar archive by mounting both the source volume AND the backup-data volume
    // The backup-data volume is shared between dashboard-backend and this alpine container
    let tar_output = Command::new("docker")
        .args([
            "run",
            "--rm",
            "-v",
            &format!("{}:/source:ro", volume_name),
            "-v",
            "anchor_backup-data:/backup",
            "alpine",
            "sh",
            "-c",
            &format!(
                "mkdir -p /backup/{} && tar -cf /backup/{}/{}.tar -C /source . 2>/dev/null",
                temp_dir.trim_start_matches("/backups/"),
                temp_dir.trim_start_matches("/backups/"),
                safe_name
            ),
        ])
        .output()
        .await?;

    if !tar_output.status.success() {
        let stderr = String::from_utf8_lossy(&tar_output.stderr);
        error!(
            "Failed to create tar for volume {}: {}",
            volume_name, stderr
        );
        return Err(anyhow::anyhow!("Failed to create tar archive: {}", stderr));
    }

    // Allow time for file to be written and sync
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check if file exists and get size
    match tokio::fs::metadata(&tar_file).await {
        Ok(metadata) => {
            let size = metadata.len();
            if size > 0 {
                info!(
                    "Prepared volume {} as tar archive ({} bytes)",
                    volume_name, size
                );
                Ok(tar_file)
            } else {
                error!("Tar file for volume {} is empty", volume_name);
                Err(anyhow::anyhow!("Tar archive is empty"))
            }
        }
        Err(e) => {
            error!("Tar file not found for volume {}: {}", volume_name, e);
            Err(anyhow::anyhow!("Tar file not found: {}", e))
        }
    }
}
