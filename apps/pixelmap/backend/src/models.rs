//! Data models for the PixelMap API

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// A single pixel with coordinates and color
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Pixel {
    pub x: u32,
    pub y: u32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Pixel {
    /// Create a new pixel
    pub fn new(x: u32, y: u32, r: u8, g: u8, b: u8) -> Self {
        Self { x, y, r, g, b }
    }

    /// Encode pixel to bytes (7 bytes: x:u16, y:u16, r:u8, g:u8, b:u8)
    pub fn to_bytes(&self) -> [u8; 7] {
        let mut bytes = [0u8; 7];
        bytes[0..2].copy_from_slice(&(self.x as u16).to_be_bytes());
        bytes[2..4].copy_from_slice(&(self.y as u16).to_be_bytes());
        bytes[4] = self.r;
        bytes[5] = self.g;
        bytes[6] = self.b;
        bytes
    }

    /// Decode pixel from bytes
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 7 {
            return None;
        }
        let x = u16::from_be_bytes([bytes[0], bytes[1]]) as u32;
        let y = u16::from_be_bytes([bytes[2], bytes[3]]) as u32;
        let r = bytes[4];
        let g = bytes[5];
        let b = bytes[6];
        Some(Self { x, y, r, g, b })
    }
}

/// Pixel state from database
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PixelState {
    pub x: i32,
    pub y: i32,
    pub r: i16,
    pub g: i16,
    pub b: i16,
    pub last_txid: String,
    pub last_vout: i32,
    pub last_block_height: Option<i32>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Pixel history entry
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PixelHistoryEntry {
    pub r: i16,
    pub g: i16,
    pub b: i16,
    pub txid: String,
    pub vout: i32,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

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
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
}

fn default_page() -> i32 {
    1
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

/// Recent pixel change
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RecentPixel {
    pub x: i32,
    pub y: i32,
    pub r: i16,
    pub g: i16,
    pub b: i16,
    pub txid: String,
    pub block_height: Option<i32>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Pixel info response (with history)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PixelInfo {
    pub x: i32,
    pub y: i32,
    pub current: Option<PixelState>,
    pub history: Vec<PixelHistoryEntry>,
}


