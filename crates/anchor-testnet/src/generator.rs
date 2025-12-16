//! Message generator for testnet

use crate::config::{GeneratorStats, MessageType, SharedConfig, SharedStats, TestnetConfig};
use anyhow::{Context, Result};
use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};

/// Sample messages for generating content
const SAMPLE_MESSAGES: &[&str] = &[
    "Hello, ANCHOR! 🔗",
    "First message on the Bitcoin blockchain!",
    "This is a test of the ANCHOR protocol.",
    "gm frens ☀️",
    "Building on Bitcoin, one message at a time.",
    "The future is decentralized.",
    "Stack sats, post anchors.",
    "21 million reasons to love Bitcoin.",
    "Proof of message: timestamped forever.",
    "Thread me up, Scotty! 🚀",
    "Another block, another message.",
    "On-chain social is the way.",
    "Can't stop, won't stop, posting.",
    "This message is immutable.",
    "Satoshi would be proud.",
    "HODL your messages on-chain.",
    "Wen mainnet?",
    "Testing 1, 2, 3...",
    "Bitcoin fixes this too.",
    "Anchored to the chain forever.",
];

const REPLY_PREFIXES: &[&str] = &[
    "Agreed! ",
    "Interesting take: ",
    "I think ",
    "Reply: ",
    "👍 ",
    "💯 ",
    "Following up: ",
    "Re: ",
    "Good point! ",
    "Adding to this: ",
];

