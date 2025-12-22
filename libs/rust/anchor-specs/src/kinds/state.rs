//! State kind specification (Kind 2)
//!
//! The State kind is used for state updates, primarily for the Canvas/Pixel application.
//! It contains a list of pixels with their coordinates and colors.
//!
//! ## Binary Format
//!
//! ```text
//! [num_pixels: u32][pixel_1]...[pixel_n]
//!
//! Each pixel:
//! [x: u16][y: u16][r: u8][g: u8][b: u8] = 7 bytes
//! ```
//!
//! ## Example
//!
//! ```rust,ignore
//! use anchor_specs::state::{StateSpec, PixelData};
//!
//! let spec = StateSpec::new(vec![
//!     PixelData::new(100, 200, 255, 0, 0),   // Red pixel at (100, 200)
//!     PixelData::new(101, 200, 0, 255, 0),   // Green pixel at (101, 200)
//! ]);
//!
//! let bytes = spec.to_bytes();
//! let decoded = StateSpec::from_bytes(&bytes)?;
//! ```

use crate::error::SpecError;
use crate::validation::KindSpec;
use anchor_core::carrier::CarrierType;
use serde::{Deserialize, Serialize};

/// Default canvas width
pub const DEFAULT_CANVAS_WIDTH: u32 = 4580;

/// Default canvas height
pub const DEFAULT_CANVAS_HEIGHT: u32 = 4580;

/// Maximum pixels per transaction via OP_RETURN (Bitcoin Core v30+ supports 100KB)
/// With 100KB limit: (100000 - 14 header) / 7 bytes per pixel ≈ 14,283 pixels
/// We use a conservative limit to leave room for protocol overhead
pub const MAX_PIXELS_PER_TX: usize = 14000;

/// Pixel data with coordinates and color
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PixelData {
    /// X coordinate (0 to canvas width - 1)
    pub x: u16,
    /// Y coordinate (0 to canvas height - 1)
    pub y: u16,
    /// Red color component (0-255)
    pub r: u8,
    /// Green color component (0-255)
    pub g: u8,
    /// Blue color component (0-255)
    pub b: u8,
}

impl PixelData {
    /// Create a new pixel
    pub fn new(x: u16, y: u16, r: u8, g: u8, b: u8) -> Self {
        Self { x, y, r, g, b }
    }

    /// Encode pixel to bytes (7 bytes)
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(7);
        bytes.extend_from_slice(&self.x.to_be_bytes());
        bytes.extend_from_slice(&self.y.to_be_bytes());
        bytes.push(self.r);
        bytes.push(self.g);
        bytes.push(self.b);
        bytes
    }

    /// Decode pixel from bytes
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 7 {
            return None;
        }
        let x = u16::from_be_bytes([bytes[0], bytes[1]]);
        let y = u16::from_be_bytes([bytes[2], bytes[3]]);
        let r = bytes[4];
        let g = bytes[5];
        let b = bytes[6];
        Some(Self { x, y, r, g, b })
    }

    /// Validate pixel coordinates against canvas dimensions
    pub fn validate(&self, width: u32, height: u32) -> bool {
        (self.x as u32) < width && (self.y as u32) < height
    }
}

/// State specification for canvas pixels
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StateSpec {
    /// List of pixels to update
    pub pixels: Vec<PixelData>,
}

impl StateSpec {
    /// Create a new state spec with the given pixels
    pub fn new(pixels: Vec<PixelData>) -> Self {
        Self { pixels }
    }

    /// Create an empty state spec
    pub fn empty() -> Self {
        Self { pixels: Vec::new() }
    }

    /// Add a pixel to the spec
    pub fn with_pixel(mut self, pixel: PixelData) -> Self {
        self.pixels.push(pixel);
        self
    }

    /// Add a pixel by coordinates and color
    pub fn add_pixel(&mut self, x: u16, y: u16, r: u8, g: u8, b: u8) {
        self.pixels.push(PixelData::new(x, y, r, g, b));
    }

    /// Get the number of pixels
    pub fn pixel_count(&self) -> usize {
        self.pixels.len()
    }

    /// Validate all pixels against canvas dimensions
    pub fn validate_coordinates(&self, width: u32, height: u32) -> Result<(), SpecError> {
        for pixel in &self.pixels {
            if !pixel.validate(width, height) {
                return Err(SpecError::InvalidFormat(format!(
                    "Pixel ({}, {}) out of bounds for canvas {}x{}",
                    pixel.x, pixel.y, width, height
                )));
            }
        }
        Ok(())
    }
}

