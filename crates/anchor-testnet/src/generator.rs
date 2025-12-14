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

/// Result of creating a message
#[derive(Debug)]
pub struct MessageResult {
    pub txid: String,
    pub vout: u32,
    pub is_reply: bool,
    pub parent_txid: Option<String>,
    pub parent_vout: Option<u32>,
}

/// Response from wallet create-message endpoint
#[derive(Debug, Deserialize)]
struct CreateMessageResponse {
    txid: String,
    vout: u32,
    #[allow(dead_code)]
    hex: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_txid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_vout: Option<u8>,
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

    /// Generate a random message (root or reply)
    pub async fn generate_message(&mut self) -> Result<MessageResult> {
        // Decide whether to create a root or a reply
        let create_reply = !self.message_history.is_empty() && self.rng.gen_bool(0.6);

        if create_reply {
            self.create_reply().await
        } else {
            self.create_root().await
        }
    }

    /// Create a root message (new thread)
    async fn create_root(&mut self) -> Result<MessageResult> {
        let body = self.random_message();

        let request = CreateMessageRequest {
            kind: 1, // Text
            body,
            parent_txid: None,
            parent_vout: None,
        };

        let response = self.send_create_message(&request).await?;

        // Store in history
        self.message_history.push((response.txid.clone(), response.vout));

        // Keep history manageable
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
        })
    }

    /// Create a reply to an existing message
    async fn create_reply(&mut self) -> Result<MessageResult> {
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
            parent_txid: Some(parent.0.clone()),
            parent_vout: Some(parent.1 as u8),
        };

        let response = self.send_create_message(&request).await?;

        // Store in history
        self.message_history.push((response.txid.clone(), response.vout));

        // Keep history manageable
        if self.message_history.len() > 100 {
            self.message_history.remove(0);
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            is_reply: true,
            parent_txid: Some(parent.0),
            parent_vout: Some(parent.1),
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

