//! API response models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Message response for the API
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MessageResponse {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub kind: i16,
    pub kind_name: String,
    pub body_hex: String,
    pub body_text: Option<String>,
    pub anchors: Vec<AnchorResponse>,
    pub reply_count: i64,
    pub created_at: DateTime<Utc>,
}

/// Anchor response for the API
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AnchorResponse {
    pub index: i16,
    pub txid_prefix: String,
    pub vout: i16,
    pub resolved_txid: Option<String>,
    pub is_ambiguous: bool,
    pub is_orphan: bool,
}

/// Statistics response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatsResponse {
    pub total_messages: i64,
    pub total_roots: i64,
    pub total_replies: i64,
    pub total_anchors: i64,
    pub resolved_anchors: i64,
    pub orphan_anchors: i64,
    pub ambiguous_anchors: i64,
    pub last_block_height: i32,
}

/// Paginated list response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaginatedResponse<T: ToSchema> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

/// Thread response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadResponse {
    pub root: MessageResponse,
    pub replies: Vec<ThreadNodeResponse>,
    pub total_messages: i64,
}

/// Thread node (recursive)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadNodeResponse {
    pub message: MessageResponse,
    pub replies: Vec<ThreadNodeResponse>,
}

/// Popular thread response (message with total thread count)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PopularThreadResponse {
    #[serde(flatten)]
    pub message: MessageResponse,
    pub total_thread_messages: i64,
}

/// Query parameters for listing messages
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    pub kind: Option<i16>,
}

/// Advanced filter parameters for threads/messages
#[derive(Debug, Clone, Deserialize, Default, ToSchema)]
pub struct FilterParams {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    /// Filter by transaction ID (partial match)
    pub txid: Option<String>,
    /// Filter by block height (exact)
    pub block_height: Option<i32>,
    /// Filter by minimum block height
    pub block_min: Option<i32>,
    /// Filter by maximum block height
    pub block_max: Option<i32>,
    /// Filter by message kind (0=Generic, 1=Text)
    pub kind: Option<i16>,
    /// Filter by text content (partial match, case insensitive)
    pub text: Option<String>,
    /// Filter by minimum timestamp (ISO 8601)
    pub from_date: Option<DateTime<Utc>>,
    /// Filter by maximum timestamp (ISO 8601)
    pub to_date: Option<DateTime<Utc>>,
    /// Filter by minimum body size in bytes
    pub min_size: Option<i32>,
    /// Filter by maximum body size in bytes
    pub max_size: Option<i32>,
    /// Filter by minimum reply count
    pub min_replies: Option<i32>,
    /// Sort order: "newest", "oldest", "replies", "size"
    pub sort: Option<String>,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    20
}

impl ListParams {
    pub fn offset(&self) -> i32 {
        (self.page - 1) * self.per_page
    }
}

impl FilterParams {
    pub fn offset(&self) -> i32 {
        (self.page - 1) * self.per_page
    }
}

