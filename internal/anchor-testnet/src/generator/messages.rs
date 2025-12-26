//! Message generator logic

use anyhow::Result;
use rand::seq::SliceRandom;
use rand::Rng;

use super::sample_data::{
    REPLY_PREFIXES, SAMPLE_CITIES, SAMPLE_DOMAINS, SAMPLE_IMAGES, SAMPLE_MESSAGES,
    SAMPLE_ORACLE_CATEGORIES, SAMPLE_ORACLE_NAMES, SAMPLE_ORACLE_SOURCES, SAMPLE_TOKEN_TICKERS,
};
use super::types::{CarrierType, CreateMessageRequest, MessageResult};
use super::wallet_client::WalletClient;
use crate::config::{MessageType, SharedConfig, SharedStats, TestnetConfig};

/// Tracked token info for mint/transfer/burn operations
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TrackedToken {
    pub ticker: String,
    pub deploy_txid: String,
    pub deploy_vout: u32,
    pub decimals: u8,
    /// UTXOs holding this token (txid, vout, amount)
    pub utxos: Vec<(String, u32, u128)>,
}

/// Tracked oracle info for attestations/events/disputes
#[derive(Debug, Clone)]
pub struct TrackedOracle {
    pub pubkey: [u8; 32],
    pub name: String,
    pub categories: i16,
    pub register_txid: String,
    pub register_vout: u32,
}

/// Tracked attestation for disputes
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TrackedAttestation {
    pub oracle_pubkey: [u8; 32],
    pub event_id: [u8; 32],
    pub txid: String,
    pub vout: u32,
}

/// Tracked prediction market for bet/resolve operations
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TrackedMarket {
    pub market_id: [u8; 32],
    pub question: String,
    pub resolution_block: u32,
    pub oracle_pubkey: [u8; 32],
    pub initial_liquidity: i64,
    pub created_txid: String,
    pub created_vout: u32,
    /// Number of bets placed on this market
    pub bet_count: u32,
    /// Whether the market has been resolved
    pub resolved: bool,
    /// Current simulated YES pool (for price calculation)
    pub yes_pool: i64,
    /// Current simulated NO pool
    pub no_pool: i64,
}

