//! Data models for the AnchorMap API

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
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
    pub category: Option<i16>,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    100
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

/// Geo marker payload for parsing
#[derive(Debug, Clone)]
pub struct GeoMarkerPayload {
    pub category: u8,
    pub latitude: f32,
    pub longitude: f32,
    pub message: String,
}

impl GeoMarkerPayload {
    /// Parse a geo marker from binary payload
    /// Format: [category: u8][lat: f32][lng: f32][msg_len: u8][message: utf8]
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 10 {
            return None;
        }

        let category = bytes[0];
        let latitude = f32::from_be_bytes([bytes[1], bytes[2], bytes[3], bytes[4]]);
        let longitude = f32::from_be_bytes([bytes[5], bytes[6], bytes[7], bytes[8]]);
        let msg_len = bytes[9] as usize;

        if bytes.len() < 10 + msg_len {
            return None;
        }

        let message = String::from_utf8(bytes[10..10 + msg_len].to_vec()).ok()?;

        // Validate coordinates
        if latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0 {
            return None;
        }

        Some(Self {
            category,
            latitude,
            longitude,
            message,
        })
    }

    /// Encode a geo marker to binary payload
    pub fn to_bytes(&self) -> Vec<u8> {
        let msg_bytes = self.message.as_bytes();
        let msg_len = msg_bytes.len().min(255) as u8;
        
        let mut payload = Vec::with_capacity(10 + msg_len as usize);
        payload.push(self.category);
        payload.extend_from_slice(&self.latitude.to_be_bytes());
        payload.extend_from_slice(&self.longitude.to_be_bytes());
        payload.push(msg_len);
        payload.extend_from_slice(&msg_bytes[..msg_len as usize]);
        
        payload
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geo_marker_payload_roundtrip() {
        let payload = GeoMarkerPayload {
            category: 1,
            latitude: 40.7128,
            longitude: -74.0060,
            message: "Hello from NYC!".to_string(),
        };

        let bytes = payload.to_bytes();
        let decoded = GeoMarkerPayload::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.category, payload.category);
        assert!((decoded.latitude - payload.latitude).abs() < 0.0001);
        assert!((decoded.longitude - payload.longitude).abs() < 0.0001);
        assert_eq!(decoded.message, payload.message);
    }

    #[test]
    fn test_geo_marker_payload_invalid_coords() {
        // Invalid latitude > 90
        let bytes = [
            0u8, // category
            0x42, 0xCA, 0x00, 0x00, // 100.0 (invalid lat)
            0x00, 0x00, 0x00, 0x00, // 0.0 lng
            4, // msg_len
            b't', b'e', b's', b't',
        ];
        assert!(GeoMarkerPayload::from_bytes(&bytes).is_none());
    }
}

