//! Database models for Anchor Places

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Marker category
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Category {
    pub id: i16,
    pub name: String,
    pub icon: String,
    pub color: String,
}

/// A map marker
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Marker {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub category: Category,
    pub latitude: f32,
    pub longitude: f32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creator_address: Option<String>,
    pub block_height: Option<i32>,
    pub reply_count: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// A marker reply
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MarkerReply {
    pub id: i32,
    pub txid: String,
    pub vout: i32,
    pub message: String,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Marker with full details including replies
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MarkerDetail {
    pub marker: Marker,
    pub replies: Vec<MarkerReply>,
}

/// Map statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MapStats {
    pub total_markers: i64,
    pub total_transactions: i64,
    pub total_replies: i64,
    pub last_block_height: Option<i32>,
    pub last_update: Option<chrono::DateTime<chrono::Utc>>,
}
