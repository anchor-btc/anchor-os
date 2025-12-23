//! Full restore engine for databases and volumes

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tokio::process::Command;
use tracing::{info, error, warn};

use crate::backup::engine::{BackupEngine, BackupTarget};
use crate::backup::database::{DatabaseConfig, get_anchor_databases};
use crate::backup::volumes::get_anchor_volumes;
use crate::backup_config::BackupConfig;

/// Result of a full restore operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreResult {
    pub success: bool,
    pub databases_restored: Vec<String>,
    pub databases_failed: Vec<String>,
    pub volumes_restored: Vec<String>,
    pub volumes_failed: Vec<String>,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// Map database names to containers that depend on them
fn get_db_container_map() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map = HashMap::new();
    map.insert("anchor", vec!["core-indexer", "core-wallet", "anchor-dashboard-backend"]);
    map.insert("anchor_oracles", vec!["app-oracles-backend"]);
    map.insert("anchor_lottery", vec!["app-lottery-backend"]);
    map.insert("anchor_predictions", vec!["app-predictions-backend"]);
    map
}

/// Map volume names to containers that use them
fn get_volume_container_map() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map = HashMap::new();
    map.insert("anchor_bitcoin-data", vec!["core-bitcoin"]);
    map.insert("anchor_postgres-data", vec!["core-postgres"]);
    map.insert("anchor_electrs-data", vec!["core-electrs"]);
    map.insert("anchor_mempool-db-data", vec!["explorer-mempool-db"]);
    map
}

/// Stop Docker containers
async fn stop_containers(containers: &[&str]) -> Result<()> {
    if containers.is_empty() {
        return Ok(());
    }
    
    info!("Stopping containers: {:?}", containers);
    
    for container in containers {
        let output = Command::new("docker")
            .args(["stop", "-t", "30", container])
            .output()
            .await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Don't fail if container doesn't exist or is already stopped
            if !stderr.contains("No such container") && !stderr.contains("is not running") {
                warn!("Failed to stop container {}: {}", container, stderr);
            }
        }
    }
    
    Ok(())
}

/// Start Docker containers
async fn start_containers(containers: &[&str]) -> Result<()> {
    if containers.is_empty() {
        return Ok(());
    }
    
    info!("Starting containers: {:?}", containers);
    
    for container in containers {
        let output = Command::new("docker")
            .args(["start", container])
            .output()
            .await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if !stderr.contains("No such container") {
                warn!("Failed to start container {}: {}", container, stderr);
            }
        }
    }
    
    Ok(())
}

/// Extract a Restic snapshot to a temporary directory
async fn extract_snapshot(
    engine: &BackupEngine,
    target: &BackupTarget,
    snapshot_id: &str,
    restore_path: &str,
) -> Result<()> {
    info!("Extracting snapshot {} to {}", snapshot_id, restore_path);
    
    // Create restore directory
    tokio::fs::create_dir_all(restore_path).await?;
    
    // Use the engine's restore method
    engine.restore(target, snapshot_id, restore_path).await
}

/// Restore a PostgreSQL database from a gzipped SQL dump
async fn restore_database(dump_file: &str, config: &DatabaseConfig) -> Result<()> {
    info!("Restoring database {} from {}", config.database, dump_file);
    
    // Check if file exists
    if !Path::new(dump_file).exists() {
        return Err(anyhow::anyhow!("Dump file not found: {}", dump_file));
    }
    
    // For PostgreSQL databases
    if config.port == 5432 {
        // First, terminate existing connections to the database
        let terminate_cmd = format!(
            "PGPASSWORD='{}' psql -h {} -p {} -U {} postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{}' AND pid <> pg_backend_pid();\"",
            config.password, config.host, config.port, config.user, config.database
        );
        
        let _ = Command::new("sh")
            .arg("-c")
            .arg(&terminate_cmd)
            .output()
            .await;
        
        // Drop and recreate database
        let drop_cmd = format!(
            "PGPASSWORD='{}' psql -h {} -p {} -U {} postgres -c \"DROP DATABASE IF EXISTS {};\"",
            config.password, config.host, config.port, config.user, config.database
        );
        
        let _ = Command::new("sh")
            .arg("-c")
            .arg(&drop_cmd)
            .output()
            .await;
        
        let create_cmd = format!(
            "PGPASSWORD='{}' psql -h {} -p {} -U {} postgres -c \"CREATE DATABASE {};\"",
            config.password, config.host, config.port, config.user, config.database
        );
        
        let create_output = Command::new("sh")
            .arg("-c")
            .arg(&create_cmd)
            .output()
            .await?;
        
        if !create_output.status.success() {
            let stderr = String::from_utf8_lossy(&create_output.stderr);
            // Database might already exist, that's ok
            if !stderr.contains("already exists") {
                error!("Failed to create database {}: {}", config.database, stderr);
            }
        }
        
        // Restore the database
        let restore_cmd = format!(
            "gunzip -c {} | PGPASSWORD='{}' psql -h {} -p {} -U {} {}",
            dump_file, config.password, config.host, config.port, config.user, config.database
        );
        
        let output = Command::new("sh")
            .arg("-c")
            .arg(&restore_cmd)
            .output()
            .await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Some warnings are ok
            if stderr.contains("ERROR") {
                return Err(anyhow::anyhow!("Failed to restore database: {}", stderr));
            }
        }
        
        info!("Successfully restored database {}", config.database);
    } else if config.port == 3306 {
        // For MySQL/MariaDB (mempool)
        let restore_cmd = format!(
            "gunzip -c {} | mysql -h {} -P {} -u {} -p{} {}",
            dump_file, config.host, config.port, config.user, config.password, config.database
        );
        
        let output = Command::new("sh")
            .arg("-c")
            .arg(&restore_cmd)
            .output()
            .await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to restore MySQL database: {}", stderr));
        }
        
        info!("Successfully restored MySQL database {}", config.database);
    }
    
    Ok(())
}

