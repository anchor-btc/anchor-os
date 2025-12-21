//! Indexer for Anchor Predictions messages from the blockchain

use anchor_core::{parse_output_script, AnchorKind};
use anyhow::Result;
use bitcoin::consensus::encode::deserialize;
use bitcoin::hashes::Hash;
use bitcoin::{Block, Transaction};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

use crate::config::Config;
use crate::db::Database;

/// Lottery create message parser
pub struct LotteryCreateBody {
    pub lottery_id: [u8; 32],
    pub lottery_type: u8,
    pub number_count: u8,
    pub number_max: u8,
    pub draw_block: u32,
    pub ticket_price_sats: i64,
    pub token_type: u8,
    pub oracle_pubkey: [u8; 32],
}

impl LotteryCreateBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 79 {
            return None;
        }

        let mut lottery_id = [0u8; 32];
        lottery_id.copy_from_slice(&body[0..32]);

        let lottery_type = body[32];
        let number_count = body[33];
        let number_max = body[34];
        
        let draw_block = u32::from_be_bytes([body[35], body[36], body[37], body[38]]);
        let ticket_price_sats = i64::from_be_bytes([
            body[39], body[40], body[41], body[42],
            body[43], body[44], body[45], body[46],
        ]);
        let token_type = body[47];
        
        let mut oracle_pubkey = [0u8; 32];
        oracle_pubkey.copy_from_slice(&body[48..80]);

        Some(Self {
            lottery_id,
            lottery_type,
            number_count,
            number_max,
            draw_block,
            ticket_price_sats,
            token_type,
            oracle_pubkey,
        })
    }
}

/// Lottery ticket message parser
pub struct LotteryTicketBody {
    pub lottery_id: [u8; 32],
    pub _number_count: u8,
    pub numbers: Vec<u8>,
    pub buyer_pubkey: [u8; 33],
    pub amount_paid: i64,
}

impl LotteryTicketBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 75 {
            return None;
        }

        let mut lottery_id = [0u8; 32];
        lottery_id.copy_from_slice(&body[0..32]);

        let number_count = body[32];
        if body.len() < 33 + number_count as usize + 33 + 8 {
            return None;
        }

        let numbers = body[33..33 + number_count as usize].to_vec();
        let offset = 33 + number_count as usize;

        let mut buyer_pubkey = [0u8; 33];
        buyer_pubkey.copy_from_slice(&body[offset..offset + 33]);

        let amount_paid = i64::from_be_bytes([
            body[offset + 33], body[offset + 34], body[offset + 35], body[offset + 36],
            body[offset + 37], body[offset + 38], body[offset + 39], body[offset + 40],
        ]);

        Some(Self {
            lottery_id,
            _number_count: number_count,
            numbers,
            buyer_pubkey,
            amount_paid,
        })
    }
}

/// Lottery draw message parser (oracle attestation)
pub struct LotteryDrawBody {
    pub lottery_id: [u8; 32],
    pub _draw_block_height: u32,
    pub _block_hash: [u8; 32],
    pub _number_count: u8,
    pub winning_numbers: Vec<u8>,
    pub _schnorr_signature: [u8; 64],
}

impl LotteryDrawBody {
    pub fn parse(body: &[u8]) -> Option<Self> {
        if body.len() < 133 {
            return None;
        }

        let mut lottery_id = [0u8; 32];
        lottery_id.copy_from_slice(&body[0..32]);

        let draw_block_height = u32::from_be_bytes([body[32], body[33], body[34], body[35]]);

        let mut block_hash = [0u8; 32];
        block_hash.copy_from_slice(&body[36..68]);

        let number_count = body[68];
        if body.len() < 69 + number_count as usize + 64 {
            return None;
        }

        let winning_numbers = body[69..69 + number_count as usize].to_vec();
        let offset = 69 + number_count as usize;

        let mut schnorr_signature = [0u8; 64];
        schnorr_signature.copy_from_slice(&body[offset..offset + 64]);

        Some(Self {
            lottery_id,
            _draw_block_height: draw_block_height,
            _block_hash: block_hash,
            _number_count: number_count,
            winning_numbers,
            _schnorr_signature: schnorr_signature,
        })
    }
}

