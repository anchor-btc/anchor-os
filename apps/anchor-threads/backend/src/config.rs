//! Configuration for the explorer API

use anyhow::{Context, Result};
use std::env;

/// Explorer API configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Database URL
    pub database_url: String,
    /// HTTP server port
    pub port: u16,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL must be set")?,
            port: env::var("PORT")
                .unwrap_or_else(|_| "3101".to_string())
                .parse()
                .context("Invalid PORT")?,
        })
    }
}

