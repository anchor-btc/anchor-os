//! Core backup engine using restic

use anyhow::{Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tracing::{info, error};
use uuid::Uuid;

use crate::backup_config::BackupConfig as Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupJob {
    pub id: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: BackupStatus,
    pub backup_type: BackupType,
    pub target: BackupTarget,
    pub size_bytes: Option<i64>,
    pub files_count: Option<i64>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BackupStatus {
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupType {
    Full,
    Incremental,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupTarget {
    Local,
    S3,
    Smb,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResticSnapshot {
    pub id: String,
    pub time: DateTime<Utc>,
    pub hostname: String,
    pub tags: Vec<String>,
    pub paths: Vec<String>,
}

pub struct BackupEngine {
    config: Config,
}

impl BackupEngine {
    pub fn new(config: Config) -> Self {
        Self { config }
    }
    
    /// Get the restic repository path for a target
    fn get_repo_path(&self, target: &BackupTarget) -> String {
        match target {
            BackupTarget::Local => format!("{}/restic-repo", self.config.backup_dir),
            BackupTarget::S3 => {
                if let (Some(endpoint), Some(bucket)) = (&self.config.s3_endpoint, &self.config.s3_bucket) {
                    format!("s3:{}/{}", endpoint, bucket)
                } else if let Some(bucket) = &self.config.s3_bucket {
                    format!("s3:s3.amazonaws.com/{}", bucket)
                } else {
                    format!("{}/restic-repo", self.config.backup_dir)
                }
            }
            BackupTarget::Smb => {
                self.config.smb_mount_point.clone()
                    .unwrap_or_else(|| format!("{}/smb-backup", self.config.backup_dir))
            }
        }
    }
    
    /// Set up environment variables for restic
    fn get_restic_env(&self, target: &BackupTarget) -> Vec<(String, String)> {
        let mut env = vec![
            ("RESTIC_PASSWORD".to_string(), self.config.restic_password.clone()),
            ("RESTIC_REPOSITORY".to_string(), self.get_repo_path(target)),
        ];
        
        if let BackupTarget::S3 = target {
            if let Some(key) = &self.config.s3_access_key {
                env.push(("AWS_ACCESS_KEY_ID".to_string(), key.clone()));
            }
            if let Some(secret) = &self.config.s3_secret_key {
                env.push(("AWS_SECRET_ACCESS_KEY".to_string(), secret.clone()));
            }
        }
        
        env
    }
    
    /// Initialize restic repository if not exists
    pub async fn init_repo(&self, target: &BackupTarget) -> Result<()> {
        let repo_path = self.get_repo_path(target);
        info!("Initializing restic repository at: {}", repo_path);
        
        let env = self.get_restic_env(target);
        
        let mut cmd = Command::new("restic");
        cmd.arg("init");
        
        for (key, value) in env {
            cmd.env(key, value);
        }
        
        let output = cmd.output().await?;
        
        if output.status.success() {
            info!("Repository initialized successfully");
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("already initialized") || stderr.contains("already exists") {
                info!("Repository already initialized");
                Ok(())
            } else {
                error!("Failed to initialize repository: {}", stderr);
                Err(anyhow::anyhow!("Failed to initialize repository: {}", stderr))
            }
        }
    }
    
    /// Run a backup of specified paths
    pub async fn backup(&self, target: &BackupTarget, paths: &[&str], tags: &[&str]) -> Result<BackupJob> {
        let job_id = Uuid::new_v4().to_string();
        let started_at = Utc::now();
        
        info!("Starting backup job {} to {:?}", job_id, target);
        
        // Ensure repo is initialized
        self.init_repo(target).await?;
        
        let env = self.get_restic_env(target);
        
        let mut cmd = Command::new("restic");
        cmd.arg("backup");
        cmd.arg("--json");
        
        for tag in tags {
            cmd.arg("--tag").arg(tag);
        }
        
        for path in paths {
            cmd.arg(path);
        }
        
        for (key, value) in env {
            cmd.env(key, value);
        }
        
        let output = cmd.output().await?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            info!("Backup completed successfully");
            
            // Parse restic output to get stats
            let (size_bytes, files_count) = self.parse_backup_output(&stdout);
            
            Ok(BackupJob {
                id: job_id,
                started_at,
                completed_at: Some(Utc::now()),
                status: BackupStatus::Completed,
                backup_type: BackupType::Incremental,
                target: target.clone(),
                size_bytes,
                files_count,
                error_message: None,
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Backup failed: {}", stderr);
            
            Ok(BackupJob {
                id: job_id,
                started_at,
                completed_at: Some(Utc::now()),
                status: BackupStatus::Failed,
                backup_type: BackupType::Incremental,
                target: target.clone(),
                size_bytes: None,
                files_count: None,
                error_message: Some(stderr.to_string()),
            })
        }
    }
    
    /// List snapshots in the repository
    pub async fn list_snapshots(&self, target: &BackupTarget) -> Result<Vec<ResticSnapshot>> {
        let env = self.get_restic_env(target);
        
        let mut cmd = Command::new("restic");
        cmd.arg("snapshots");
        cmd.arg("--json");
        
        for (key, value) in env {
            cmd.env(key, value);
        }
        
        let output = cmd.output().await?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let snapshots: Vec<ResticSnapshot> = serde_json::from_str(&stdout)
                .unwrap_or_default();
            Ok(snapshots)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("no matching") || stderr.contains("not found") {
                Ok(vec![])
            } else {
                Err(anyhow::anyhow!("Failed to list snapshots: {}", stderr))
            }
        }
    }
    
    /// Restore from a snapshot
    pub async fn restore(&self, target: &BackupTarget, snapshot_id: &str, restore_path: &str) -> Result<()> {
        info!("Restoring snapshot {} to {}", snapshot_id, restore_path);
        
        let env = self.get_restic_env(target);
        
        let mut cmd = Command::new("restic");
        cmd.arg("restore");
        cmd.arg(snapshot_id);
        cmd.arg("--target").arg(restore_path);
        
        for (key, value) in env {
            cmd.env(key, value);
        }
        
        let output = cmd.output().await?;
        
        if output.status.success() {
            info!("Restore completed successfully");
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Restore failed: {}", stderr);
            Err(anyhow::anyhow!("Restore failed: {}", stderr))
        }
    }
    
    /// Parse backup output to extract stats
    fn parse_backup_output(&self, output: &str) -> (Option<i64>, Option<i64>) {
        // Parse JSON lines from restic backup output
        let mut size_bytes = None;
        let mut files_count = None;
        
        for line in output.lines() {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if json.get("message_type").and_then(|v| v.as_str()) == Some("summary") {
                    size_bytes = json.get("total_bytes_processed").and_then(|v| v.as_i64());
                    files_count = json.get("total_files_processed").and_then(|v| v.as_i64());
                }
            }
        }
        
        (size_bytes, files_count)
    }
}
