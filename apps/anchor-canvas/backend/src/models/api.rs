//! API request and response types

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Canvas statistics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CanvasStats {
    pub total_pixels_painted: i64,
    pub total_transactions: i64,
    pub last_block_height: Option<i32>,
    pub last_update: Option<chrono::DateTime<chrono::Utc>>,
    pub canvas_width: u32,
    pub canvas_height: u32,
    pub total_pixels: u64,
}

/// Region query parameters
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RegionParams {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

/// Pagination parameters
#[derive(Debug, Clone, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_per_page")]
    pub per_page: i32,
}

fn default_per_page() -> i32 {
    100
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

/// Create pixel request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreatePixelRequest {
    pub pixels: Vec<PixelInput>,
    pub carrier: Option<u8>,
}

/// Input for a single pixel
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct PixelInput {
    pub x: u32,
    pub y: u32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

/// Create transaction response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTxResponse {
    pub txid: String,
    pub hex: String,
    pub fee: u64,
}

/// Request to get pixels by transaction IDs
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct GetPixelsByTxidsRequest {
    /// List of transaction IDs (hex-encoded)
    pub txids: Vec<String>,
}

/// A pixel painted by the user
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UserPixel {
    pub x: i32,
    pub y: i32,
    pub r: i16,
    pub g: i16,
    pub b: i16,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Response for get pixels by txids
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetPixelsByTxidsResponse {
    pub pixels: Vec<UserPixel>,
    pub total_pixels: i64,
    pub unique_transactions: i64,
}

/// Query parameters for get pixels by address
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct GetPixelsByAddressParams {
    /// Bitcoin address
    pub address: String,
    /// Number of pixels per page (default: 100)
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    /// Page number (default: 0)
    #[serde(default)]
    pub page: i32,
}

/// Request body for getting pixels by multiple addresses
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct GetPixelsByAddressesRequest {
    /// List of Bitcoin addresses
    pub addresses: Vec<String>,
    /// Number of pixels per page (default: 100)
    #[serde(default = "default_per_page")]
    pub per_page: i32,
}

/// Response for get pixels by address
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetPixelsByAddressResponse {
    pub pixels: Vec<UserPixel>,
    pub total_pixels: i64,
    pub unique_transactions: i64,
    pub unique_positions: i64,
    pub page: i32,
    pub per_page: i32,
}

