//! Kind 5: GeoMarker Specification
//!
//! GeoMarkers are used for embedding geographic coordinates and location-based
//! messages on Bitcoin. They power applications like Anchor Places.
//!
//! ## Payload Format
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                     GEOMARKER PAYLOAD                           │
//! ├────────────┬────────────┬────────────┬────────────┬─────────────┤
//! │ category   │  latitude  │ longitude  │  msg_len   │   message   │
//! │   (u8)     │   (f32)    │   (f32)    │   (u8)     │   (utf8)    │
//! │  1 byte    │  4 bytes   │  4 bytes   │  1 byte    │  variable   │
//! └────────────┴────────────┴────────────┴────────────┴─────────────┘
//! ```
//!
//! Total header: 10 bytes + message
//!
//! ## Ownership Rule
//!
//! The first marker at any exact coordinate "owns" that location. Subsequent
//! markers at the same coordinates are automatically converted to replies.
//!
//! ## Example
//!
//! ```rust,ignore
//! use anchor_specs::geomarker::GeoMarkerSpec;
//! use anchor_specs::KindSpec;
//!
//! let spec = GeoMarkerSpec::new(1, 48.8566, 2.3522, "Eiffel Tower");
//! assert!(spec.validate().is_ok());
//! ```

use crate::error::{Result, SpecError};
use crate::validation::KindSpec;
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};

/// Maximum message length for OP_RETURN (80 - 6 protocol - 10 header = 64 bytes)
/// With Bitcoin Core v30+ supporting 100KB, this can be much larger
pub const MAX_OP_RETURN_MESSAGE: usize = 64;

/// Maximum message length for any carrier
pub const MAX_MESSAGE_LENGTH: usize = 255;

/// Header size: category(1) + lat(4) + lon(4) + msg_len(1) = 10 bytes
pub const HEADER_SIZE: usize = 10;

/// Category definitions for GeoMarkers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum MarkerCategory {
    /// Generic location marker
    General = 0,
    /// Merchant accepting Bitcoin
    BitcoinAccepted = 1,
    /// Bitcoin ATM location
    Atm = 2,
    /// Community gathering point
    Meetup = 3,
    /// Point of interest
    Landmark = 4,
    /// Hazard or caution
    Warning = 5,
    /// Application-defined category
    Custom(u8),
}

impl From<u8> for MarkerCategory {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::General,
            1 => Self::BitcoinAccepted,
            2 => Self::Atm,
            3 => Self::Meetup,
            4 => Self::Landmark,
            5 => Self::Warning,
            n => Self::Custom(n),
        }
    }
}

impl From<MarkerCategory> for u8 {
    fn from(category: MarkerCategory) -> Self {
        match category {
            MarkerCategory::General => 0,
            MarkerCategory::BitcoinAccepted => 1,
            MarkerCategory::Atm => 2,
            MarkerCategory::Meetup => 3,
            MarkerCategory::Landmark => 4,
            MarkerCategory::Warning => 5,
            MarkerCategory::Custom(n) => n,
        }
    }
}

/// GeoMarker specification (Kind 5)
///
/// Represents a geographic location with coordinates and a message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GeoMarkerSpec {
    /// Marker category (0-255)
    pub category: u8,
    /// Latitude (-90 to 90)
    pub latitude: f32,
    /// Longitude (-180 to 180)
    pub longitude: f32,
    /// Description text (max 255 bytes)
    pub message: String,
}

impl GeoMarkerSpec {
    /// Create a new GeoMarker spec
    pub fn new(category: u8, latitude: f32, longitude: f32, message: impl Into<String>) -> Self {
        Self {
            category,
            latitude,
            longitude,
            message: message.into(),
        }
    }

    /// Create with a typed category
    pub fn with_category(
        category: MarkerCategory,
        latitude: f32,
        longitude: f32,
        message: impl Into<String>,
    ) -> Self {
        Self::new(category.into(), latitude, longitude, message)
    }

    /// Get the category as a typed enum
    pub fn category_type(&self) -> MarkerCategory {
        self.category.into()
    }

    /// Check if the marker fits in OP_RETURN (legacy 80 bytes)
    pub fn fits_op_return_legacy(&self) -> bool {
        self.message.len() <= MAX_OP_RETURN_MESSAGE
    }

    /// Check if the marker fits in OP_RETURN (extended 100KB)
    pub fn fits_op_return(&self) -> bool {
        self.message.len() <= MAX_MESSAGE_LENGTH
    }

    /// Get the best carrier for this marker
    pub fn best_carrier(&self) -> CarrierType {
        // GeoMarkers are small, OP_RETURN is always sufficient
        CarrierType::OpReturn
    }

    /// Calculate the payload size in bytes
    pub fn payload_size(&self) -> usize {
        HEADER_SIZE + self.message.len().min(MAX_MESSAGE_LENGTH)
    }
}

impl KindSpec for GeoMarkerSpec {
    const KIND_ID: u8 = 5; // Custom(5) in AnchorKind
    const KIND_NAME: &'static str = "GeoMarker";

