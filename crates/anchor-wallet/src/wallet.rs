//! Wallet operations using Bitcoin Core RPC

use anyhow::{Context, Result};
use bitcoin::{ScriptBuf, Txid};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use tracing::{debug, info};

use anchor_core::{AnchorKind, AnchorMessageBuilder};

use crate::config::Config;

/// UTXO information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    pub amount: f64,
    pub confirmations: u32,
}

/// Wallet balance information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub confirmed: f64,
    pub unconfirmed: f64,
    pub total: f64,
}

/// Created transaction result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatedTransaction {
    pub txid: String,
    pub hex: String,
    pub anchor_vout: u32,
}

/// The wallet service wrapping Bitcoin Core RPC
pub struct WalletService {
    rpc: Client,
    #[allow(dead_code)]
    wallet_name: String,
}

impl WalletService {
    /// Create a new wallet service
    pub fn new(config: &Config) -> Result<Self> {
        let rpc = Client::new(
            &config.bitcoin_rpc_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )
        .context("Failed to connect to Bitcoin RPC")?;

        // Verify connection
        let blockchain_info = rpc.get_blockchain_info()?;
        info!(
            "Connected to Bitcoin node: chain={}, blocks={}",
            blockchain_info.chain, blockchain_info.blocks
        );

        // Try to load or create wallet
        let wallet_name = config.wallet_name.clone();
        
        // First, check if wallet is already loaded by trying to get wallet info
        let wallet_url = format!("{}/wallet/{}", config.bitcoin_rpc_url, wallet_name);
        let test_rpc = Client::new(
            &wallet_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;
        
        match test_rpc.get_wallet_info() {
            Ok(_) => {
                info!("Wallet already loaded: {}", wallet_name);
            }
            Err(_) => {
                // Wallet not loaded, try to load it
                match rpc.load_wallet(&wallet_name) {
                    Ok(_) => {
                        info!("Loaded existing wallet: {}", wallet_name);
                    }
                    Err(_) => {
                        // Wallet doesn't exist, create it
                        info!("Creating new wallet: {}", wallet_name);
                        rpc.create_wallet(&wallet_name, None, None, None, None)?;
                    }
                }
            }
        }

        // Create wallet-specific RPC client
        let wallet_url = format!("{}/wallet/{}", config.bitcoin_rpc_url, wallet_name);
        let wallet_rpc = Client::new(
            &wallet_url,
            Auth::UserPass(config.bitcoin_rpc_user.clone(), config.bitcoin_rpc_password.clone()),
        )?;

        Ok(Self {
            rpc: wallet_rpc,
            wallet_name,
        })
    }

    /// Get wallet balance
    pub fn get_balance(&self) -> Result<Balance> {
        let balances = self.rpc.get_balances()?;
        
        let confirmed = balances.mine.trusted.to_btc();
        let unconfirmed = balances.mine.untrusted_pending.to_btc();
        
        Ok(Balance {
            confirmed,
            unconfirmed,
            total: confirmed + unconfirmed,
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self) -> Result<String> {
        let address = self.rpc.get_new_address(None, None)?;
        Ok(address.assume_checked().to_string())
    }

    /// List unspent outputs
    pub fn list_utxos(&self) -> Result<Vec<Utxo>> {
        let utxos = self.rpc.list_unspent(None, None, None, None, None)?;
        
        Ok(utxos
            .into_iter()
            .map(|u| Utxo {
                txid: u.txid.to_string(),
                vout: u.vout,
                amount: u.amount.to_btc(),
                confirmations: u.confirmations,
            })
            .collect())
    }

    /// Create and broadcast an ANCHOR message transaction
    pub fn create_anchor_transaction(
        &self,
        kind: u8,
        body: Vec<u8>,
        parent_txid: Option<String>,
        parent_vout: Option<u8>,
        additional_anchors: Vec<(String, u8)>,
    ) -> Result<CreatedTransaction> {
        // Build the ANCHOR message
        let mut builder = AnchorMessageBuilder::new().kind(AnchorKind::from(kind));

        // Add canonical parent if provided
        if let (Some(txid_str), Some(vout)) = (parent_txid, parent_vout) {
            let txid = Txid::from_str(&txid_str).context("Invalid parent txid")?;
            builder = builder.reply_to(&txid, vout);
        }

        // Add additional anchors
        for (txid_str, vout) in additional_anchors {
            let txid = Txid::from_str(&txid_str).context("Invalid anchor txid")?;
            builder = builder.add_anchor(&txid, vout);
        }

        // Set the body
        builder = builder.body(body);

        // Create the OP_RETURN script
        let anchor_script = builder.to_script();
        debug!("Created ANCHOR script: {} bytes", anchor_script.len());

        // Create the transaction using fundrawtransaction
        self.create_and_broadcast_tx(anchor_script)
    }

    /// Create a text message transaction
    pub fn create_text_message(
        &self,
        text: &str,
        parent_txid: Option<String>,
        parent_vout: Option<u8>,
    ) -> Result<CreatedTransaction> {
        self.create_anchor_transaction(
            1, // Text kind
            text.as_bytes().to_vec(),
            parent_txid,
            parent_vout,
            Vec::new(),
        )
    }

    /// Create and broadcast a transaction with the given OP_RETURN script
    fn create_and_broadcast_tx(&self, op_return_script: ScriptBuf) -> Result<CreatedTransaction> {
        // Get a change address
        let change_address = self.rpc.get_new_address(None, None)?;
        let change_address = change_address.assume_checked();

        // Create raw transaction with OP_RETURN output
        let _inputs: Vec<bitcoincore_rpc::json::CreateRawTransactionInput> = vec![];
        
        // We need to use the RPC call directly for complex output handling
        let raw_tx: String = self.rpc.call(
            "createrawtransaction",
            &[
                serde_json::json!([]),
                serde_json::json!([
                    { "data": hex::encode(extract_op_return_data(&op_return_script)) }
                ]),
            ],
        )?;

        // Fund the transaction
        let funded: serde_json::Value = self.rpc.call(
            "fundrawtransaction",
            &[
                serde_json::json!(raw_tx),
                serde_json::json!({
                    "changeAddress": change_address.to_string(),
                    "feeRate": 0.00001
                }),
            ],
        )?;

        let funded_hex = funded["hex"].as_str().context("No hex in funded tx")?;

        // Sign the transaction
        let signed: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(funded_hex)],
        )?;

        if !signed["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("Transaction signing incomplete");
        }

        let signed_hex = signed["hex"].as_str().context("No hex in signed tx")?;

        // Broadcast the transaction
        let txid: String = self.rpc.call(
            "sendrawtransaction",
            &[serde_json::json!(signed_hex)],
        )?;

        debug!("Broadcast transaction: {}", txid);

        // Find the OP_RETURN output index
        let decoded: serde_json::Value = self.rpc.call(
            "decoderawtransaction",
            &[serde_json::json!(signed_hex)],
        )?;

        let mut anchor_vout = 0u32;
        if let Some(outputs) = decoded["vout"].as_array() {
            for (i, output) in outputs.iter().enumerate() {
                if let Some(script_type) = output["scriptPubKey"]["type"].as_str() {
                    if script_type == "nulldata" {
                        anchor_vout = i as u32;
                        break;
                    }
                }
            }
        }

        Ok(CreatedTransaction {
            txid,
            hex: signed_hex.to_string(),
            anchor_vout,
        })
    }

    /// Mine blocks (regtest only)
    pub fn mine_blocks(&self, count: u32) -> Result<Vec<String>> {
        let address = self.rpc.get_new_address(None, None)?;
        let hashes = self.rpc.generate_to_address(count as u64, &address.assume_checked())?;
        Ok(hashes.into_iter().map(|h| h.to_string()).collect())
    }

    /// Broadcast a raw transaction
    pub fn broadcast(&self, tx_hex: &str) -> Result<String> {
        let txid: String = self.rpc.call(
            "sendrawtransaction",
            &[serde_json::json!(tx_hex)],
        )?;
        Ok(txid)
    }
}

/// Extract data from an OP_RETURN script
fn extract_op_return_data(script: &ScriptBuf) -> Vec<u8> {
    let bytes = script.as_bytes();
    // Skip OP_RETURN (0x6a) and the push opcode
    if bytes.len() > 2 && bytes[0] == 0x6a {
        // Handle different push opcodes
        if bytes[1] <= 0x4b {
            // Direct push
            let len = bytes[1] as usize;
            if bytes.len() >= 2 + len {
                return bytes[2..2 + len].to_vec();
            }
        } else if bytes[1] == 0x4c {
            // OP_PUSHDATA1
            if bytes.len() > 3 {
                let len = bytes[2] as usize;
                if bytes.len() >= 3 + len {
                    return bytes[3..3 + len].to_vec();
                }
            }
        } else if bytes[1] == 0x4d {
            // OP_PUSHDATA2
            if bytes.len() > 4 {
                let len = u16::from_le_bytes([bytes[2], bytes[3]]) as usize;
                if bytes.len() >= 4 + len {
                    return bytes[4..4 + len].to_vec();
                }
            }
        }
    }
    bytes.to_vec()
}