/// Sample images as hex-encoded PNG
const SAMPLE_IMAGES: &[(&str, &str)] = &[
    // 16x16 Bitcoin icon PNG (827 bytes)
    ("bitcoin", "89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000030249444154785e75935f689b5500c57ff77ef7cb9734b14b69dc0cddccb24ee69059edd6ceada373828f520404ec93802f453494591447652e7b1136b676137c338253a080742f054445541d0ad351d0c0e8ca2a13d7766dd224cdf7f75edb0045dd3cdcd773cfb9dcdfe13f1280dd9b6fcf5c3f3f5898ff60b0347f79a074fdfd4385deddc90c600382ff91045233e38787163e3c7eb5f9c971dffbf8b0f14a074df3a33e7fe152dff4ccdb0786801420b712ff692e4f0e9ec9775a058206c6ab12fa2e425858b104425a18a998bf174cec1f9b7d17a8035a0002682b4f1c2be63bf4a87157087c8fc06bb2bee3594c324bb2361bc5ddbb48e35ab079497861ff3b37c7817509a8a9933d032db3b786093caa1d4759eb3985f5f408ea89611ab9972c81b64c2b2f62775a8f7e36923b0228796c5f3a7da4bded4d4c80c020e3ed24fd3fb1bb0ee1640f60c762c89d47a9ef388136068c4648c9c01e3536f058322d275fd9339c4972822884580a120fa384c60aaa98c622db7e398b539fa3fee4498287f6823120049d49f9dcc597b70fcb8e78d44fd850f87588028c0ed1ce36a2f4e344c26675e78be8c423c4dd3b282781b0dbc06800d51e377d121d08a210630c3a70716b2b34651a693b387f7d0b910be93cca5dc2360db013ad9fd146630cc8d5dafa4f3a0ac3d6f322977a472f61ff299452d877af11bf7d15ab718766e641b488c36690b40942c2e59afe59be7e65f1cabd7af435422005c48325acd532c2af52dbf72a6bcf9ca7696f47fdf105965f01bf8eef7b2cd5f55763534b9faaef6fae577e986b9e7ba127f93c2852b5dfa8dd9ed1815f95ba2d8bb3fc254eb54cbc3187712b04a14f181aaedd72cffd38d7ac6c81347b2657cc67ec514b00b164a81359dd8875f9e96639a5bd2a443e61a4f102c3ade5e0425f71a105d2bf50be713a57cc75da6f2825b09502d33a446148a80d7e68985f0e26facf2e6ca17cdf983e7f2d3bf47b3137bd32d9ed572f779bcaa5bd66f162b7bfd1707a6a247bdf981e38e7a7763999efdeea2adc78efd1d2afa773a56fc6ba0a3dbb9c07cef96fca8e63940fd069c40000000049454e44ae426082"),
    // 1x1 Orange pixel PNG (~70 bytes)
    ("orange", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da636cf8cf00000102010089d1c26a0000000049454e44ae426082"),
    // 1x1 Blue pixel PNG  
    ("blue", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364f8ff00000201010075e5a2c70000000049454e44ae426082"),
    // 1x1 Green pixel PNG
    ("green", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364fc6f00000102010023c7b8b00000000049454e44ae426082"),
    // 1x1 Purple pixel PNG
    ("purple", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6364dcff000001020100a9c16e680000000049454e44ae426082"),
    // 1x1 Yellow pixel PNG
    ("yellow", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da63fcfc0b00000201010048e92b6f0000000049454e44ae426082"),
    // 1x1 Red pixel PNG
    ("red", "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da63f8cf0000000201010078a834d00000000049454e44ae426082"),
];

/// Sample domain names for DNS
const SAMPLE_DOMAINS: &[&str] = &[
    "bitcoin",
    "satoshi",
    "anchor",
    "crypto",
    "web3",
    "defi",
    "nft",
    "hodl",
    "moon",
    "stack",
];

/// Sample city names for map markers
const SAMPLE_CITIES: &[(&str, f64, f64)] = &[
    ("New York", 40.7128, -74.0060),
    ("London", 51.5074, -0.1278),
    ("Tokyo", 35.6762, 139.6503),
    ("Paris", 48.8566, 2.3522),
    ("Sydney", -33.8688, 151.2093),
    ("São Paulo", -23.5505, -46.6333),
    ("Dubai", 25.2048, 55.2708),
    ("Singapore", 1.3521, 103.8198),
    ("Berlin", 52.5200, 13.4050),
    ("Toronto", 43.6532, -79.3832),
];

/// Carrier types for transactions
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CarrierType {
    OpReturn = 0,
    Inscription = 1,
    Stamps = 2,
    TaprootAnnex = 3,
    WitnessData = 4,
}

impl CarrierType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CarrierType::OpReturn => "op_return",
            CarrierType::Inscription => "inscription",
            CarrierType::Stamps => "stamps",
            CarrierType::TaprootAnnex => "taproot_annex",
            CarrierType::WitnessData => "witness_data",
        }
    }

    pub fn from_u8(val: u8) -> Self {
        match val {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        }
    }
}

/// Result of creating a message
#[derive(Debug)]
pub struct MessageResult {
    pub txid: String,
    pub vout: u32,
    pub message_type: MessageType,
    pub is_reply: bool,
    pub parent_txid: Option<String>,
    pub parent_vout: Option<u32>,
    pub carrier: CarrierType,
}

/// Response from wallet create-message endpoint
#[derive(Debug, Deserialize)]
struct CreateMessageResponse {
    txid: String,
    vout: u32,
    #[allow(dead_code)]
    hex: String,
    carrier: u8,
    #[allow(dead_code)]
    carrier_name: String,
}

/// Response from wallet mine endpoint
#[derive(Debug, Deserialize)]
struct MineResponse {
    blocks: Vec<String>,
}

/// Response from wallet balance endpoint
#[derive(Debug, Deserialize)]
struct BalanceResponse {
    #[allow(dead_code)]
    confirmed: f64,
    #[allow(dead_code)]
    unconfirmed: f64,
    total: f64,
}

/// Request for creating a message
#[derive(Debug, Serialize)]
struct CreateMessageRequest {
    kind: u8,
    body: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    body_is_hex: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_txid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_vout: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    carrier: Option<u8>,
}

/// Message generator that interacts with the wallet service
pub struct MessageGenerator {
    client: reqwest::Client,
    wallet_url: String,
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
            client: reqwest::Client::new(),
            wallet_url: wallet_url.to_string(),
            message_history: Vec::new(),
            rng: rand::thread_rng(),
            config,
            stats,
        }
    }

    /// Check if wallet service is healthy
    pub async fn health_check(&self) -> Result<()> {
        let url = format!("{}/health", self.wallet_url);
        self.client
            .get(&url)
            .send()
            .await
            .context("Failed to connect to wallet")?
            .error_for_status()
            .context("Wallet health check failed")?;
        Ok(())
    }

    /// Get wallet balance
    pub async fn get_balance(&self) -> Result<f64> {
        let url = format!("{}/wallet/balance", self.wallet_url);
        let response: BalanceResponse = self
            .client
            .get(&url)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(response.total)
    }

    /// Mine blocks
    pub async fn mine_blocks(&self, count: u32) -> Result<Vec<String>> {
        let url = format!("{}/wallet/mine", self.wallet_url);
        let response: MineResponse = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "count": count }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.increment_blocks(response.blocks.len() as u64);
        }

        Ok(response.blocks)
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

        let response = self.send_create_message(&request).await?;
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

        let response = self.send_create_message(&request).await?;
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
    /// Encodes: x (2 bytes) | y (2 bytes) | r | g | b
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

        let response = self.send_create_message(&request).await?;

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

        let response = self.send_create_message(&request).await?;
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
    /// Encodes: lat (f64) | lng (f64) | label (string)
    async fn create_map_marker(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let (city, base_lat, base_lng) = SAMPLE_CITIES
            .choose(&mut self.rng)
            .unwrap_or(&SAMPLE_CITIES[0]);

        // Add some random offset to make unique locations
        let lat = (*base_lat as f32) + self.rng.gen_range(-0.1f32..0.1f32);
        let lng = (*base_lng as f32) + self.rng.gen_range(-0.1f32..0.1f32);
        let label = format!("{} #{}", city, self.rng.gen_range(1..1000));

        // GeoMarkerPayload format (matches AnchorMap app):
        // category(1 u8) | latitude(4 f32) | longitude(4 f32) | msg_len(1 u8) | message(utf8)
        let category: u8 = self.rng.gen_range(1..=5); // Random category 1-5
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

        let response = self.send_create_message(&request).await?;

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
    /// Encodes based on BitDNS format: operation | name_len | name | [type | ttl | data_len | data]...
    async fn create_dns_record(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let domain = SAMPLE_DOMAINS
            .choose(&mut self.rng)
            .unwrap_or(&"test");

        let suffix = self.rng.gen_range(1..10000);
        // Domain must end with .bit
        let full_domain = format!("{}{}.bit", domain, suffix);

        // DNS payload format (matches BitDNS app):
        // operation(1) | name_len(1) | name | [record_type(1) | ttl(2) | data_len(1) | data]...
        let mut data = Vec::new();
        data.push(0x01); // Operation: Register (0x01)
        data.push(full_domain.len() as u8); // Name length
        data.extend_from_slice(full_domain.as_bytes()); // Name with .bit

        // Add a TXT record
        let txt_value = "Generated by Anchor Testnet";
        data.push(4u8); // TXT record type (4, not 16)
        data.extend_from_slice(&300u16.to_be_bytes()); // TTL: 300 seconds
        data.push(txt_value.len() as u8); // Data length (1 byte)
        data.extend_from_slice(txt_value.as_bytes()); // Value

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

        let response = self.send_create_message(&request).await?;

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
    /// Encodes: operation | algorithm | hash | metadata
    async fn create_proof(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Generate a random "file hash" (SHA-256)
        let mut hash = [0u8; 32];
        self.rng.fill(&mut hash);

        // Proof payload format (matches AnchorProof app):
        // operation(1) | algorithm(1) | hash(32) | metadata(...)
        // metadata = filename_len(1) + filename + mime_len(1) + mime + file_size(8) + desc_len(1) + desc
        let mut data = Vec::new();
        data.push(0x01); // Operation: Stamp (0x01)
        data.push(0x01); // Algorithm: SHA-256 (0x01)
        data.extend_from_slice(&hash);

        // Add minimal metadata
        let filename = "testnet-generated.dat";
        let mime_type = "application/octet-stream";
        let file_size: u64 = self.rng.gen_range(1024..1048576); // 1KB to 1MB
        let description = "Generated by Anchor Testnet";

        // filename
        data.push(filename.len() as u8);
        data.extend_from_slice(filename.as_bytes());
        // mime_type
        data.push(mime_type.len() as u8);
        data.extend_from_slice(mime_type.as_bytes());
        // file_size (8 bytes big-endian)
        data.extend_from_slice(&file_size.to_be_bytes());
        // description
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

        let response = self.send_create_message(&request).await?;

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

    /// Send create message request to wallet
    async fn send_create_message(&self, request: &CreateMessageRequest) -> Result<CreateMessageResponse> {
        let url = format!("{}/wallet/create-message", self.wallet_url);
        let response = self
            .client
            .post(&url)
            .json(request)
            .send()
            .await?
            .error_for_status()
            .context("Failed to create message")?
            .json()
            .await?;
        Ok(response)
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
        let prefix = REPLY_PREFIXES
            .choose(&mut self.rng)
            .unwrap_or(&"Reply: ");
        let message = SAMPLE_MESSAGES
            .choose(&mut self.rng)
            .unwrap_or(&"Indeed!");

        format!("{}{}", prefix, message)
    }

    /// Generate a random delay between operations
    pub fn random_delay(&mut self, min_secs: u64, max_secs: u64) -> u64 {
        self.rng.gen_range(min_secs..=max_secs)
    }
}
