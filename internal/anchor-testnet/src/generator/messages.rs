//! Message generator logic

use anyhow::Result;
use rand::seq::SliceRandom;
use rand::Rng;

use super::sample_data::{
    REPLY_PREFIXES, SAMPLE_CITIES, SAMPLE_DOMAINS, SAMPLE_IMAGES, SAMPLE_MESSAGES,
};
use super::types::{CarrierType, CreateMessageRequest, MessageResult};
use super::wallet_client::WalletClient;
use crate::config::{MessageType, SharedConfig, SharedStats, TestnetConfig};

/// Message generator that interacts with the wallet service
pub struct MessageGenerator {
    wallet: WalletClient,
    /// History of created messages for threading
    message_history: Vec<(String, u32)>, // (txid, vout)
    rng: rand::rngs::ThreadRng,
    config: SharedConfig,
    stats: SharedStats,
}

impl MessageGenerator {
    /// Create a new generator
    pub fn new(wallet_url: &str, config: SharedConfig, stats: SharedStats) -> Self {
        Self {
            wallet: WalletClient::new(wallet_url, stats.clone()),
            message_history: Vec::new(),
            rng: rand::thread_rng(),
            config,
            stats,
        }
    }

    /// Check if wallet service is healthy
    pub async fn health_check(&self) -> Result<()> {
        self.wallet.health_check().await
    }

    /// Get wallet balance
    pub async fn get_balance(&self) -> Result<f64> {
        self.wallet.get_balance().await
    }

    /// Mine blocks
    pub async fn mine_blocks(&self, count: u32) -> Result<Vec<String>> {
        self.wallet.mine_blocks(count).await
    }

    /// Get current config
    pub async fn get_config(&self) -> TestnetConfig {
        self.config.read().await.clone()
    }

    /// Generate a random message based on enabled types
    pub async fn generate_message(&mut self) -> Result<Option<MessageResult>> {
        let config = self.config.read().await.clone();

        // Check if paused
        if config.paused {
            return Ok(None);
        }

        // Get enabled types
        let enabled_types = config.enabled_types();
        if enabled_types.is_empty() {
            return Ok(None);
        }

        // Pick a random type
        let msg_type = enabled_types
            .choose(&mut self.rng)
            .copied()
            .unwrap_or(MessageType::Text);

        // Pick a random carrier based on weights
        let carrier = self.random_carrier(&config);

        // Generate based on type
        let result = match msg_type {
            MessageType::Text => {
                // 45% chance to reply if we have history
                if !self.message_history.is_empty() && self.rng.gen_bool(0.45) {
                    self.create_reply(carrier).await?
                } else {
                    self.create_text(carrier).await?
                }
            }
            MessageType::Pixel => self.create_pixel(carrier).await?,
            MessageType::Image => self.create_image(carrier).await?,
            MessageType::Map => self.create_map_marker(carrier).await?,
            MessageType::Dns => self.create_dns_record(carrier).await?,
            MessageType::Proof => self.create_proof(carrier).await?,
        };

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.increment_type(result.message_type);
            stats.increment_carrier(result.carrier as u8);
        }

