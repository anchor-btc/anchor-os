//! API handlers for the backup service

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error};

use crate::backup::engine::{BackupEngine, BackupJob, BackupStatus, BackupTarget, BackupType};
use crate::backup::{database, volumes, restore};
use crate::backup_config::BackupConfig;
use crate::storage::{self, StorageInfo};

use crate::scheduler::BackupScheduler;

/// Backup application state
pub struct BackupState {
    pub config: BackupConfig,
    pub engine: BackupEngine,
    pub current_job: Arc<RwLock<Option<BackupJob>>>,
    pub job_history: Arc<RwLock<Vec<BackupJob>>>,
    pub settings: RwLock<BackupSettings>,
    pub scheduler: BackupScheduler,
    pub host_backup_path: Option<String>,
}

impl BackupState {
    pub async fn new(config: BackupConfig) -> Self {
        let engine = BackupEngine::new(config.clone());
        let scheduler = BackupScheduler::new().await.expect("Failed to create scheduler");
        
        // Try to detect host path from environment
        let host_backup_path = std::env::var("HOST_BACKUP_PATH").ok();
        
        Self {
            config,
            engine,
            current_job: Arc::new(RwLock::new(None)),
            job_history: Arc::new(RwLock::new(Vec::new())),
            settings: RwLock::new(BackupSettings::default()),
            scheduler,
            host_backup_path,
        }
    }
    
    pub async fn start_scheduler(&self) -> anyhow::Result<()> {
        self.scheduler.start().await
    }
}

// Request/Response types

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub status: String,
    pub service: String,
    pub current_backup: Option<BackupJob>,
    pub last_backup: Option<BackupJob>,
}