pub struct Indexer {
    db: Arc<Database>,
    rpc: Client,
}

impl Indexer {
    pub fn new(config: &Config, db: Arc<Database>) -> Result<Self> {
        let rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;

        Ok(Self { db, rpc })
    }

    pub async fn run(&self) -> Result<()> {
        tracing::info!("Starting Lottery indexer");

        loop {
            if let Err(e) = self.sync_blocks().await {
                tracing::error!("Indexer sync error: {}", e);
            }
            sleep(Duration::from_secs(5)).await;
        }
    }

    async fn sync_blocks(&self) -> Result<()> {
        let chain_height = self.rpc.get_block_count()? as i32;
        let mut last_height = self.db.get_last_block_height().await?;

        while last_height < chain_height {
            let target_height = last_height + 1;
            let block_hash = self.rpc.get_block_hash(target_height as u64)?;
            let block_hex = self.rpc.get_block_hex(&block_hash)?;
            let block_bytes = hex::decode(&block_hex)?;
            let block: Block = deserialize(&block_bytes)?;

            self.process_block(&block, target_height).await?;
            self.db.update_last_block(&block_hash[..], target_height).await?;

            last_height = target_height;
            if target_height % 100 == 0 {
                tracing::info!("Indexed block {}/{}", target_height, chain_height);
            }
        }

        Ok(())
    }

    async fn process_block(&self, block: &Block, height: i32) -> Result<()> {
        for tx in &block.txdata {
            self.process_transaction(tx, height).await?;
        }
        Ok(())
    }

    async fn process_transaction(&self, tx: &Transaction, height: i32) -> Result<()> {
        let txid_bytes = tx.compute_txid().to_byte_array();

        for (vout, output) in tx.output.iter().enumerate() {
            if let Some(msg) = parse_output_script(&output.script_pubkey) {
                match msg.kind {
                    AnchorKind::LotteryCreate => {
                        if let Some(create) = LotteryCreateBody::parse(&msg.body) {
                            // Get creator from transaction inputs (simplified)
                            let creator = [0u8; 33]; // Would extract from input

                            let _ = self.db.insert_lottery(
                                &create.lottery_id,
                                create.lottery_type as i32,
                                create.number_count as i32,
                                create.number_max as i32,
                                create.draw_block as i32,
                                create.ticket_price_sats,
                                create.token_type as i32,
                                &create.oracle_pubkey,
                                &creator,
                                &txid_bytes,
                                Some(height),
                            ).await;
                            
                            tracing::info!(
                                "Indexed lottery creation: {} at block {}",
                                hex::encode(&create.lottery_id[..8]),
                                height
                            );
                        }
                    }
                    AnchorKind::LotteryTicket => {
                        if let Some(ticket) = LotteryTicketBody::parse(&msg.body) {
                            let _ = self.db.insert_ticket(
                                &ticket.lottery_id,
                                &txid_bytes,
                                vout as i32,
                                Some(height),
                                &ticket.buyer_pubkey,
                                &ticket.numbers,
                                ticket.amount_paid,
                            ).await;
                            
                            tracing::info!(
                                "Indexed ticket purchase for lottery {}",
                                hex::encode(&ticket.lottery_id[..8])
                            );
                        }
                    }
                    AnchorKind::LotteryDraw => {
                        if let Some(draw) = LotteryDrawBody::parse(&msg.body) {
                            // Update lottery with winning numbers
                            tracing::info!(
                                "Indexed lottery draw for {} with {} winning numbers",
                                hex::encode(&draw.lottery_id[..8]),
                                draw.winning_numbers.len()
                            );
                            // Would update lottery status and determine winners
                        }
                    }
                    AnchorKind::LotteryClaim => {
                        tracing::debug!("Indexed lottery claim at height {}", height);
                    }
                    _ => {}
                }
            }
        }

        Ok(())
    }
}

