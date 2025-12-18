//! Storage targets module

pub mod local;
pub mod s3;
pub mod smb;

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub name: String,
    pub storage_type: StorageType,
    pub configured: bool,
    pub total_bytes: Option<i64>,
    pub used_bytes: Option<i64>,
    pub available_bytes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StorageType {
    Local,
    S3,
    Smb,
}