/// Restore a Docker volume from a tar archive
async fn restore_volume_from_tar(tar_file: &str, volume_name: &str) -> Result<()> {
    info!("Restoring volume {} from {}", volume_name, tar_file);
    
    // Check if tar file exists
    if !Path::new(tar_file).exists() {
        return Err(anyhow::anyhow!("Tar file not found: {}", tar_file));
    }
    
    // Get the directory containing the tar file
    let tar_dir = Path::new(tar_file)
        .parent()
        .ok_or_else(|| anyhow::anyhow!("Invalid tar file path"))?
        .to_string_lossy();
    
    let tar_filename = Path::new(tar_file)
        .file_name()
        .ok_or_else(|| anyhow::anyhow!("Invalid tar filename"))?
        .to_string_lossy();
    
    // Extract tar to volume using alpine container
    let output = Command::new("docker")
        .args([
            "run", "--rm",
            "-v", &format!("{}:/data", volume_name),
            "-v", &format!("{}:/backup:ro", tar_dir),
            "alpine",
            "sh", "-c", &format!("rm -rf /data/* && tar -xf /backup/{} -C /data", tar_filename)
        ])
        .output()
        .await?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("Failed to restore volume: {}", stderr));
    }
    
    info!("Successfully restored volume {}", volume_name);
    Ok(())
}

/// Find database dump files in the restore directory
fn find_database_dumps(restore_path: &str) -> Vec<(String, String)> {
    let mut dumps = Vec::new();
    let db_path = Path::new(restore_path);
    
    // Look for .sql.gz files recursively
    if let Ok(entries) = std::fs::read_dir(db_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Check subdirectories (e.g., databases/)
                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if let Some(name) = sub_path.file_name() {
                            let name_str = name.to_string_lossy();
                            if name_str.ends_with(".sql.gz") {
                                let db_name = name_str.trim_end_matches(".sql.gz").to_string();
                                dumps.push((db_name, sub_path.to_string_lossy().to_string()));
                            }
                        }
                    }
                }
            } else if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if name_str.ends_with(".sql.gz") {
                    let db_name = name_str.trim_end_matches(".sql.gz").to_string();
                    dumps.push((db_name, path.to_string_lossy().to_string()));
                }
            }
        }
    }
    
    dumps
}

/// Find volume tar files in the restore directory
fn find_volume_tars(restore_path: &str) -> Vec<(String, String)> {
    let mut tars = Vec::new();
    let vol_path = Path::new(restore_path);
    
    // Look for .tar files recursively
    if let Ok(entries) = std::fs::read_dir(vol_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Check subdirectories (e.g., volumes/)
                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if let Some(name) = sub_path.file_name() {
                            let name_str = name.to_string_lossy();
                            if name_str.ends_with(".tar") {
                                let vol_name = name_str.trim_end_matches(".tar").to_string();
                                tars.push((vol_name, sub_path.to_string_lossy().to_string()));
                            }
                        }
                    }
                }
            } else if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if name_str.ends_with(".tar") {
                    let vol_name = name_str.trim_end_matches(".tar").to_string();
                    tars.push((vol_name, path.to_string_lossy().to_string()));
                }
            }
        }
    }
    
    tars
}