        Ok(Some(result))
    }

    /// Select a random carrier type based on config weights
    fn random_carrier(&mut self, config: &TestnetConfig) -> CarrierType {
        let weights = config.carrier_weights();
        let roll: f64 = self.rng.gen();

        let mut cumulative = 0.0;
        for (i, weight) in weights.iter().enumerate() {
            cumulative += weight;
            if roll < cumulative {
                return CarrierType::from_u8(i as u8);
            }
        }

        CarrierType::OpReturn
    }

    /// Create a text message (Kind 1)
    async fn create_text(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let body = self.random_message();

        let request = CreateMessageRequest {
            kind: 1,
            body,
            body_is_hex: false,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;
        self.add_to_history(&response.txid, response.vout);

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Text,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a reply message (Kind 1 with parent)
    async fn create_reply(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let parent = self
            .message_history
            .choose(&mut self.rng)
            .cloned()
            .expect("History should not be empty");

        let body = self.random_reply();

        let request = CreateMessageRequest {
            kind: 1,
            body,
            body_is_hex: false,
            parent_txid: Some(parent.0.clone()),
            parent_vout: Some(parent.1 as u8),
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;
        self.add_to_history(&response.txid, response.vout);

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Text,
            is_reply: true,
            parent_txid: Some(parent.0),
            parent_vout: Some(parent.1),
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a pixel message (Kind 2)
    async fn create_pixel(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let x: u16 = self.rng.gen_range(0..1000);
        let y: u16 = self.rng.gen_range(0..1000);
        let r: u8 = self.rng.gen();
        let g: u8 = self.rng.gen();
        let b: u8 = self.rng.gen();

        // Encode pixel data as hex
        let mut data = Vec::with_capacity(7);
        data.extend_from_slice(&x.to_be_bytes());
        data.extend_from_slice(&y.to_be_bytes());
        data.push(r);
        data.push(g);
        data.push(b);

        let body = hex::encode(&data);

        tracing::info!(
            "Creating pixel at ({}, {}) with color #{:02x}{:02x}{:02x}",
            x,
            y,
            r,
            g,
            b
        );

        let request = CreateMessageRequest {
            kind: 2, // State/Pixel
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Pixel,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create an image message (Kind 4)
    async fn create_image(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let (color, hex_data) = SAMPLE_IMAGES
            .choose(&mut self.rng)
            .unwrap_or(&SAMPLE_IMAGES[0]);

        tracing::info!("Creating {} image message", color);

        let request = CreateMessageRequest {
            kind: 4, // Image
            body: hex_data.to_string(),
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;
        self.add_to_history(&response.txid, response.vout);

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Image,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a map marker message (Kind 5)
    async fn create_map_marker(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let (city, base_lat, base_lng) = SAMPLE_CITIES
            .choose(&mut self.rng)
            .unwrap_or(&SAMPLE_CITIES[0]);

        // Add some random offset to make unique locations
        let lat = (*base_lat as f32) + self.rng.gen_range(-0.1f32..0.1f32);
        let lng = (*base_lng as f32) + self.rng.gen_range(-0.1f32..0.1f32);
        let label = format!("{} #{}", city, self.rng.gen_range(1..1000));

        // GeoMarkerPayload format
        let category: u8 = self.rng.gen_range(1..=5);
        let mut data = Vec::new();
        data.push(category);
        data.extend_from_slice(&lat.to_be_bytes());
        data.extend_from_slice(&lng.to_be_bytes());
        data.push(label.len().min(255) as u8);
        data.extend_from_slice(label.as_bytes());

        let body = hex::encode(&data);

        tracing::info!("Creating map marker: {} at ({:.4}, {:.4})", label, lat, lng);

        let request = CreateMessageRequest {
            kind: 5, // Custom(5) for geo markers
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Map,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a DNS record message (Kind 10)
    async fn create_dns_record(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let domain = SAMPLE_DOMAINS.choose(&mut self.rng).unwrap_or(&"test");

        let suffix = self.rng.gen_range(1..10000);
        let full_domain = format!("{}{}.bit", domain, suffix);

        // DNS payload format
        let mut data = Vec::new();
        data.push(0x01); // Operation: Register
        data.push(full_domain.len() as u8);
        data.extend_from_slice(full_domain.as_bytes());

        // Add a TXT record
        let txt_value = "Generated by Anchor Testnet";
        data.push(4u8); // TXT record type
        data.extend_from_slice(&300u16.to_be_bytes()); // TTL
        data.push(txt_value.len() as u8);
        data.extend_from_slice(txt_value.as_bytes());

        let body = hex::encode(&data);

        tracing::info!("Creating DNS record for: {}", full_domain);

        let request = CreateMessageRequest {
            kind: 10, // Custom(10) for DNS
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Dns,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a proof of existence message (Kind 11)
    async fn create_proof(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Generate a random "file hash" (SHA-256)
        let mut hash = [0u8; 32];
        self.rng.fill(&mut hash);

        // Proof payload format
        let mut data = Vec::new();
        data.push(0x01); // Operation: Stamp
        data.push(0x01); // Algorithm: SHA-256
        data.extend_from_slice(&hash);

        // Add minimal metadata
        let filename = "testnet-generated.dat";
        let mime_type = "application/octet-stream";
        let file_size: u64 = self.rng.gen_range(1024..1048576);
        let description = "Generated by Anchor Testnet";

        data.push(filename.len() as u8);
        data.extend_from_slice(filename.as_bytes());
        data.push(mime_type.len() as u8);
        data.extend_from_slice(mime_type.as_bytes());
        data.extend_from_slice(&file_size.to_be_bytes());
        data.push(description.len() as u8);
        data.extend_from_slice(description.as_bytes());

        let body = hex::encode(&data);
        let hash_preview = hex::encode(&hash[..8]);

        tracing::info!("Creating proof of existence: {}...", hash_preview);

        let request = CreateMessageRequest {
            kind: 11, // Custom(11) for Proof
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.wallet.send_create_message(&request).await?;

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Proof,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Add message to history
    fn add_to_history(&mut self, txid: &str, vout: u32) {
        self.message_history.push((txid.to_string(), vout));
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }
    }

    /// Generate a random message body
    fn random_message(&mut self) -> String {
        let base = SAMPLE_MESSAGES
            .choose(&mut self.rng)
            .unwrap_or(&"Hello, ANCHOR!");

        if self.rng.gen_bool(0.3) {
            format!("{} #{}", base, self.rng.gen_range(1..1000))
        } else {
            base.to_string()
        }
    }

    /// Generate a random reply body
    fn random_reply(&mut self) -> String {
        let prefix = REPLY_PREFIXES.choose(&mut self.rng).unwrap_or(&"Reply: ");
        let message = SAMPLE_MESSAGES.choose(&mut self.rng).unwrap_or(&"Indeed!");

        format!("{}{}", prefix, message)
    }

    /// Generate a random delay between operations
    pub fn random_delay(&mut self, min_secs: u64, max_secs: u64) -> u64 {
        self.rng.gen_range(min_secs..=max_secs)
    }
}

