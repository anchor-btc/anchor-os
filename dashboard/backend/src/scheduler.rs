//! Backup scheduler using cron

use anyhow::Result;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};
use uuid::Uuid;

use crate::backup::engine::{BackupEngine, BackupJob, BackupStatus, BackupTarget, BackupType};
use crate::backup::{database, volumes};
use crate::backup_config::BackupConfig as Config;
use crate::handlers::backup::BackupSettings;

pub struct BackupScheduler {
    scheduler: JobScheduler,
    current_job_uuid: RwLock<Option<uuid::Uuid>>,
}

impl BackupScheduler {
    pub async fn new() -> Result<Self> {
        let scheduler = JobScheduler::new().await?;

        Ok(Self {
            scheduler,
            current_job_uuid: RwLock::new(None),
        })
    }

    pub async fn start(&self) -> Result<()> {
        self.scheduler.start().await?;
        info!("Backup scheduler started");
        Ok(())
    }

    pub async fn update_schedule(
        &self,
        settings: &BackupSettings,
        config: Arc<Config>,
        job_history: Arc<RwLock<Vec<BackupJob>>>,
        current_job: Arc<RwLock<Option<BackupJob>>>,
    ) -> Result<()> {
        // Remove existing job if any
        if let Some(uuid) = self.current_job_uuid.read().await.as_ref() {
            let _ = self.scheduler.remove(uuid).await;
        }

        if !settings.schedule.enabled {
            info!("Scheduled backups disabled");
            *self.current_job_uuid.write().await = None;
            return Ok(());
        }

        let cron_expr = &settings.schedule.cron_expression;
        let target = match settings.schedule.target.as_str() {
            "s3" => BackupTarget::S3,
            "smb" => BackupTarget::Smb,
            _ => BackupTarget::Local,
        };
        let include_dbs = settings.schedule.include_databases;
        let include_vols = settings.schedule.include_volumes;

        let config_clone = config.clone();
        let history_clone = job_history.clone();
        let current_clone = current_job.clone();

        let job = Job::new_async(cron_expr, move |_uuid, _lock| {
            let config = config_clone.clone();
            let target = target.clone();
            let history = history_clone.clone();
            let current = current_clone.clone();

            Box::pin(async move {
                info!("Scheduled backup triggered");

                // Check if backup is already running
                {
                    let curr = current.read().await;
                    if curr.is_some() {
                        info!("Skipping scheduled backup - another backup is in progress");
                        return;
                    }
                }

                // Run the backup
                let job_id = Uuid::new_v4().to_string();
                run_scheduled_backup(
                    &config,
                    target,
                    include_dbs,
                    include_vols,
                    job_id,
                    history,
                    current,
                )
                .await;
            })
        })?;

        let uuid = self.scheduler.add(job).await?;
        *self.current_job_uuid.write().await = Some(uuid);

        info!("Scheduled backup enabled with cron: {}", cron_expr);
        Ok(())
    }

    pub fn get_next_run_time(cron_expr: &str) -> Option<DateTime<Utc>> {
        use croner::Cron;

        // tokio-cron-scheduler uses 6-field format (with seconds)
        // croner also supports this format
        // Try parsing directly first
        if let Ok(cron) = Cron::new(cron_expr).parse() {
            if let Ok(next) = cron.find_next_occurrence(&Utc::now(), false) {
                return Some(next);
            }
        }

        // If 6-field format fails, try removing seconds (first field) for 5-field
        let parts: Vec<&str> = cron_expr.split_whitespace().collect();
        if parts.len() == 6 {
            let five_field = parts[1..].join(" ");
            if let Ok(cron) = Cron::new(&five_field).parse() {
                if let Ok(next) = cron.find_next_occurrence(&Utc::now(), false) {
                    return Some(next);
                }
            }
        }

        None
    }
}

async fn run_scheduled_backup(
    config: &Config,
    target: BackupTarget,
    include_dbs: bool,
    include_vols: bool,
    job_id: String,
    job_history: Arc<RwLock<Vec<BackupJob>>>,
    current_job: Arc<RwLock<Option<BackupJob>>>,
) {
    info!("Starting scheduled backup job {}", job_id);

    let started_at = Utc::now();
    let engine = BackupEngine::new(config.clone());

    // Set current job
    {
        let mut current = current_job.write().await;
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

    let temp_dir = format!("{}/temp-{}", config.backup_dir, job_id);
    let mut paths_to_backup: Vec<String> = Vec::new();

    // Create temp directory
    if let Err(e) = tokio::fs::create_dir_all(&temp_dir).await {
        error!("Failed to create temp dir: {}", e);
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
                    }
                }
            }
        }
    }

    // Run restic backup
    let result = if !paths_to_backup.is_empty() {
        let path_refs: Vec<&str> = paths_to_backup.iter().map(|s| s.as_str()).collect();
        engine
            .backup(&target, &path_refs, &["scheduled-backup"])
            .await
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
            error!("Scheduled backup failed: {}", e);
            BackupJob {
                id: job_id.clone(),
                started_at,
                completed_at: Some(Utc::now()),
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
        let mut history = job_history.write().await;
        history.push(completed_job.clone());

        if history.len() > 100 {
            history.remove(0);
        }
    }

    // Clear current job
    {
        let mut current = current_job.write().await;
        *current = None;
    }

    info!(
        "Scheduled backup job {} completed with status {:?}",
        job_id, completed_job.status
    );
}
