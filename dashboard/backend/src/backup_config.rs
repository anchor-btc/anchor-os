//! Configuration for the backup service

use std::env;

#[derive(Debug, Clone)]
pub struct BackupConfig {
    #[allow(dead_code)]
    pub host: String,
    #[allow(dead_code)]
    pub port: u16,

    // Local backup settings
    pub backup_dir: String,

    // S3 settings (optional)
    pub s3_endpoint: Option<String>,
    pub s3_bucket: Option<String>,
    pub s3_access_key: Option<String>,
    pub s3_secret_key: Option<String>,

    // SMB settings (optional)
    pub smb_host: Option<String>,
    pub smb_share: Option<String>,
    pub smb_mount_point: Option<String>,

    // Restic settings
    pub restic_password: String,
}

impl BackupConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8003".to_string())
                .parse()
                .expect("PORT must be a number"),

            // Local backup
            backup_dir: env::var("BACKUP_DIR").unwrap_or_else(|_| "/backups".to_string()),

            // S3
            s3_endpoint: env::var("S3_ENDPOINT").ok().filter(|s| !s.is_empty()),
            s3_bucket: env::var("S3_BUCKET").ok().filter(|s| !s.is_empty()),
            s3_access_key: env::var("S3_ACCESS_KEY").ok().filter(|s| !s.is_empty()),
            s3_secret_key: env::var("S3_SECRET_KEY").ok().filter(|s| !s.is_empty()),

            // SMB
            smb_host: env::var("SMB_HOST").ok().filter(|s| !s.is_empty()),
            smb_share: env::var("SMB_SHARE").ok().filter(|s| !s.is_empty()),
            smb_mount_point: env::var("SMB_MOUNT_POINT").ok().filter(|s| !s.is_empty()),

            // Restic
            restic_password: env::var("RESTIC_PASSWORD")
                .unwrap_or_else(|_| "anchor-backup-secret".to_string()),
        }
    }

    pub fn s3_configured(&self) -> bool {
        self.s3_bucket.is_some() && self.s3_access_key.is_some() && self.s3_secret_key.is_some()
    }

    pub fn smb_configured(&self) -> bool {
        self.smb_host.is_some() && self.smb_share.is_some()
    }
}
