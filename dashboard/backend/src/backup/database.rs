//! Database backup utilities

use anyhow::Result;
use std::path::Path;
use tokio::process::Command;
use tracing::{error, info};

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

/// Dump PostgreSQL database to a file
pub async fn pg_dump(config: &DatabaseConfig, output_path: &str) -> Result<String> {
    let dump_file = format!("{}/{}.sql.gz", output_path, config.name);

    info!(
        "Dumping PostgreSQL database {} to {}",
        config.database, dump_file
    );

    // Create output directory if needed
    if let Some(parent) = Path::new(&dump_file).parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    // Run pg_dump with gzip compression
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!(
            "PGPASSWORD='{}' pg_dump -h {} -p {} -U {} {} | gzip > {}",
            config.password, config.host, config.port, config.user, config.database, dump_file
        ))
        .output()
        .await?;

    if output.status.success() {
        info!("Database dump completed: {}", dump_file);
        Ok(dump_file)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("pg_dump failed: {}", stderr);
        Err(anyhow::anyhow!("pg_dump failed: {}", stderr))
    }
}

/// Get list of Anchor databases to backup
pub fn get_anchor_databases() -> Vec<DatabaseConfig> {
    vec![
        DatabaseConfig {
            name: "anchor-main".to_string(),
            host: "core-postgres".to_string(),
            port: 5432,
            user: "anchor".to_string(),
            password: "anchor".to_string(),
            database: "anchor".to_string(),
        },
        DatabaseConfig {
            name: "anchor-oracles".to_string(),
            host: "app-oracles-postgres".to_string(),
            port: 5432,
            user: "anchor".to_string(),
            password: "anchor".to_string(),
            database: "anchor_oracles".to_string(),
        },
        DatabaseConfig {
            name: "anchor-predictions".to_string(),
            host: "app-predictions-postgres".to_string(),
            port: 5432,
            user: "anchor".to_string(),
            password: "anchor".to_string(),
            database: "anchor_lottery".to_string(),
        },
        DatabaseConfig {
            name: "mempool".to_string(),
            host: "explorer-mempool-db".to_string(),
            port: 3306,
            user: "mempool".to_string(),
            password: "mempool".to_string(),
            database: "mempool".to_string(),
        },
    ]
}