/// Message generator that interacts with the wallet service
pub struct MessageGenerator {
    wallet: WalletClient,
    /// History of created messages for threading
    message_history: Vec<(String, u32)>, // (txid, vout)
    /// History of deployed tokens for mint/transfer/burn
    token_history: Vec<TrackedToken>,
    /// History of registered oracles
    oracle_history: Vec<TrackedOracle>,
    /// History of attestations for disputes
    attestation_history: Vec<TrackedAttestation>,
    /// History of created markets for bet/resolve operations
    market_history: Vec<TrackedMarket>,
    /// Current simulated block height for lottery draws
    current_block: u32,
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
            token_history: Vec::new(),
            oracle_history: Vec::new(),
            attestation_history: Vec::new(),
            market_history: Vec::new(),
            current_block: 7000, // Start at a reasonable block height
            rng: rand::thread_rng(),
            config,
            stats,
        }
    }

    /// Increment the simulated block height
    pub fn advance_block(&mut self) {
        self.current_block += 1;
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
            MessageType::Token => self.create_token_deploy(carrier).await?,
            MessageType::TokenMint => {
                // Need at least one deployed token
                if self.token_history.is_empty() {
                    // Deploy first, then mint
                    self.create_token_deploy(carrier).await?
                } else {
                    self.create_token_mint(carrier).await?
                }
            }
            MessageType::TokenTransfer => {
                // Need at least one token with balance
                if self.token_history.iter().any(|t| !t.utxos.is_empty()) {
                    self.create_token_transfer(carrier).await?
                } else if !self.token_history.is_empty() {
                    self.create_token_mint(carrier).await?
                } else {
                    self.create_token_deploy(carrier).await?
                }
            }
            MessageType::TokenBurn => {
                // Need at least one token with balance
                if self.token_history.iter().any(|t| !t.utxos.is_empty()) {
                    self.create_token_burn(carrier).await?
                } else if !self.token_history.is_empty() {
                    self.create_token_mint(carrier).await?
                } else {
                    self.create_token_deploy(carrier).await?
                }
            }
            MessageType::Oracle => self.create_oracle(carrier).await?,
            MessageType::OracleAttestation => {
                // Need at least one registered oracle
                if self.oracle_history.is_empty() {
                    self.create_oracle(carrier).await?
                } else {
                    self.create_oracle_attestation(carrier).await?
                }
            }
            MessageType::OracleDispute => {
                // Need at least one attestation
                if self.attestation_history.is_empty() {
                    if self.oracle_history.is_empty() {
                        self.create_oracle(carrier).await?
                    } else {
                        self.create_oracle_attestation(carrier).await?
                    }
                } else {
                    self.create_oracle_dispute(carrier).await?
                }
            }
            MessageType::OracleEvent => self.create_oracle_event().await?,
            MessageType::Prediction => self.create_prediction(carrier).await?,
            MessageType::PredictionTicket => {
                // Need at least one market to place a bet on
                if self.market_history.is_empty() {
                    self.create_prediction(carrier).await?
                } else {
                    self.create_prediction_ticket(carrier).await?
                }
            }
            MessageType::PredictionDraw => {
                // Need at least one market with bets
                let has_market_with_bets = self
                    .market_history
                    .iter()
                    .any(|m| !m.resolved && m.bet_count > 0);

                if has_market_with_bets {
                    self.create_prediction_draw(carrier).await?
                } else if !self.market_history.is_empty() {
                    self.create_prediction_ticket(carrier).await?
                } else {
                    self.create_prediction(carrier).await?
                }
            }
        };

        // Advance block counter periodically
        if self.rng.gen_bool(0.2) {
            self.advance_block();
        }

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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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

        tracing::info!("Creating DNS record for: {} (with auto-lock)", full_domain);

        let request = CreateMessageRequest {
            kind: 10, // Custom(10) for DNS
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: true, // Auto-lock the domain UTXO
            domain_name: Some(full_domain.clone()),
            lock_for_token: false,
            token_ticker: None,
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
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
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

    /// Create a token deploy message (Kind 20, Op 0x01)
    async fn create_token_deploy(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let ticker = SAMPLE_TOKEN_TICKERS
            .choose(&mut self.rng)
            .unwrap_or(&"TEST");
        let suffix = self.rng.gen_range(1..10000);
        let full_ticker = format!("{}{}", ticker, suffix);

        let decimals: u8 = self.rng.gen_range(0..=8);
        let max_supply: u128 = self.rng.gen_range(1_000_000..21_000_000_000_000);
        let mint_limit: u128 = max_supply / 100; // 1% mint limit

        // Token Deploy payload format (matching anchor-specs)
        let mut data = Vec::new();
        data.push(0x01); // Operation: Deploy

        // Ticker length + ticker
        let ticker_bytes = full_ticker.as_bytes();
        data.push(ticker_bytes.len() as u8);
        data.extend_from_slice(ticker_bytes);

        // Decimals
        data.push(decimals);

        // Max supply (varint encoding)
        data.extend_from_slice(&encode_varint(max_supply));

        // Mint limit (varint encoding)
        data.extend_from_slice(&encode_varint(mint_limit));

        // Flags: OPEN_MINT | BURNABLE
        data.push(0x05);

        let body = hex::encode(&data);

        tracing::info!(
            "🪙 Deploying token: {} (decimals: {}, max_supply: {}) (with auto-lock)",
            full_ticker,
            decimals,
            max_supply
        );

        let request = CreateMessageRequest {
            kind: 20, // Token
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: true, // Auto-lock the token UTXO
            token_ticker: Some(full_ticker.clone()),
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Track the deployed token
        self.token_history.push(TrackedToken {
            ticker: full_ticker,
            deploy_txid: response.txid.clone(),
            deploy_vout: response.vout,
            decimals,
            utxos: Vec::new(),
        });

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Token,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a token mint message (Kind 20, Op 0x02)
    async fn create_token_mint(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Pick a random deployed token
        let token_idx = self.rng.gen_range(0..self.token_history.len());
        let token = &self.token_history[token_idx];
        let ticker = token.ticker.clone();
        let decimals = token.decimals;

        // Random mint amount (1 to 1M tokens)
        let base_amount: u128 = self.rng.gen_range(1..1_000_000);
        let amount = base_amount * 10u128.pow(decimals as u32);

        // Token Mint payload format
        let mut data = Vec::new();
        data.push(0x02); // Operation: Mint

        // Ticker length + ticker
        let ticker_bytes = ticker.as_bytes();
        data.push(ticker_bytes.len() as u8);
        data.extend_from_slice(ticker_bytes);

        // Amount (varint encoding)
        data.extend_from_slice(&encode_varint(amount));

        // Output index (0 = first output gets the tokens)
        data.push(0x00);

        let body = hex::encode(&data);

        tracing::info!(
            "🪙 Minting {} {} tokens (with auto-lock)",
            base_amount,
            ticker
        );

        let request = CreateMessageRequest {
            kind: 20, // Token
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: true, // Auto-lock the minted token UTXO
            token_ticker: Some(ticker.clone()),
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Track the minted tokens as a UTXO
        if let Some(token) = self.token_history.iter_mut().find(|t| t.ticker == ticker) {
            token
                .utxos
                .push((response.txid.clone(), response.vout, amount));
            // Keep max 10 UTXOs per token
            if token.utxos.len() > 10 {
                token.utxos.remove(0);
            }
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::TokenMint,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a token transfer message (Kind 20, Op 0x03)
    async fn create_token_transfer(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Find a token with UTXOs
        let tokens_with_utxos: Vec<_> = self
            .token_history
            .iter()
            .filter(|t| !t.utxos.is_empty())
            .collect();

        if tokens_with_utxos.is_empty() {
            // Fallback to mint
            return self.create_token_mint(carrier).await;
        }

        let token = tokens_with_utxos.choose(&mut self.rng).unwrap();
        let ticker = token.ticker.clone();
        let (input_txid, input_vout, input_amount) = token.utxos.last().cloned().unwrap();

        // Transfer a portion (10-90% of the UTXO)
        let transfer_percent = self.rng.gen_range(10..90) as u128;
        let transfer_amount = (input_amount * transfer_percent) / 100;

        // Token Transfer payload format
        let mut data = Vec::new();
        data.push(0x03); // Operation: Transfer

        // Ticker length + ticker
        let ticker_bytes = ticker.as_bytes();
        data.push(ticker_bytes.len() as u8);
        data.extend_from_slice(ticker_bytes);

        // Input reference (txid:vout)
        data.extend_from_slice(&hex::decode(&input_txid).unwrap_or_default());
        data.push(input_vout as u8);

        // Number of outputs
        data.push(0x02); // 2 outputs: transfer + change

        // Output 1: transfer amount to output 0
        data.extend_from_slice(&encode_varint(transfer_amount));
        data.push(0x00); // Output index 0

        // Output 2: change to output 1
        let change_amount = input_amount.saturating_sub(transfer_amount);
        data.extend_from_slice(&encode_varint(change_amount));
        data.push(0x01); // Output index 1

        let body = hex::encode(&data);

        tracing::info!(
            "🪙 Transferring {} {} tokens (from {} total) (with auto-lock)",
            transfer_amount,
            ticker,
            input_amount
        );

        let request = CreateMessageRequest {
            kind: 20, // Token
            body,
            body_is_hex: true,
            parent_txid: Some(input_txid.clone()),
            parent_vout: Some(input_vout as u8),
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: true, // Auto-lock the transfer outputs
            token_ticker: Some(ticker.clone()),
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Update token UTXOs
        if let Some(token) = self.token_history.iter_mut().find(|t| t.ticker == ticker) {
            // Remove the spent UTXO
            token
                .utxos
                .retain(|(txid, vout, _)| !(txid == &input_txid && *vout == input_vout));
            // Add the new UTXOs
            token
                .utxos
                .push((response.txid.clone(), 0, transfer_amount));
            if change_amount > 0 {
                token.utxos.push((response.txid.clone(), 1, change_amount));
            }
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::TokenTransfer,
            is_reply: false,
            parent_txid: Some(input_txid),
            parent_vout: Some(input_vout),
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a token burn message (Kind 20, Op 0x04)
    async fn create_token_burn(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Find a token with UTXOs
        let tokens_with_utxos: Vec<_> = self
            .token_history
            .iter()
            .filter(|t| !t.utxos.is_empty())
            .collect();

        if tokens_with_utxos.is_empty() {
            // Fallback to mint
            return self.create_token_mint(carrier).await;
        }

        let token = tokens_with_utxos.choose(&mut self.rng).unwrap();
        let ticker = token.ticker.clone();
        let (input_txid, input_vout, input_amount) = token.utxos.last().cloned().unwrap();

        // Burn a portion (10-50% of the UTXO)
        let burn_percent = self.rng.gen_range(10..50) as u128;
        let burn_amount = (input_amount * burn_percent) / 100;

        // Token Burn payload format
        let mut data = Vec::new();
        data.push(0x04); // Operation: Burn

        // Ticker length + ticker
        let ticker_bytes = ticker.as_bytes();
        data.push(ticker_bytes.len() as u8);
        data.extend_from_slice(ticker_bytes);

        // Input reference (txid:vout)
        data.extend_from_slice(&hex::decode(&input_txid).unwrap_or_default());
        data.push(input_vout as u8);

        // Burn amount
        data.extend_from_slice(&encode_varint(burn_amount));

        let body = hex::encode(&data);

        tracing::info!(
            "🔥 Burning {} {} tokens (from {} total) (with auto-lock for remaining)",
            burn_amount,
            ticker,
            input_amount
        );

        let remaining = input_amount.saturating_sub(burn_amount);

        let request = CreateMessageRequest {
            kind: 20, // Token
            body,
            body_is_hex: true,
            parent_txid: Some(input_txid.clone()),
            parent_vout: Some(input_vout as u8),
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: remaining > 0, // Only lock if there are remaining tokens
            token_ticker: if remaining > 0 {
                Some(ticker.clone())
            } else {
                None
            },
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Update token UTXOs
        if let Some(token) = self.token_history.iter_mut().find(|t| t.ticker == ticker) {
            // Remove the spent UTXO
            token
                .utxos
                .retain(|(txid, vout, _)| !(txid == &input_txid && *vout == input_vout));
            // Add the remaining tokens as new UTXO
            if remaining > 0 {
                token.utxos.push((response.txid.clone(), 0, remaining));
            }
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::TokenBurn,
            is_reply: false,
            parent_txid: Some(input_txid),
            parent_vout: Some(input_vout),
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create an oracle registration message (Kind 30)
    /// Format expected by indexer:
    /// [action u8] [pubkey 32 bytes] [name_len u16 BE] [name] [categories i16 BE] [stake i64 BE] [metadata...]
    async fn create_oracle(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        let oracle_name = SAMPLE_ORACLE_NAMES
            .choose(&mut self.rng)
            .unwrap_or(&"Default Oracle");

        let categories = SAMPLE_ORACLE_CATEGORIES
            .choose(&mut self.rng)
            .copied()
            .unwrap_or(2); // Default to crypto prices

        let source = SAMPLE_ORACLE_SOURCES
            .choose(&mut self.rng)
            .unwrap_or(&"BTC/USD");

        // Generate a random 32-byte pubkey for this oracle
        let mut oracle_pubkey = [0u8; 32];
        self.rng.fill(&mut oracle_pubkey);

        // Generate random stake amount (10k to 1M sats)
        let stake_sats: i64 = self.rng.gen_range(10_000..1_000_000);

        // Oracle registration format (matches indexer expectation)
        let mut data = Vec::new();

        // Action: 0 = register
        data.push(0x00);

        // Oracle pubkey (32 bytes)
        data.extend_from_slice(&oracle_pubkey);

        // Name length (u16 big-endian)
        let name_bytes = oracle_name.as_bytes();
        data.extend_from_slice(&(name_bytes.len() as u16).to_be_bytes());

        // Name
        data.extend_from_slice(name_bytes);

        // Categories (i16 big-endian)
        data.extend_from_slice(&(categories as i16).to_be_bytes());

        // Stake amount (i64 big-endian)
        data.extend_from_slice(&stake_sats.to_be_bytes());

        // Metadata (optional - add data source info)
        let metadata = format!("Providing {} data", source);
        data.extend_from_slice(metadata.as_bytes());

        let body = hex::encode(&data);

        tracing::info!(
            "Creating oracle registration: {} (categories: {}, stake: {} sats)",
            oracle_name,
            categories,
            stake_sats
        );

        let request = CreateMessageRequest {
            kind: 30, // Oracle
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Track the oracle for attestations/disputes
        self.oracle_history.push(TrackedOracle {
            pubkey: oracle_pubkey,
            name: oracle_name.to_string(),
            categories: categories as i16,
            register_txid: response.txid.clone(),
            register_vout: response.vout,
        });

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Oracle,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create an oracle attestation message (Kind 31)
    /// Format expected by indexer:
    /// [category u8] [event_id 32 bytes] [attestation_block i64 BE] [outcome_len u16 BE] [outcome_data] [schnorr_sig 64 bytes]
    async fn create_oracle_attestation(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Pick a random oracle from history
        let oracle = self
            .oracle_history
            .choose(&mut self.rng)
            .cloned()
            .expect("Oracle history should not be empty");

        // Generate a random event ID
        let mut event_id = [0u8; 32];
        self.rng.fill(&mut event_id);

        // Category from the oracle's registered categories
        let category: u8 = oracle.categories as u8;

        // Attestation block (simulated as current + random)
        let attestation_block: i64 = self.rng.gen_range(1000..10000);

        // Generate outcome data (simulated price data)
        let outcome_data = format!(
            "{{\"price\":{},\"timestamp\":{}}}",
            self.rng.gen_range(10000..100000),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        );
        let outcome_bytes = outcome_data.as_bytes();

        // Generate a fake Schnorr signature (64 bytes)
        let mut schnorr_sig = [0u8; 64];
        self.rng.fill(&mut schnorr_sig);

        // Build attestation body
        let mut data = Vec::new();

        // Category (1 byte)
        data.push(category);

        // Event ID (32 bytes)
        data.extend_from_slice(&event_id);

        // Attestation block (8 bytes, big-endian)
        data.extend_from_slice(&attestation_block.to_be_bytes());

        // Outcome length (2 bytes, big-endian)
        data.extend_from_slice(&(outcome_bytes.len() as u16).to_be_bytes());

        // Outcome data
        data.extend_from_slice(outcome_bytes);

        // Schnorr signature (64 bytes)
        data.extend_from_slice(&schnorr_sig);

        let body = hex::encode(&data);

        tracing::info!(
            "Creating oracle attestation: oracle={}, event_id={}",
            oracle.name,
            hex::encode(&event_id[..8])
        );

        let request = CreateMessageRequest {
            kind: 31, // OracleAttestation
            body,
            body_is_hex: true,
            parent_txid: Some(oracle.register_txid.clone()),
            parent_vout: Some(oracle.register_vout as u8),
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Track for disputes
        self.attestation_history.push(TrackedAttestation {
            oracle_pubkey: oracle.pubkey,
            event_id,
            txid: response.txid.clone(),
            vout: response.vout,
        });

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::OracleAttestation,
            is_reply: false,
            parent_txid: Some(oracle.register_txid),
            parent_vout: Some(oracle.register_vout),
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create an oracle dispute message (Kind 32)
    /// Format: [attestation_txid 32 bytes] [attestation_vout u16 BE] [reason u8] [stake i64 BE] [evidence...]
    async fn create_oracle_dispute(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Pick a random attestation to dispute
        let attestation = self
            .attestation_history
            .choose(&mut self.rng)
            .cloned()
            .expect("Attestation history should not be empty");

        // Dispute reasons
        let reasons: [u8; 4] = [1, 2, 3, 4]; // 1=incorrect, 2=premature, 3=invalid sig, 4=not authorized
        let reason = *reasons.choose(&mut self.rng).unwrap_or(&1);

        // Stake for dispute
        let stake: i64 = self.rng.gen_range(5000..50000);

        // Generate disputer pubkey
        let mut disputer_pubkey = [0u8; 32];
        self.rng.fill(&mut disputer_pubkey);

        // Evidence (optional text)
        let evidence = format!(
            "Dispute reason: {}",
            match reason {
                1 => "Incorrect outcome reported",
                2 => "Attestation made before event resolution",
                3 => "Invalid Schnorr signature",
                4 => "Oracle not authorized for this category",
                _ => "Unknown",
            }
        );

        // Parse attestation txid to bytes
        let attestation_txid_bytes =
            hex::decode(&attestation.txid).unwrap_or_else(|_| vec![0u8; 32]);

        // Build dispute body
        let mut data = Vec::new();

        // Disputer pubkey (32 bytes)
        data.extend_from_slice(&disputer_pubkey);

        // Attestation txid (32 bytes)
        if attestation_txid_bytes.len() >= 32 {
            data.extend_from_slice(&attestation_txid_bytes[..32]);
        } else {
            data.extend_from_slice(&attestation_txid_bytes);
            data.extend_from_slice(&vec![0u8; 32 - attestation_txid_bytes.len()]);
        }

        // Attestation vout (2 bytes, big-endian)
        data.extend_from_slice(&(attestation.vout as u16).to_be_bytes());

        // Reason (1 byte)
        data.push(reason);

        // Stake (8 bytes, big-endian)
        data.extend_from_slice(&stake.to_be_bytes());

        // Evidence
        data.extend_from_slice(evidence.as_bytes());

        let body = hex::encode(&data);

        tracing::info!(
            "Creating oracle dispute: attestation={}, reason={}, stake={}",
            &attestation.txid[..16],
            reason,
            stake
        );

        let request = CreateMessageRequest {
            kind: 32, // OracleDispute
            body,
            body_is_hex: true,
            parent_txid: Some(attestation.txid.clone()),
            parent_vout: Some(attestation.vout as u8),
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::OracleDispute,
            is_reply: false,
            parent_txid: Some(attestation.txid),
            parent_vout: Some(attestation.vout),
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create an oracle event request via API (not a blockchain transaction)
    async fn create_oracle_event(&mut self) -> Result<MessageResult> {
        // Categories to choose from
        let categories = [1, 2, 4, 8, 16, 32]; // Block, Prices, Sports, Weather, Elections, Random
        let category = *categories.choose(&mut self.rng).unwrap_or(&2);

        // Generate random event descriptions based on category
        let descriptions = match category {
            1 => vec![
                "What will be the block height at midnight UTC?",
                "Will a block larger than 2MB be mined today?",
                "How many transactions in the next block?",
            ],
            2 => vec![
                "What will be BTC price at 00:00 UTC tomorrow?",
                "Will ETH cross $5000 this week?",
                "What will be the BTC dominance percentage?",
            ],
            4 => vec![
                "Who will win the World Cup final?",
                "Total goals in today's match?",
                "Will team A score in first half?",
            ],
            8 => vec![
                "Maximum temperature in NYC tomorrow?",
                "Will it rain in London on Friday?",
                "Minimum temperature in Tokyo next week?",
            ],
            16 => vec![
                "Who will win the 2024 presidential election?",
                "Will candidate X get more than 50% votes?",
                "Voter turnout percentage prediction?",
            ],
            _ => vec![
                "Random outcome A or B?",
                "Roll a dice: what number?",
                "Flip a coin: heads or tails?",
            ],
        };

        let description = descriptions
            .choose(&mut self.rng)
            .unwrap_or(&"What will happen?")
            .to_string();

        // Resolution block (within next 100-1000 blocks)
        let resolution_block: i32 = self.rng.gen_range(100..1000);

        // Bounty (1000-100000 sats)
        let bounty_sats: i64 = self.rng.gen_range(1000..100000);

        // Call the anchor-oracles API to create the event
        let oracles_api_url = std::env::var("ORACLES_API_URL")
            .unwrap_or_else(|_| "http://app-oracles-backend:3701".to_string());

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/api/events/request", oracles_api_url))
            .json(&serde_json::json!({
                "category": category,
                "description": description,
                "resolution_block": resolution_block,
                "bounty_sats": bounty_sats,
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Failed to create event request: {} - {}",
                status,
                error_text
            ));
        }

        let result: serde_json::Value = response.json().await?;
        let event_id = result["event_id"].as_str().unwrap_or("unknown").to_string();

        tracing::info!(
            "Created oracle event request: id={}, category={}, bounty={} sats",
            &event_id[..16.min(event_id.len())],
            category,
            bounty_sats
        );

        // Return a fake MessageResult since this is an API call, not a tx
        Ok(MessageResult {
            txid: event_id,
            vout: 0,
            message_type: MessageType::OracleEvent,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::OpReturn, // Placeholder
        })
    }

    /// Create a lottery message (Kind 40 - LotteryCreate)
    /// Create a prediction market (Kind 40 - MarketCreate)
    /// Format expected by indexer:
    /// [market_id 32] [question_len 2 BE] [question var] [desc_len 2 BE] [desc var]
    /// [resolution_block 4 BE] [oracle_pubkey 32] [initial_liquidity 8 BE]
    async fn create_prediction(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        use super::sample_data::{SAMPLE_MARKET_DESCRIPTIONS, SAMPLE_MARKET_QUESTIONS};

        // Generate a random 32-byte market ID
        let mut market_id = [0u8; 32];
        self.rng.fill(&mut market_id);

        // Pick a random question
        let question = SAMPLE_MARKET_QUESTIONS
            .choose(&mut self.rng)
            .unwrap_or(&"Will this happen?")
            .to_string();

        // Pick a random description (80% chance)
        let description = if self.rng.gen_bool(0.8) {
            Some(
                SAMPLE_MARKET_DESCRIPTIONS
                    .choose(&mut self.rng)
                    .unwrap_or(&"No description")
                    .to_string(),
            )
        } else {
            None
        };

        // Resolution block: current + 20-100 blocks
        let resolution_block: u32 = self.current_block + self.rng.gen_range(20..100);

        // Random oracle pubkey (or use one from oracle_history if available)
        let oracle_pubkey = if !self.oracle_history.is_empty() && self.rng.gen_bool(0.7) {
            let oracle = self.oracle_history.choose(&mut self.rng).unwrap();
            oracle.pubkey
        } else {
            let mut pk = [0u8; 32];
            self.rng.fill(&mut pk);
            pk
        };

        // Initial liquidity: 1 billion units (standard AMM starting point)
        let initial_liquidity: i64 = 1_000_000_000;

        // Build market creation body
        let question_bytes = question.as_bytes();
        let desc_bytes = description.as_ref().map(|d| d.as_bytes()).unwrap_or(&[]);

        let mut data =
            Vec::with_capacity(32 + 2 + question_bytes.len() + 2 + desc_bytes.len() + 4 + 32 + 8);

        // Market ID (32 bytes)
        data.extend_from_slice(&market_id);

        // Question length (2 bytes, big-endian)
        data.extend_from_slice(&(question_bytes.len() as u16).to_be_bytes());

        // Question (variable)
        data.extend_from_slice(question_bytes);

        // Description length (2 bytes, big-endian)
        data.extend_from_slice(&(desc_bytes.len() as u16).to_be_bytes());

        // Description (variable)
        data.extend_from_slice(desc_bytes);

        // Resolution block (4 bytes, big-endian)
        data.extend_from_slice(&resolution_block.to_be_bytes());

        // Oracle pubkey (32 bytes)
        data.extend_from_slice(&oracle_pubkey);

        // Initial liquidity (8 bytes, big-endian)
        data.extend_from_slice(&initial_liquidity.to_be_bytes());

        let body = hex::encode(&data);

        tracing::info!(
            "📊 Creating market: \"{}\" resolves at block {}",
            question.chars().take(50).collect::<String>(),
            resolution_block
        );

        let request = CreateMessageRequest {
            kind: 40, // MarketCreate
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Track the created market for bet/resolve operations
        self.market_history.push(TrackedMarket {
            market_id,
            question,
            resolution_block,
            oracle_pubkey,
            initial_liquidity,
            created_txid: response.txid.clone(),
            created_vout: response.vout,
            bet_count: 0,
            resolved: false,
            yes_pool: initial_liquidity,
            no_pool: initial_liquidity,
        });

        // Keep max 20 markets in history
        if self.market_history.len() > 20 {
            self.market_history.remove(0);
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::Prediction,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a place bet message (Kind 41 - PlaceBet)
    /// Format expected by indexer:
    /// [market_id 32] [outcome 1] [amount_sats 8 BE] [min_shares 8 BE] [user_pubkey 33]
    async fn create_prediction_ticket(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Need at least one market to place a bet on
        if self.market_history.is_empty() {
            return self.create_prediction(carrier).await;
        }

        // Pick an open market (one that hasn't been resolved yet)
        let open_markets: Vec<_> = self
            .market_history
            .iter()
            .filter(|m| !m.resolved && m.resolution_block > self.current_block)
            .collect();

        if open_markets.is_empty() {
            return self.create_prediction(carrier).await;
        }

        let market = open_markets.choose(&mut self.rng).unwrap();
        let market_id = market.market_id;

        // Random outcome: 0=NO, 1=YES
        let outcome: u8 = self.rng.gen_range(0..2);
        let outcome_str = if outcome == 1 { "YES" } else { "NO" };

        // Bet amount: 1000-100000 sats
        let amount_sats: i64 = self.rng.gen_range(1_000..100_000);

        // Min shares: 0 (no slippage protection for testnet)
        let min_shares: i64 = 0;

        // Generate a random user pubkey (33 bytes for compressed pubkey)
        let mut user_pubkey = [0u8; 33];
        user_pubkey[0] = if self.rng.gen_bool(0.5) { 0x02 } else { 0x03 };
        self.rng.fill(&mut user_pubkey[1..]);

        // Build bet body
        let mut data = Vec::with_capacity(32 + 1 + 8 + 8 + 33);

        // Market ID (32 bytes)
        data.extend_from_slice(&market_id);

        // Outcome (1 byte)
        data.push(outcome);

        // Amount sats (8 bytes, big-endian)
        data.extend_from_slice(&amount_sats.to_be_bytes());

        // Min shares (8 bytes, big-endian)
        data.extend_from_slice(&min_shares.to_be_bytes());

        // User pubkey (33 bytes)
        data.extend_from_slice(&user_pubkey);

        let body = hex::encode(&data);

        tracing::info!(
            "🎯 Placing bet on market {}: {} for {} sats",
            hex::encode(&market_id[..8]),
            outcome_str,
            amount_sats
        );

        let request = CreateMessageRequest {
            kind: 41, // PlaceBet
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Update market bet count and simulated pools
        if let Some(market) = self
            .market_history
            .iter_mut()
            .find(|m| m.market_id == market_id)
        {
            market.bet_count += 1;
            // Simulate AMM pool changes
            if outcome == 1 {
                market.no_pool += amount_sats;
            } else {
                market.yes_pool += amount_sats;
            }
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::PredictionTicket,
            is_reply: false,
            parent_txid: None,
            parent_vout: None,
            carrier: CarrierType::from_u8(response.carrier),
        })
    }

    /// Create a market resolve message (Kind 42 - MarketResolve)
    /// Format expected by indexer:
    /// [market_id 32] [resolution 1] [oracle_pubkey 32] [schnorr_signature 64]
    async fn create_prediction_draw(&mut self, carrier: CarrierType) -> Result<MessageResult> {
        // Need at least one market with bets that can be resolved
        if self.market_history.is_empty() {
            return self.create_prediction(carrier).await;
        }

        // Find markets that are ready for resolution:
        // - Have at least one bet
        // - Not already resolved
        let ready_markets: Vec<_> = self
            .market_history
            .iter()
            .filter(|m| !m.resolved && m.bet_count > 0)
            .collect();

        if ready_markets.is_empty() {
            // No markets ready for resolution, place a bet first
            return self.create_prediction_ticket(carrier).await;
        }

        let market = ready_markets.choose(&mut self.rng).unwrap();
        let market_id = market.market_id;
        let oracle_pubkey = market.oracle_pubkey;

        // Random resolution: 0=NO, 1=YES
        // Slightly bias towards YES if YES pool is larger (more bets on YES = more likely to happen)
        let yes_pool = market.yes_pool as f64;
        let no_pool = market.no_pool as f64;
        let yes_prob = no_pool / (yes_pool + no_pool); // Price of YES
        let resolution: u8 = if self.rng.gen_bool(yes_prob.clamp(0.3, 0.7)) {
            1
        } else {
            0
        };
        let resolution_str = if resolution == 1 { "YES" } else { "NO" };

        // Generate a mock Schnorr signature (64 bytes)
        let mut schnorr_signature = [0u8; 64];
        self.rng.fill(&mut schnorr_signature);

        // Build resolve message body
        let mut data = Vec::with_capacity(32 + 1 + 32 + 64);

        // Market ID (32 bytes)
        data.extend_from_slice(&market_id);

        // Resolution (1 byte)
        data.push(resolution);

        // Oracle pubkey (32 bytes)
        data.extend_from_slice(&oracle_pubkey);

        // Schnorr signature (64 bytes)
        data.extend_from_slice(&schnorr_signature);

        let body = hex::encode(&data);

        tracing::info!(
            "⚖️ Resolving market {}: {}",
            hex::encode(&market_id[..8]),
            resolution_str
        );

        let request = CreateMessageRequest {
            kind: 42, // MarketResolve
            body,
            body_is_hex: true,
            parent_txid: None,
            parent_vout: None,
            carrier: Some(carrier as u8),
            lock_for_dns: false,
            domain_name: None,
            lock_for_token: false,
            token_ticker: None,
        };

        let response = self.wallet.send_create_message(&request).await?;

        // Mark market as resolved
        if let Some(market) = self
            .market_history
            .iter_mut()
            .find(|m| m.market_id == market_id)
        {
            market.resolved = true;
        }

        Ok(MessageResult {
            txid: response.txid,
            vout: response.vout,
            message_type: MessageType::PredictionDraw,
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

/// Encode a u128 value to LEB128 varint
fn encode_varint(mut value: u128) -> Vec<u8> {
    let mut bytes = Vec::new();
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
        }
        bytes.push(byte);
        if value == 0 {
            break;
        }
    }
    bytes
}
