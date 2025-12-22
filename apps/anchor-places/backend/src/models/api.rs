//! API request/response models for Anchor Places

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Bounding box query parameters
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BoundsParams {
    pub lat_min: f32,
    pub lat_max: f32,
    pub lng_min: f32,
    pub lng_max: f32,
    pub category: Option<i16>,
    pub limit: Option<i32>,
}

/// Search query parameters
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct SearchParams {
    pub q: String,
    pub category: Option<i16>,
    pub limit: Option<i32>,
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

/// My Places query parameters
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct MyPlacesParams {
    pub address: String,
    pub category: Option<i16>,
    pub limit: Option<i32>,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

/// Create marker request (for wallet integration)
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateMarkerRequest {
    pub category: u8,
    pub latitude: f32,
    pub longitude: f32,
    pub message: String,
    /// Carrier type: 0=op_return, 1=inscription, 2=stamps, 3=annex, 4=witness
    #[serde(default)]
    pub carrier: Option<u8>,
}

/// Create marker response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMarkerResponse {
    pub txid: String,
    pub vout: i32,
    pub hex: String,
    pub carrier: i32,
    pub carrier_name: String,
}

/// Create reply request
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateReplyRequest {
    pub message: String,
}

