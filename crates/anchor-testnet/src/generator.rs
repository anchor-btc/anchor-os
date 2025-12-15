//! Message generator for testnet

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
/// Includes 1x1 pixels (tiny, ~70 bytes) and a 16x16 Bitcoin icon (827 bytes)
const SAMPLE_IMAGES: &[(&str, &str)] = &[
    // 16x16 Bitcoin icon PNG (827 bytes) - from Bitcoin Core
    ("bitcoin", "89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000030249444154785e75935f689b5500c57ff77ef7cb9734b14b69dc0cddccb24ee69059edd6ceada373828f520404ec93802f453494591447652e7b1136b676137c338253a080742f054445541d0ad351d0c0e8ca2a13d7766dd224cdf7f75edb0045dd3cdcd773cfb9dcdfe13f1280dd9b6fcf5c3f3f5898ff60b0347f79a074fdfd4385deddc90c600382ff91045233e38787163e3c7eb5f9c971dffbf8b0f14a074df3a33e7fe152dff4ccdb0786801420b712ff692e4f0e9ec9775a058206c6ab12fa2e425858b104425a18a998bf174cec1f9b7d17a8035a0002682b4f1c2be63bf4a87157087c8fc06bb2bee3594c324bb2361bc5ddbb48e35ab079497861ff3b37c7817509a8a9933d032db3b786093caa1d4759eb3985f5f408ea89611ab9972c81b64c2b2f62775a8f7e36923b0228796c5f3a7da4bbed4d4c80c020e3ed24fd3fb1bb0ee1640f60c762c89d47a9ef388136068c4648c9c01e3536f058322d275fd9339c4972822884580a120fa384c60aaa98c622db7e398b539fa3fee4498287f6823120049d49f9dcc597b70fcb8e78d44fd850f87588028c0ed1ce36a2f4e344c26675e78be8c423c4dd3b282781b0dbc06800d51e377d121d08a210630c3a70716b2b34651a693b387f7d0b910be93cca5dc2360db013ad9fd146630cc8d5dafa4f3a0ac3d6f322977a472f61ff299452d877af11bf7d15ab718766e741b488c36690b40942c2e59afe59be7e65f1cabd7af435422005c48325acd532c2af52dbf72a6bcf9ca7696f47fdf105965f01bf8eef7b2cd5f55763534b9faaef6fae577e986b9e7ba127f93c2852b5dfa8dd9ed1815f95ba2d8bb3fc254eb54cbc3187712b04a14f181aaedd72cffd38d7ac6c81347b2657cc67ec514b00b164a81359dd8875f9e96639a5bd2a443e61a4f102c3ade5e0425f71a105d2bf50be713a57cc75da6f2825b09502d33a446148a80d7e68985f0e26facf2e6ca17cdf983e7f2d3bf47b3137bd32d9ed572f779bcaa5bd66f162b7bfd1707a6a247bdf981e38e7a7763999efdeea2adc78efd1d2afa773a56fc6ba0a3dbb9c07cef96fca8e63940fd069c40000000049454e44ae426082"),
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
}

/// Result of creating a message
#[derive(Debug)]
pub struct MessageResult {
    pub txid: String,
    pub vout: u32,
    pub is_reply: bool,
    pub is_image: bool,
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
}

impl MessageGenerator {
    /// Create a new generator
    pub fn new(wallet_url: &str) -> Self {
        Self {
            client: reqwest::Client::new(),
            wallet_url: wallet_url.to_string(),
            message_history: Vec::new(),
            rng: rand::thread_rng(),
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
        Ok(response.blocks)
    }

    /// Generate a random message (root, reply, or image) with random carrier
    pub async fn generate_message(&mut self) -> Result<MessageResult> {
        // Decide what type of message to create
        let roll: f64 = self.rng.gen();

        // Randomly select a carrier (mostly OP_RETURN, occasionally Stamps)
        let carrier = self.random_carrier();

        if roll < 0.15 {
            // 15% chance to create an image
            self.create_image(carrier).await
        } else if !self.message_history.is_empty() && roll < 0.60 {
            // 45% chance to reply (if we have history)
            self.create_reply(carrier).await
        } else {
            // Otherwise create a root text message
            self.create_root(carrier).await
        }
    }

    /// Select a random carrier type
    fn random_carrier(&mut self) -> CarrierType {
        // Weighted selection:
        // 30% OP_RETURN (default, most efficient, prunable)
        // 20% Stamps (permanent, unprunable)
        // 20% Inscription (Ordinals-style, witness discount)
        // 15% TaprootAnnex (witness data with annex, needs libre relay)
        // 15% WitnessData (witness data with Tapscript)
        let roll: f64 = self.rng.gen();

        if roll < 0.30 {
            CarrierType::OpReturn
        } else if roll < 0.50 {
            CarrierType::Stamps
        } else if roll < 0.70 {
            CarrierType::Inscription
        } else if roll < 0.85 {
            CarrierType::TaprootAnnex
        } else {
            CarrierType::WitnessData
        }
    }

    /// Create a root message (new thread)
    async fn create_root(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let body = self.random_message();

        let request = CreateMessageRequest {
            kind: 1, // Text
            body,
            body_is_hex: false,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.send_create_message(&request).await?;

        // Store in history
        self.message_history.push((response.txid.clone(), response.vout));

        // Keep history manageable
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }

        let actual_carrier = match response.carrier {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        };

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            is_reply: false,
            is_image: false,
            parent_txid: None,
            parent_vout: None,
            carrier: actual_carrier,
        })
    }

    /// Create a reply to an existing message
    async fn create_reply(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Pick a random parent from history
        let parent = self
            .message_history
            .choose(&mut self.rng)
            .cloned()
            .expect("History should not be empty");

        let body = self.random_reply();

        let request = CreateMessageRequest {
            kind: 1, // Text
            body,
            body_is_hex: false,
            parent_txid: Some(parent.0.clone()),
            parent_vout: Some(parent.1 as u8),
            carrier: Some(carrier as u8),
        };

        let response = self.send_create_message(&request).await?;

        // Store in history
        self.message_history.push((response.txid.clone(), response.vout));

        // Keep history manageable
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }

        let actual_carrier = match response.carrier {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        };

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            is_reply: true,
            is_image: false,
            parent_txid: Some(parent.0),
            parent_vout: Some(parent.1),
            carrier: actual_carrier,
        })
    }

    /// Create an image message
    async fn create_image(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Pick a random sample image
        let (color, hex_data) = SAMPLE_IMAGES
            .choose(&mut self.rng)
            .unwrap_or(&SAMPLE_IMAGES[0]);

        tracing::info!(
            "Creating {} pixel image message with {} carrier",
            color,
            carrier.as_str()
        );

        let request = CreateMessageRequest {
            kind: 4, // Image
            body: hex_data.to_string(),
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
        };

        let response = self.send_create_message(&request).await?;

        // Store in history (images can also be replied to)
        self.message_history.push((response.txid.clone(), response.vout));

        // Keep history manageable
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }

        let actual_carrier = match response.carrier {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        };

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            is_reply: false,
            is_image: true,
            parent_txid: None,
            parent_vout: None,
            carrier: actual_carrier,
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

    /// Generate a random message body
    fn random_message(&mut self) -> String {
        let base = SAMPLE_MESSAGES
            .choose(&mut self.rng)
            .unwrap_or(&"Hello, ANCHOR!");

        // Sometimes add a random number for variety
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