/// Static array for supported carriers
static STATE_CARRIERS: &[CarrierType] = &[
    CarrierType::OpReturn,
    CarrierType::WitnessData,
    CarrierType::Inscription,
];

impl KindSpec for StateSpec {
    const KIND_ID: u8 = 2;
    const KIND_NAME: &'static str = "State";

    fn from_bytes(bytes: &[u8]) -> Result<Self, SpecError> {
        if bytes.len() < 4 {
            return Err(SpecError::PayloadTooShort {
                expected: 4,
                actual: bytes.len(),
            });
        }

        let num_pixels = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as usize;
        let expected_len = 4 + num_pixels * 7;

        if bytes.len() < expected_len {
            return Err(SpecError::PayloadTooShort {
                expected: expected_len,
                actual: bytes.len(),
            });
        }

        let mut pixels = Vec::with_capacity(num_pixels);
        for i in 0..num_pixels {
            let offset = 4 + i * 7;
            if let Some(pixel) = PixelData::from_bytes(&bytes[offset..offset + 7]) {
                pixels.push(pixel);
            } else {
                return Err(SpecError::InvalidFormat(format!(
                    "Failed to parse pixel at offset {}",
                    offset
                )));
            }
        }

        Ok(Self { pixels })
    }

    fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(4 + self.pixels.len() * 7);
        
        // Number of pixels (u32 big-endian)
        bytes.extend_from_slice(&(self.pixels.len() as u32).to_be_bytes());
        
        // Each pixel
        for pixel in &self.pixels {
            bytes.extend_from_slice(&pixel.to_bytes());
        }
        
        bytes
    }

    fn validate(&self) -> Result<(), SpecError> {
        if self.pixels.is_empty() {
            return Err(SpecError::EmptyContent);
        }

        if self.pixels.len() > MAX_PIXELS_PER_TX {
            return Err(SpecError::InvalidFormat(format!(
                "Too many pixels: {} (max {})",
                self.pixels.len(),
                MAX_PIXELS_PER_TX
            )));
        }

        // Validate against default canvas size
        self.validate_coordinates(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT)?;

        Ok(())
    }

    fn supported_carriers() -> &'static [CarrierType] {
        STATE_CARRIERS
    }

    fn recommended_carrier() -> CarrierType {
        CarrierType::OpReturn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pixel_encode_decode() {
        let pixel = PixelData::new(1234, 5678, 128, 64, 32);
        let bytes = pixel.to_bytes();
        let decoded = PixelData::from_bytes(&bytes).unwrap();
        
        assert_eq!(decoded.x, 1234);
        assert_eq!(decoded.y, 5678);
        assert_eq!(decoded.r, 128);
        assert_eq!(decoded.g, 64);
        assert_eq!(decoded.b, 32);
    }

    #[test]
    fn test_state_spec_encode_decode() {
        let spec = StateSpec::new(vec![
            PixelData::new(100, 200, 255, 0, 0),
            PixelData::new(300, 400, 0, 255, 0),
        ]);

        let bytes = spec.to_bytes();
        let decoded = StateSpec::from_bytes(&bytes).unwrap();

        assert_eq!(decoded.pixels.len(), 2);
        assert_eq!(decoded.pixels[0].x, 100);
        assert_eq!(decoded.pixels[0].y, 200);
        assert_eq!(decoded.pixels[0].r, 255);
        assert_eq!(decoded.pixels[1].x, 300);
        assert_eq!(decoded.pixels[1].y, 400);
        assert_eq!(decoded.pixels[1].g, 255);
    }

    #[test]
    fn test_validate_pixel_count() {
        let spec = StateSpec::empty();
        assert!(spec.validate().is_err());

        let too_many: Vec<PixelData> = (0..15)
            .map(|i| PixelData::new(i, 0, 0, 0, 0))
            .collect();
        let spec = StateSpec::new(too_many);
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_validate_coordinates() {
        let spec = StateSpec::new(vec![PixelData::new(5000, 100, 0, 0, 0)]);
        assert!(spec.validate().is_err());
    }

    #[test]
    fn test_kind_id() {
        assert_eq!(StateSpec::KIND_ID, 2);
        assert_eq!(StateSpec::KIND_NAME, "State");
    }
}