#[derive(Debug, Serialize)]
pub struct BackupStatusResponse {
    pub running: bool,
    pub current_job: Option<BackupJob>,
    pub last_backup: Option<BackupJob>,
    pub next_scheduled: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StartBackupRequest {
    pub target: Option<String>,
    pub include_databases: Option<bool>,
    pub include_volumes: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct StartBackupResponse {
    pub job_id: String,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct HistoryResponse {
    pub backups: Vec<BackupJob>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct TargetsResponse {
    pub targets: Vec<StorageInfo>,
}

#[derive(Debug, Deserialize)]
pub struct RestoreRequest {
    pub snapshot_id: String,
    pub target: Option<String>,
    pub restore_path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RestoreResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub databases_restored: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub databases_failed: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volumes_restored: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volumes_failed: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct VolumesResponse {
    pub volumes: Vec<volumes::DockerVolume>,
}

#[derive(Debug, Serialize)]
pub struct SnapshotsResponse {
    pub snapshots: Vec<crate::backup::engine::ResticSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub schedule: ScheduleSettings,
    pub s3: S3Settings,
    pub smb: SmbSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleSettings {
    pub enabled: bool,
    pub cron_expression: String,
    pub target: String,
    pub include_databases: bool,
    pub include_volumes: bool,
    pub retention_days: u32,
    pub keep_last: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Settings {
    pub endpoint: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmbSettings {
    pub host: String,
    pub share: String,
    pub username: String,
    pub password: String,
    pub mount_point: String,
}

impl Default for BackupSettings {
    fn default() -> Self {
        Self {
            schedule: ScheduleSettings {
                enabled: false,
                cron_expression: "0 3 * * *".to_string(),
                target: "local".to_string(),
                include_databases: true,
                include_volumes: true,
                retention_days: 30,
                keep_last: 10,
            },
            s3: S3Settings {
                endpoint: String::new(),
                bucket: String::new(),
                access_key: String::new(),
                secret_key: String::new(),
                region: "us-east-1".to_string(),
            },
            smb: SmbSettings {
                host: String::new(),
                share: String::new(),
                username: String::new(),
                password: String::new(),
                mount_point: "/mnt/nas".to_string(),
            },
        }
    }
}

#[derive(Debug, Serialize)]
pub struct LocalFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LocalFilesResponse {
    pub path: String,
    pub host_path: Option<String>,
    pub files: Vec<LocalFile>,
    pub total_size: u64,
}

// Handlers

/// Health check
pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "anchor-backup"
    }))
}

/// Get backup status
pub async fn get_status(State(state): State<Arc<BackupState>>) -> impl IntoResponse {
    let current_job = state.current_job.read().await.clone();
    let history = state.job_history.read().await;
    let last_backup = history.last().cloned();
    
    // Get next scheduled time
    let settings = state.settings.read().await;
    let next_scheduled = if settings.schedule.enabled {
        BackupScheduler::get_next_run_time(&settings.schedule.cron_expression)
            .map(|dt| dt.to_rfc3339())
    } else {
        None
    };

    Json(BackupStatusResponse {
        running: current_job.as_ref().map(|j| j.status == BackupStatus::Running).unwrap_or(false),
        current_job,
        last_backup,
        next_scheduled,
    })
}

/// Start a backup
pub async fn start_backup(
    State(state): State<Arc<BackupState>>,
    Json(req): Json<StartBackupRequest>,
) -> impl IntoResponse {
    // Check if backup is already running
    {
        let current = state.current_job.read().await;
        if let Some(job) = current.as_ref() {
            if job.status == BackupStatus::Running {
                return (
                    StatusCode::CONFLICT,
                    Json(StartBackupResponse {
                        job_id: job.id.clone(),
                        status: "running".to_string(),
                        message: "A backup is already in progress".to_string(),
                    }),
                );
            }
        }
    }
    
    let target = match req.target.as_deref() {
        Some("s3") => BackupTarget::S3,
        Some("smb") => BackupTarget::Smb,
        _ => BackupTarget::Local,
    };
    
    let include_dbs = req.include_databases.unwrap_or(true);
    let include_vols = req.include_volumes.unwrap_or(true);
    
    // Start backup in background
    let state_clone = state.clone();
    let job_id = uuid::Uuid::new_v4().to_string();
    let job_id_clone = job_id.clone();
    
    tokio::spawn(async move {
        run_backup(state_clone, target, include_dbs, include_vols, job_id_clone).await;
    });
    
    (
        StatusCode::ACCEPTED,
        Json(StartBackupResponse {
            job_id,
            status: "started".to_string(),
            message: "Backup started".to_string(),
        }),
    )
}

async fn run_backup(
    state: Arc<BackupState>,
    target: BackupTarget,
    include_dbs: bool,
    include_vols: bool,
    job_id: String,
) {
    info!("Starting backup job {}", job_id);
    
    let started_at = chrono::Utc::now();
    
    // Set current job
    {
        let mut current = state.current_job.write().await;
        *current = Some(BackupJob {
            id: job_id.clone(),
            started_at,
            completed_at: None,
            status: BackupStatus::Running,
            backup_type: BackupType::Incremental,
            target: target.clone(),
            size_bytes: None,
            files_count: None,
            error_message: None,
        });
    }
    
    let temp_dir = format!("{}/temp-{}", state.config.backup_dir, job_id);
    let mut paths_to_backup: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    
    // Create temp directory
    if let Err(e) = tokio::fs::create_dir_all(&temp_dir).await {
        error!("Failed to create temp dir: {}", e);
        errors.push(format!("Failed to create temp dir: {}", e));
    }
    
    // Dump databases
    if include_dbs {
        let db_dir = format!("{}/databases", temp_dir);
        if let Err(e) = tokio::fs::create_dir_all(&db_dir).await {
            error!("Failed to create db dir: {}", e);
        } else {
            for db_config in database::get_anchor_databases() {
                match database::pg_dump(&db_config, &db_dir).await {
                    Ok(dump_path) => {
                        paths_to_backup.push(dump_path);
                    }
                    Err(e) => {
                        error!("Failed to dump {}: {}", db_config.name, e);
                        // Continue with other databases
                    }
                }
            }
        }
    }
    
    // Prepare volumes
    if include_vols {
        let vol_dir = format!("{}/volumes", temp_dir);
        if let Err(e) = tokio::fs::create_dir_all(&vol_dir).await {
            error!("Failed to create vol dir: {}", e);
        } else {
            for vol_name in volumes::get_anchor_volumes() {
                match volumes::prepare_volume_for_backup(vol_name, &vol_dir).await {
                    Ok(vol_path) => {
                        paths_to_backup.push(vol_path);
                    }
                    Err(e) => {
                        error!("Failed to prepare volume {}: {}", vol_name, e);
                        // Continue with other volumes
                    }
                }
            }
        }
    }
    
    // Run restic backup
    let result = if !paths_to_backup.is_empty() {
        let path_refs: Vec<&str> = paths_to_backup.iter().map(|s| s.as_str()).collect();
        state.engine.backup(&target, &path_refs, &["anchor-backup"]).await
    } else {
        Err(anyhow::anyhow!("No paths to backup"))
    };
    
    // Cleanup temp directory
    let _ = tokio::fs::remove_dir_all(&temp_dir).await;
    
    // Update job status
    let completed_job = match result {
        Ok(mut job) => {
            job.id = job_id.clone();
            job.started_at = started_at;
            job
        }
        Err(e) => {
            error!("Backup failed: {}", e);
            BackupJob {
                id: job_id.clone(),
                started_at,
                completed_at: Some(chrono::Utc::now()),
                status: BackupStatus::Failed,
                backup_type: BackupType::Incremental,
                target,
                size_bytes: None,
                files_count: None,
                error_message: Some(e.to_string()),
            }
        }
    };
    
    // Save to history
    {
        let mut history = state.job_history.write().await;
        history.push(completed_job.clone());
        
        // Keep only last 100 jobs
        if history.len() > 100 {
            history.remove(0);
        }
    }
    
    // Clear current job
    {
        let mut current = state.current_job.write().await;
        *current = None;
    }
    
    info!("Backup job {} completed with status {:?}", job_id, completed_job.status);
}

/// Get backup history
pub async fn get_history(State(state): State<Arc<BackupState>>) -> impl IntoResponse {
    let history = state.job_history.read().await;
    
    Json(HistoryResponse {
        total: history.len(),
        backups: history.iter().rev().take(50).cloned().collect(),
    })
}

/// Get storage targets
pub async fn get_targets(State(state): State<Arc<BackupState>>) -> impl IntoResponse {
    let mut targets = Vec::new();
    
    // Local storage
    if let Ok(info) = storage::local::get_storage_info(&state.config.backup_dir).await {
        targets.push(info);
    }
    
    // S3 storage
    if let Ok(info) = storage::s3::get_storage_info(&state.config).await {
        targets.push(info);
    }
    
    // SMB storage
    if let Ok(info) = storage::smb::get_storage_info(&state.config).await {
        targets.push(info);
    }
    
    Json(TargetsResponse { targets })
}

/// Restore from backup
pub async fn restore(
    State(state): State<Arc<BackupState>>,
    Json(req): Json<RestoreRequest>,
) -> impl IntoResponse {
    let target = match req.target.as_deref() {
        Some("s3") => BackupTarget::S3,
        Some("smb") => BackupTarget::Smb,
        _ => BackupTarget::Local,
    };
    
    info!("Starting full restore from snapshot {}", req.snapshot_id);
    
    // Perform full restore (databases + volumes)
    match restore::full_restore(&req.snapshot_id, &state.config, &target).await {
        Ok(result) => {
            let message = if result.success {
                format!(
                    "Restore completed: {} databases, {} volumes restored in {}ms",
                    result.databases_restored.len(),
                    result.volumes_restored.len(),
                    result.duration_ms
                )
            } else {
                format!(
                    "Restore partially failed: {} DBs ok, {} DBs failed, {} volumes ok, {} volumes failed",
                    result.databases_restored.len(),
                    result.databases_failed.len(),
                    result.volumes_restored.len(),
                    result.volumes_failed.len()
                )
            };
            
            Json(RestoreResponse {
                success: result.success,
                message,
                job_id: Some(req.snapshot_id.clone()),
                databases_restored: Some(result.databases_restored),
                databases_failed: Some(result.databases_failed),
                volumes_restored: Some(result.volumes_restored),
                volumes_failed: Some(result.volumes_failed),
                errors: if result.errors.is_empty() { None } else { Some(result.errors) },
                duration_ms: Some(result.duration_ms),
            })
        }
        Err(e) => {
            error!("Restore failed: {}", e);
            Json(RestoreResponse {
                success: false,
                message: format!("Restore failed: {}", e),
                job_id: None,
                databases_restored: None,
                databases_failed: None,
                volumes_restored: None,
                volumes_failed: None,
                errors: Some(vec![e.to_string()]),
                duration_ms: None,
            })
        }
    }
}

/// List Docker volumes
pub async fn list_volumes() -> impl IntoResponse {
    match volumes::list_volumes().await {
        Ok(vols) => Json(VolumesResponse { volumes: vols }),
        Err(e) => {
            error!("Failed to list volumes: {}", e);
            Json(VolumesResponse { volumes: vec![] })
        }
    }
}

/// List snapshots
pub async fn list_snapshots(
    State(state): State<Arc<BackupState>>,
    Path(target): Path<String>,
) -> impl IntoResponse {
    let backup_target = match target.as_str() {
        "s3" => BackupTarget::S3,
        "smb" => BackupTarget::Smb,
        _ => BackupTarget::Local,
    };
    
    match state.engine.list_snapshots(&backup_target).await {
        Ok(snapshots) => Json(SnapshotsResponse { snapshots }),
        Err(e) => {
            error!("Failed to list snapshots: {}", e);
            Json(SnapshotsResponse { snapshots: vec![] })
        }
    }
}

/// Get settings
pub async fn get_settings(State(state): State<Arc<BackupState>>) -> impl IntoResponse {
    let settings = state.settings.read().await;
    Json(settings.clone())
}

/// Save settings
pub async fn save_settings(
    State(state): State<Arc<BackupState>>,
    Json(new_settings): Json<BackupSettings>,
) -> impl IntoResponse {
    // Update settings
    {
        let mut settings = state.settings.write().await;
        *settings = new_settings.clone();
    }
    
    // Update scheduler
    let config = Arc::new(state.config.clone());
    if let Err(e) = state.scheduler.update_schedule(
        &new_settings,
        config,
        state.job_history.clone(),
        state.current_job.clone(),
    ).await {
        error!("Failed to update scheduler: {}", e);
        return Json(serde_json::json!({
            "success": false,
            "message": format!("Settings saved but scheduler failed: {}", e)
        }));
    }
    
    // Calculate next run time
    let next_run = if new_settings.schedule.enabled {
        BackupScheduler::get_next_run_time(&new_settings.schedule.cron_expression)
            .map(|dt| dt.to_rfc3339())
    } else {
        None
    };
    
    info!("Backup settings saved, next run: {:?}", next_run);

    Json(serde_json::json!({
        "success": true,
        "message": "Settings saved successfully",
        "next_scheduled": next_run
    }))
}

/// List local backup files
pub async fn list_local_files(State(state): State<Arc<BackupState>>) -> impl IntoResponse {
    let backup_dir = &state.config.backup_dir;
    
    let mut files = Vec::new();
    let mut total_size: u64 = 0;
    
    match tokio::fs::read_dir(backup_dir).await {
        Ok(mut entries) => {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                
                if let Ok(metadata) = entry.metadata().await {
                    let size = if metadata.is_dir() {
                        // Get directory size
                        get_dir_size(&path).await.unwrap_or(0)
                    } else {
                        metadata.len()
                    };
                    
                    total_size += size;
                    
                    let modified = metadata.modified().ok().map(|t| {
                        let datetime: chrono::DateTime<chrono::Utc> = t.into();
                        datetime.to_rfc3339()
                    });
                    
                    files.push(LocalFile {
                        name,
                        path: path.to_string_lossy().to_string(),
                        size,
                        is_dir: metadata.is_dir(),
                        modified,
                    });
                }
            }
        }
        Err(e) => {
            error!("Failed to read backup directory: {}", e);
        }
    }
    
    // Sort by name
    files.sort_by(|a, b| a.name.cmp(&b.name));

    Json(LocalFilesResponse {
        path: backup_dir.clone(),
        host_path: state.host_backup_path.clone(),
        files,
        total_size,
    })
}

async fn get_dir_size(path: &std::path::Path) -> Result<u64, std::io::Error> {
    let mut size: u64 = 0;
    let mut stack = vec![path.to_path_buf()];
    
    while let Some(current) = stack.pop() {
        if let Ok(mut entries) = tokio::fs::read_dir(&current).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                if let Ok(metadata) = entry.metadata().await {
                    if metadata.is_dir() {
                        stack.push(entry.path());
                    } else {
                        size += metadata.len();
                    }
                }
            }
        }
    }
    
    Ok(size)
}