/// Perform a full restore from a Restic snapshot
pub async fn full_restore(
    snapshot_id: &str,
    config: &BackupConfig,
    target: &BackupTarget,
) -> Result<RestoreResult> {
    let start_time = std::time::Instant::now();
    
    let mut result = RestoreResult {
        success: false,
        databases_restored: Vec::new(),
        databases_failed: Vec::new(),
        volumes_restored: Vec::new(),
        volumes_failed: Vec::new(),
        errors: Vec::new(),
        duration_ms: 0,
    };
    
    let restore_path = format!("/tmp/restore-{}", snapshot_id);
    let engine = BackupEngine::new(config.clone());
    
    // Step 1: Extract snapshot
    info!("Step 1: Extracting snapshot {}", snapshot_id);
    if let Err(e) = extract_snapshot(&engine, target, snapshot_id, &restore_path).await {
        result.errors.push(format!("Failed to extract snapshot: {}", e));
        result.duration_ms = start_time.elapsed().as_millis() as u64;
        return Ok(result);
    }
    
    // Step 2: Find what needs to be restored
    let db_dumps = find_database_dumps(&restore_path);
    let vol_tars = find_volume_tars(&restore_path);
    
    info!("Found {} database dumps and {} volume tars", db_dumps.len(), vol_tars.len());
    
    // Step 3: Collect all containers to stop
    let db_container_map = get_db_container_map();
    let vol_container_map = get_volume_container_map();
    let anchor_databases = get_anchor_databases();
    
    let mut all_containers: Vec<&str> = Vec::new();
    
    // Add DB-dependent containers
    for (db_name, _) in &db_dumps {
        if let Some(containers) = db_container_map.get(db_name.as_str()) {
            for c in containers {
                if !all_containers.contains(c) {
                    all_containers.push(c);
                }
            }
        }
    }
    
    // Add volume-dependent containers
    for (vol_name, _) in &vol_tars {
        if let Some(containers) = vol_container_map.get(vol_name.as_str()) {
            for c in containers {
                if !all_containers.contains(c) {
                    all_containers.push(c);
                }
            }
        }
    }
    
    // Step 4: Stop all dependent containers
    info!("Step 2: Stopping {} containers", all_containers.len());
    if let Err(e) = stop_containers(&all_containers).await {
        result.errors.push(format!("Warning: Error stopping containers: {}", e));
    }
    
    // Give containers time to fully stop
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    // Step 5: Restore databases
    info!("Step 3: Restoring {} databases", db_dumps.len());
    for (db_name, dump_path) in &db_dumps {
        // Find the matching database config
        let db_config = anchor_databases.iter().find(|c| c.name == *db_name);
        
        if let Some(config) = db_config {
            match restore_database(dump_path, config).await {
                Ok(_) => {
                    result.databases_restored.push(db_name.clone());
                }
                Err(e) => {
                    error!("Failed to restore database {}: {}", db_name, e);
                    result.databases_failed.push(db_name.clone());
                    result.errors.push(format!("Database {}: {}", db_name, e));
                }
            }
        } else {
            warn!("No config found for database: {}", db_name);
            result.errors.push(format!("No config for database: {}", db_name));
        }
    }
    
    // Step 6: Restore volumes
    info!("Step 4: Restoring {} volumes", vol_tars.len());
    for (vol_name, tar_path) in &vol_tars {
        match restore_volume_from_tar(tar_path, vol_name).await {
            Ok(_) => {
                result.volumes_restored.push(vol_name.clone());
            }
            Err(e) => {
                error!("Failed to restore volume {}: {}", vol_name, e);
                result.volumes_failed.push(vol_name.clone());
                result.errors.push(format!("Volume {}: {}", vol_name, e));
            }
        }
    }
    
    // Step 7: Start containers back up
    info!("Step 5: Starting {} containers", all_containers.len());
    if let Err(e) = start_containers(&all_containers).await {
        result.errors.push(format!("Warning: Error starting containers: {}", e));
    }
    
    // Step 8: Cleanup
    info!("Step 6: Cleaning up");
    if let Err(e) = tokio::fs::remove_dir_all(&restore_path).await {
        warn!("Failed to cleanup restore directory: {}", e);
    }
    
    // Determine overall success
    result.success = result.databases_failed.is_empty() 
        && result.volumes_failed.is_empty()
        && (result.databases_restored.len() + result.volumes_restored.len() > 0);
    
    result.duration_ms = start_time.elapsed().as_millis() as u64;
    
    info!(
        "Restore completed in {}ms: {} DBs restored, {} DBs failed, {} volumes restored, {} volumes failed",
        result.duration_ms,
        result.databases_restored.len(),
        result.databases_failed.len(),
        result.volumes_restored.len(),
        result.volumes_failed.len()
    );
    
    Ok(result)
}

