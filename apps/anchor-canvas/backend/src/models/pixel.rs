//! Core pixel types

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use anchor_specs::state::PixelData;

/// A single pixel with coordinates and color (API representation)
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

    /// Decode pixel from bytes
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        PixelData::from_bytes(bytes).map(|pd| Self {
            x: pd.x as u32,
            y: pd.y as u32,
            r: pd.r,
            g: pd.g,
            b: pd.b,
        })
    }

    /// Encode pixel to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let pd = PixelData::new(self.x as u16, self.y as u16, self.r, self.g, self.b);
        pd.to_bytes()
    }

    /// Convert to PixelData for protocol encoding
    pub fn to_pixel_data(&self) -> PixelData {
        PixelData::new(self.x as u16, self.y as u16, self.r, self.g, self.b)
    }

    /// Create from PixelData
    pub fn from_pixel_data(pd: &PixelData) -> Self {
        Self {
            x: pd.x as u32,
            y: pd.y as u32,
            r: pd.r,
            g: pd.g,
            b: pd.b,
        }
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

/// Pixel info response (with history)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PixelInfo {
    pub x: i32,
    pub y: i32,
    pub current: Option<PixelState>,
    pub history: Vec<PixelHistoryEntry>,
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