    fn from_bytes(body: &[u8]) -> Result<Self> {
        if body.len() < HEADER_SIZE {
            return Err(SpecError::PayloadTooShort {
                expected: HEADER_SIZE,
                actual: body.len(),
            });
        }

        let category = body[0];
        let latitude = f32::from_be_bytes([body[1], body[2], body[3], body[4]]);
        let longitude = f32::from_be_bytes([body[5], body[6], body[7], body[8]]);
        let msg_len = body[9] as usize;

        if body.len() < HEADER_SIZE + msg_len {
            return Err(SpecError::PayloadTooShort {
                expected: HEADER_SIZE + msg_len,
                actual: body.len(),
            });
        }

        let message = String::from_utf8(body[HEADER_SIZE..HEADER_SIZE + msg_len].to_vec())?;

        // Validate coordinates during parsing
        if !(-90.0..=90.0).contains(&latitude) {
            return Err(SpecError::InvalidFormat(format!(
                "Latitude {} out of range [-90, 90]",
                latitude
            )));
        }
        if !(-180.0..=180.0).contains(&longitude) {
            return Err(SpecError::InvalidFormat(format!(
                "Longitude {} out of range [-180, 180]",
                longitude
            )));
        }

        Ok(Self {
            category,
            latitude,
            longitude,
            message,
        })
    }

    fn to_bytes(&self) -> Vec<u8> {
        let msg_bytes = self.message.as_bytes();
        let msg_len = msg_bytes.len().min(MAX_MESSAGE_LENGTH);

        let mut payload = Vec::with_capacity(HEADER_SIZE + msg_len);
        payload.push(self.category);
        payload.extend_from_slice(&self.latitude.to_be_bytes());
        payload.extend_from_slice(&self.longitude.to_be_bytes());
        payload.push(msg_len as u8);
        payload.extend_from_slice(&msg_bytes[..msg_len]);

        payload
    }

    fn validate(&self) -> Result<()> {
        // Validate latitude
        if !(-90.0..=90.0).contains(&self.latitude) {
            return Err(SpecError::InvalidFormat(format!(
                "Latitude {} must be between -90 and 90",
                self.latitude
            )));
        }

        // Validate longitude
        if !(-180.0..=180.0).contains(&self.longitude) {
            return Err(SpecError::InvalidFormat(format!(
                "Longitude {} must be between -180 and 180",
                self.longitude
            )));
        }

        // Validate message
        if self.message.is_empty() {
            return Err(SpecError::EmptyContent);
        }
        if self.message.len() > MAX_MESSAGE_LENGTH {
            return Err(SpecError::TextTooLong {
                max: MAX_MESSAGE_LENGTH,
                actual: self.message.len(),
            });
        }

        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        &[
            CarrierType::OpReturn,
            CarrierType::Inscription,
            CarrierType::Stamps,
            CarrierType::TaprootAnnex,
            CarrierType::WitnessData,
        ]
    }

    fn recommended_carrier() -> CarrierType {
        CarrierType::OpReturn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geomarker_roundtrip() {
        let original = GeoMarkerSpec::new(1, 48.8566, 2.3522, "Eiffel Tower");
        let bytes = original.to_bytes();
        let parsed = GeoMarkerSpec::from_bytes(&bytes).unwrap();

        assert_eq!(parsed.category, original.category);
        assert!((parsed.latitude - original.latitude).abs() < 0.0001);
        assert!((parsed.longitude - original.longitude).abs() < 0.0001);
        assert_eq!(parsed.message, original.message);
    }

    #[test]
    fn test_validation_valid() {
        let spec = GeoMarkerSpec::new(0, 40.7128, -74.0060, "New York City");
        assert!(spec.validate().is_ok());
    }

    #[test]
    fn test_validation_invalid_latitude() {
        let spec = GeoMarkerSpec::new(0, 100.0, 0.0, "Invalid");
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_validation_invalid_longitude() {
        let spec = GeoMarkerSpec::new(0, 0.0, 200.0, "Invalid");
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_validation_empty_message() {
        let spec = GeoMarkerSpec::new(0, 0.0, 0.0, "");
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_category_conversion() {
        assert_eq!(MarkerCategory::from(0), MarkerCategory::General);
        assert_eq!(MarkerCategory::from(1), MarkerCategory::BitcoinAccepted);
        assert_eq!(u8::from(MarkerCategory::Atm), 2);
    }

    #[test]
    fn test_payload_size() {
        let spec = GeoMarkerSpec::new(0, 0.0, 0.0, "Hello");
        assert_eq!(spec.payload_size(), HEADER_SIZE + 5);
    }

    #[test]
    fn test_fits_op_return() {
        let short = GeoMarkerSpec::new(0, 0.0, 0.0, "Short message");
        assert!(short.fits_op_return());

        // 255 chars is the max
        let max = GeoMarkerSpec::new(0, 0.0, 0.0, "A".repeat(255));
        assert!(max.fits_op_return());
    }

    #[test]
    fn test_supported_carriers() {
        assert!(GeoMarkerSpec::supported_carriers().contains(&CarrierType::OpReturn));
        assert!(GeoMarkerSpec::supported_carriers().contains(&CarrierType::WitnessData));
    }
}

