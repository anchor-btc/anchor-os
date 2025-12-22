//! Runtime configuration for the testnet generator

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Shared configuration state
pub type SharedConfig = Arc<RwLock<TestnetConfig>>;

/// Runtime configuration for the testnet generator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestnetConfig {
    // Timing
    pub min_interval_secs: u64,
    pub max_interval_secs: u64,
    pub blocks_per_cycle: u32,

    // Message types (enabled/disabled)
    pub enable_text: bool,   // Kind 1
    pub enable_pixel: bool,  // Kind 2
    pub enable_image: bool,  // Kind 4
    pub enable_map: bool,    // Kind 5
    pub enable_dns: bool,    // Kind 10
    pub enable_proof: bool,  // Kind 11

    // Carrier weights (0-100, will be normalized)
    pub weight_op_return: u8,
    pub weight_stamps: u8,
    pub weight_inscription: u8,
    pub weight_taproot_annex: u8,
    pub weight_witness_data: u8,

    // State
    pub paused: bool,
}

impl Default for TestnetConfig {
    fn default() -> Self {
        Self {
            // Timing defaults
            min_interval_secs: 3,
            max_interval_secs: 10,
            blocks_per_cycle: 1,

            // Enable text and image by default (original behavior)
            enable_text: true,
            enable_pixel: false,
            enable_image: true,
            enable_map: false,
            enable_dns: false,
            enable_proof: false,

            // Default carrier weights (matching original distribution)
            weight_op_return: 30,
            weight_stamps: 20,
            weight_inscription: 20,
            weight_taproot_annex: 15,
            weight_witness_data: 15,

            // Not paused by default
            paused: false,
        }
    }
}

impl TestnetConfig {
    /// Create config from environment variables
    pub fn from_env() -> Self {
        let mut config = Self::default();

        if let Ok(val) = std::env::var("MIN_INTERVAL_SECS") {
            if let Ok(v) = val.parse() {
                config.min_interval_secs = v;
            }
        }

        if let Ok(val) = std::env::var("MAX_INTERVAL_SECS") {
            if let Ok(v) = val.parse() {
                config.max_interval_secs = v;
            }
        }

        if let Ok(val) = std::env::var("BLOCKS_PER_CYCLE") {
            if let Ok(v) = val.parse() {
                config.blocks_per_cycle = v;
            }
        }

        config
    }

    /// Get list of enabled message types
    pub fn enabled_types(&self) -> Vec<MessageType> {
        let mut types = Vec::new();
        if self.enable_text {
            types.push(MessageType::Text);
        }
        if self.enable_pixel {
            types.push(MessageType::Pixel);
        }
        if self.enable_image {
            types.push(MessageType::Image);
        }
        if self.enable_map {
            types.push(MessageType::Map);
        }
        if self.enable_dns {
            types.push(MessageType::Dns);
        }
        if self.enable_proof {
            types.push(MessageType::Proof);
        }
        types
    }

    /// Get normalized carrier weights as floats (0.0-1.0)
    pub fn carrier_weights(&self) -> [f64; 5] {
        let total = self.weight_op_return as f64
            + self.weight_stamps as f64
            + self.weight_inscription as f64
            + self.weight_taproot_annex as f64
            + self.weight_witness_data as f64;

        if total == 0.0 {
            // Default to equal distribution
            return [0.2, 0.2, 0.2, 0.2, 0.2];
        }

        [
            self.weight_op_return as f64 / total,
            self.weight_stamps as f64 / total,
            self.weight_inscription as f64 / total,
            self.weight_taproot_annex as f64 / total,
            self.weight_witness_data as f64 / total,
        ]
    }
}

/// Message types that can be generated
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageType {
    Text,
    Pixel,
    Image,
    Map,
    Dns,
    Proof,
}

impl MessageType {
    /// Get the ANCHOR kind for this message type
    #[allow(dead_code)]
    pub fn kind(&self) -> u8 {
        match self {
            MessageType::Text => 1,
            MessageType::Pixel => 2,
            MessageType::Image => 4,
            MessageType::Map => 5,
            MessageType::Dns => 10,
            MessageType::Proof => 11,
        }
    }

    /// Get display name
    pub fn name(&self) -> &'static str {
        match self {
            MessageType::Text => "Text",
            MessageType::Pixel => "Pixel",
            MessageType::Image => "Image",
            MessageType::Map => "Map",
            MessageType::Dns => "DNS",
            MessageType::Proof => "Proof",
        }
    }
}

/// Statistics about generated messages
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GeneratorStats {
    pub total_messages: u64,
    pub total_blocks: u64,
    pub text_count: u64,
    pub pixel_count: u64,
    pub image_count: u64,
    pub map_count: u64,
    pub dns_count: u64,
    pub proof_count: u64,
    pub carrier_op_return: u64,
    pub carrier_stamps: u64,
    pub carrier_inscription: u64,
    pub carrier_taproot_annex: u64,
    pub carrier_witness_data: u64,
}

impl GeneratorStats {
    pub fn increment_type(&mut self, msg_type: MessageType) {
        self.total_messages += 1;
        match msg_type {
            MessageType::Text => self.text_count += 1,
            MessageType::Pixel => self.pixel_count += 1,
            MessageType::Image => self.image_count += 1,
            MessageType::Map => self.map_count += 1,
            MessageType::Dns => self.dns_count += 1,
            MessageType::Proof => self.proof_count += 1,
        }
    }

    pub fn increment_carrier(&mut self, carrier: u8) {
        match carrier {
            0 => self.carrier_op_return += 1,
            1 => self.carrier_inscription += 1,
            2 => self.carrier_stamps += 1,
            3 => self.carrier_taproot_annex += 1,
            4 => self.carrier_witness_data += 1,
            _ => {}
        }
    }

    pub fn increment_blocks(&mut self, count: u64) {
        self.total_blocks += count;
    }
}

/// Shared stats state
pub type SharedStats = Arc<RwLock<GeneratorStats>>;
