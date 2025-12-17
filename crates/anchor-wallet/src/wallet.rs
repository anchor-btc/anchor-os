//! Wallet operations using Bitcoin Core RPC

use anyhow::{Context, Result};
use bitcoin::consensus::encode::serialize_hex;
use bitcoin::key::{TapTweak, UntweakedKeypair};
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::taproot::{LeafVersion, TaprootBuilder, TaprootSpendInfo};
use bitcoin::transaction::Version;
use bitcoin::{
    absolute::LockTime, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Txid,
    Witness, XOnlyPublicKey,
};
use bitcoincore_rpc::{Auth, Client, RpcApi};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use tracing::{debug, info, warn};

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
    pub carrier: u8,
    pub carrier_name: String,
}

/// Get carrier name from type
fn carrier_name(carrier: u8) -> &'static str {
    match carrier {
        0 => "op_return",
        1 => "inscription",
        2 => "stamps",
        3 => "taproot_annex",
        4 => "witness_data",
        _ => "unknown",
    }
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
                    Err(e) => {
                        let error_str = e.to_string();
                        // Check if wallet already exists but just needs to be loaded differently
                        if error_str.contains("already exists") || error_str.contains("already loaded") {
                            info!("Wallet already exists, trying alternative load: {}", wallet_name);
                            // Try unloading and reloading
                            let _ = rpc.unload_wallet(Some(&wallet_name));
                            match rpc.load_wallet(&wallet_name) {
                                Ok(_) => info!("Reloaded wallet: {}", wallet_name),
                                Err(e2) => {
                                    warn!("Could not reload wallet, continuing anyway: {}", e2);
                                }
                            }
                        } else {
                            // Wallet doesn't exist, create it
                            info!("Creating new wallet: {}", wallet_name);
                            rpc.create_wallet(&wallet_name, None, None, None, None)?;
                        }
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
        carrier: Option<u8>,
        fee_rate: u64, // sat/vbyte
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

        // Get the carrier type (default to OP_RETURN)
        let requested_carrier = carrier.unwrap_or(0);

        // Build the message for carrier encoding
        let message = anchor_core::ParsedAnchorMessage {
            kind: AnchorKind::from(kind),
            anchors: builder.get_anchors(),
            body: builder.get_body(),
        };

        // Use the carrier selector to encode with the appropriate carrier
        use anchor_core::carrier::{CarrierOutput, CarrierSelector, CarrierType};
        let selector = CarrierSelector::new();

        let carrier_type_enum = match requested_carrier {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        };

        // Get the carrier and encode
        if let Some(carrier_impl) = selector.get_carrier(carrier_type_enum) {
            match carrier_impl.encode(&message) {
                Ok(output) => {
                    match output {
                        CarrierOutput::OpReturn(script) => {
                            debug!("Created ANCHOR OP_RETURN script: {} bytes", script.len());
                            self.create_and_broadcast_tx_with_script(script, 0, fee_rate)
                        }
                        CarrierOutput::Stamps(scripts) => {
                            debug!("Creating Stamps transaction with {} multisig outputs", scripts.len());
                            self.create_and_broadcast_stamps_tx(scripts, fee_rate)
                        }
                        CarrierOutput::Inscription {
                            reveal_script,
                            content_type: _,
                        } => {
                            debug!("Creating Inscription transaction with reveal script");
                            self.create_and_broadcast_inscription_tx(reveal_script, fee_rate)
                        }
                        CarrierOutput::Annex(annex_data) => {
                            debug!("Creating Taproot Annex transaction with {} bytes", annex_data.len());
                            self.create_and_broadcast_annex_tx(annex_data, fee_rate)
                        }
                        CarrierOutput::WitnessData { chunks: _, script } => {
                            debug!("Creating WitnessData transaction with script {} bytes", script.len());
                            self.create_and_broadcast_witness_data_tx(script, fee_rate)
                        }
                    }
                }
                Err(e) => {
                    debug!("Carrier encode failed: {}, falling back to OP_RETURN", e);
                    let anchor_script = builder.to_script();
                    self.create_and_broadcast_tx_with_script(anchor_script, 0, fee_rate)
                }
            }
        } else {
            // Carrier not available, use OP_RETURN
            let anchor_script = builder.to_script();
            self.create_and_broadcast_tx_with_script(anchor_script, 0, fee_rate)
        }
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
            None, // Default carrier
            1,    // Default fee rate: 1 sat/vbyte
        )
    }

    /// Create and broadcast an ANCHOR message transaction with advanced options
    /// Supports required inputs (for UTXO-based token transfers) and custom outputs
    pub fn create_anchor_transaction_advanced(
        &self,
        kind: u8,
        body: Vec<u8>,
        parent_txid: Option<String>,
        parent_vout: Option<u8>,
        additional_anchors: Vec<(String, u8)>,
        carrier: Option<u8>,
        fee_rate: u64,
        required_inputs: Vec<(String, u32)>,
        custom_outputs: Vec<(String, u64)>,
    ) -> Result<CreatedTransaction> {
        // If no required inputs or custom outputs, use the simple version
        if required_inputs.is_empty() && custom_outputs.is_empty() {
            return self.create_anchor_transaction(
                kind,
                body,
                parent_txid,
                parent_vout,
                additional_anchors,
                carrier,
                fee_rate,
            );
        }

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

        // Get the carrier type (default to WitnessData for token transfers)
        let requested_carrier = carrier.unwrap_or(4);

        // Build the message for carrier encoding
        let message = anchor_core::ParsedAnchorMessage {
            kind: AnchorKind::from(kind),
            anchors: builder.get_anchors(),
            body: builder.get_body(),
        };

        // Use the carrier selector to encode with the appropriate carrier
        use anchor_core::carrier::{CarrierOutput, CarrierSelector, CarrierType};
        let selector = CarrierSelector::new();

        let carrier_type_enum = match requested_carrier {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::WitnessData,
        };

        // Get the carrier and encode
        if let Some(carrier_impl) = selector.get_carrier(carrier_type_enum) {
            match carrier_impl.encode(&message) {
                Ok(output) => {
                    match output {
                        CarrierOutput::WitnessData { chunks: _, script } => {
                            debug!("Creating advanced WitnessData transaction with {} required inputs and {} outputs", 
                                   required_inputs.len(), custom_outputs.len());
                            self.create_and_broadcast_advanced_witness_tx(
                                script,
                                fee_rate,
                                required_inputs,
                                custom_outputs,
                            )
                        }
                        CarrierOutput::OpReturn(script) => {
                            debug!("Creating advanced OP_RETURN transaction");
                            self.create_and_broadcast_advanced_tx(
                                script,
                                0,
                                fee_rate,
                                required_inputs,
                                custom_outputs,
                            )
                        }
                        _ => {
                            // For other carriers, fall back to WitnessData with advanced options
                            let fallback_carrier = selector.get_carrier(CarrierType::WitnessData).unwrap();
                            if let Ok(CarrierOutput::WitnessData { chunks: _, script }) = fallback_carrier.encode(&message) {
                                self.create_and_broadcast_advanced_witness_tx(
                                    script,
                                    fee_rate,
                                    required_inputs,
                                    custom_outputs,
                                )
                            } else {
                                anyhow::bail!("Failed to encode message for advanced transaction");
                            }
                        }
                    }
                }
                Err(e) => {
                    anyhow::bail!("Carrier encode failed: {}", e);
                }
            }
        } else {
            anyhow::bail!("Carrier not available");
        }
    }

    /// Create and broadcast an advanced transaction with required inputs and custom outputs
    fn create_and_broadcast_advanced_tx(
        &self,
        op_return_script: ScriptBuf,
        carrier_type: u8,
        fee_rate: u64,
        required_inputs: Vec<(String, u32)>,
        custom_outputs: Vec<(String, u64)>,
    ) -> Result<CreatedTransaction> {
        let change_address = self.rpc.get_new_address(None, None)?;
        let change_address = change_address.assume_checked();
        let fee_rate_btc_kb = fee_rate as f64 * 0.00001;

        // Build inputs array
        let inputs: Vec<serde_json::Value> = required_inputs
            .iter()
            .map(|(txid, vout)| serde_json::json!({ "txid": txid, "vout": vout }))
            .collect();

        // Build outputs - first the custom outputs, then OP_RETURN data
        let mut outputs_map: Vec<serde_json::Value> = custom_outputs
            .iter()
            .map(|(addr, value)| {
                let btc = *value as f64 / 100_000_000.0;
                serde_json::json!({ addr: btc })
            })
            .collect();

        // Add OP_RETURN
        outputs_map.push(serde_json::json!({ "data": hex::encode(extract_op_return_data(&op_return_script)) }));

        let raw_tx: String = self.rpc.call(
            "createrawtransaction",
            &[serde_json::json!(inputs), serde_json::json!(outputs_map)],
        )?;

        // Fund the transaction (will add additional inputs if needed and change output)
        let funded: serde_json::Value = self.rpc.call(
            "fundrawtransaction",
            &[
                serde_json::json!(raw_tx),
                serde_json::json!({
                    "changeAddress": change_address.to_string(),
                    "feeRate": fee_rate_btc_kb,
                }),
            ],
        )?;

        let funded_hex = funded["hex"].as_str().context("No hex in funded tx")?;

        // Sign the transaction
        let signed: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(funded_hex)],
        )?;

        let signed_hex = signed["hex"].as_str().context("No hex in signed tx")?;
        let complete = signed["complete"].as_bool().unwrap_or(false);

        if !complete {
            anyhow::bail!("Transaction signing incomplete");
        }

        // Broadcast
        let txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_hex)])?;

        // Find the OP_RETURN output index
        let decoded: serde_json::Value = self.rpc.call("decoderawtransaction", &[serde_json::json!(signed_hex)])?;
        let vouts = decoded["vout"].as_array().context("No vouts")?;
        let anchor_vout = vouts
            .iter()
            .position(|v| {
                v["scriptPubKey"]["type"].as_str() == Some("nulldata")
            })
            .unwrap_or(0) as u32;

        Ok(CreatedTransaction {
            txid,
            anchor_vout,
            hex: signed_hex.to_string(),
            carrier: carrier_type,
            carrier_name: "op_return".to_string(),
        })
    }

    /// Create and broadcast an advanced WitnessData transaction with required inputs and custom outputs
    /// Uses commit-reveal pattern to embed ANCHOR message while also spending required token UTXOs
    fn create_and_broadcast_advanced_witness_tx(
        &self,
        data_script: ScriptBuf,
        fee_rate: u64,
        required_inputs: Vec<(String, u32)>,
        custom_outputs: Vec<(String, u64)>,
    ) -> Result<CreatedTransaction> {
        use bitcoin::secp256k1::Secp256k1;
        use bitcoin::taproot::TaprootBuilder;

        let secp = Secp256k1::new();
        
        // Use a static internal key (no key path spend)
        let internal_key_bytes = hex::decode("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")?;
        let internal_key = bitcoin::secp256k1::PublicKey::from_slice(&internal_key_bytes)?;
        let internal_xonly = bitcoin::key::XOnlyPublicKey::from(internal_key);

        // Build taproot with the data script
        let tap_builder = TaprootBuilder::new()
            .add_leaf(0, data_script.clone())
            .context("Failed to add script to taproot")?;
        
        let taproot_info = tap_builder
            .finalize(&secp, internal_xonly)
            .map_err(|e| anyhow::anyhow!("Failed to finalize taproot: {:?}", e))?;

        let output_key = taproot_info.output_key();
        let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

        // Calculate fees
        let commit_vsize = 150u64;
        let reveal_vsize = 200u64 + (data_script.len() as u64) + (required_inputs.len() as u64 * 68) + (custom_outputs.len() as u64 * 34);
        let commit_fee = commit_vsize * fee_rate;
        let reveal_fee = reveal_vsize * fee_rate;
        
        // Commit amount needs to cover reveal fee plus outputs
        let total_output_value: u64 = custom_outputs.iter().map(|(_, v)| *v).sum::<u64>() + 546; // +546 for token change
        let commit_amount = reveal_fee + total_output_value + 1000; // Extra buffer

        // Step 1: Create commit transaction
        let required = commit_amount + commit_fee + 1000;
        let utxos = self.rpc.list_unspent(Some(1), None, None, None, None)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for advanced witness tx");
        }
        
        let mut selected_utxos = Vec::new();
        let mut total_input = 0u64;
        
        for utxo in &utxos {
            if total_input >= required {
                break;
            }
            total_input += utxo.amount.to_sat();
            selected_utxos.push(utxo);
        }

        if total_input < required {
            anyhow::bail!("Insufficient funds for advanced witness tx: need {} sats, have {}", required, total_input);
        }

        let commit_inputs: Vec<TxIn> = selected_utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        let change_address = self.rpc.get_new_address(None, None)?;
        let change_script = change_address.assume_checked().script_pubkey();

        let change_value = total_input - commit_amount - commit_fee;
        let commit_outputs = vec![
            TxOut {
                value: Amount::from_sat(commit_amount),
                script_pubkey: commit_script.clone(),
            },
            TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_script.clone(),
            },
        ];

        let commit_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: commit_inputs,
            output: commit_outputs,
        };

        let commit_hex = serialize_hex(&commit_tx);

        // Sign commit transaction
        let signed_commit: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(commit_hex)],
        )?;

        if !signed_commit["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("Advanced witness commit signing incomplete");
        }

        let signed_commit_hex = signed_commit["hex"].as_str().context("No hex in signed commit")?;

        // Broadcast commit
        let commit_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_commit_hex)])?;
        info!("Broadcast advanced witness commit tx: {}", commit_txid);

        let commit_txid_parsed = Txid::from_str(&commit_txid)?;

        // Step 2: Create reveal transaction with token inputs and custom outputs
        let token_change_address = self.rpc.get_new_address(None, None)?;
        let token_change_script = token_change_address.assume_checked().script_pubkey();

        // Build reveal inputs: first the commit output, then the token UTXOs
        let mut reveal_inputs: Vec<TxIn> = Vec::new();
        
        // Add commit output as first input
        reveal_inputs.push(TxIn {
            previous_output: OutPoint {
                txid: commit_txid_parsed,
                vout: 0,
            },
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(),
        });

        // Add required token inputs
        for (txid_str, vout) in &required_inputs {
            let txid = Txid::from_str(txid_str)?;
            reveal_inputs.push(TxIn {
                previous_output: OutPoint {
                    txid,
                    vout: *vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            });
        }

        // Build reveal outputs
        let mut reveal_outputs: Vec<TxOut> = Vec::new();
        
        // Output 0: Token change (back to wallet) - the anchor output
        reveal_outputs.push(TxOut {
            value: Amount::from_sat(546),
            script_pubkey: token_change_script,
        });

        // Remaining outputs: recipient addresses
        for (addr, value) in &custom_outputs {
            let addr_parsed = bitcoin::Address::from_str(addr)
                .map_err(|e| anyhow::anyhow!("Invalid address {}: {}", addr, e))?
                .assume_checked();
            reveal_outputs.push(TxOut {
                value: Amount::from_sat(*value),
                script_pubkey: addr_parsed.script_pubkey(),
            });
        }

        // Add BTC change output
        let btc_change_address = self.rpc.get_new_address(None, None)?;
        let btc_change_script = btc_change_address.assume_checked().script_pubkey();
        let btc_change_value = commit_amount - reveal_fee - total_output_value;
        if btc_change_value > 546 {
            reveal_outputs.push(TxOut {
                value: Amount::from_sat(btc_change_value),
                script_pubkey: btc_change_script,
            });
        }

        let mut reveal_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: reveal_inputs,
            output: reveal_outputs,
        };

        // Build the witness for script-path spend (input 0 - the commit output)
        let control_block = taproot_info
            .control_block(&(data_script.clone(), LeafVersion::TapScript))
            .context("Failed to build control block")?;

        // Witness for the commit input: [script] [control block]
        let mut commit_witness = Witness::new();
        commit_witness.push(data_script.as_bytes());
        commit_witness.push(control_block.serialize());
        reveal_tx.input[0].witness = commit_witness;

        // Serialize partially signed reveal tx
        let reveal_hex = serialize_hex(&reveal_tx);

        // Sign the remaining inputs (token UTXOs) with the wallet
        let signed_reveal: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(reveal_hex)],
        )?;

        if !signed_reveal["complete"].as_bool().unwrap_or(false) {
            if let Some(errors) = signed_reveal["errors"].as_array() {
                for err in errors {
                    warn!("Reveal signing error: {:?}", err);
                }
            }
            anyhow::bail!("Advanced witness reveal signing incomplete: {:?}", signed_reveal);
        }

        let signed_reveal_hex = signed_reveal["hex"].as_str().context("No hex in signed reveal")?;

        // Broadcast reveal transaction
        let reveal_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_reveal_hex)])?;

        info!(
            "Broadcast advanced witness reveal tx: {} (commit: {})",
            reveal_txid, commit_txid
        );

        Ok(CreatedTransaction {
            txid: reveal_txid,
            anchor_vout: 0, // Token change is output 0
            hex: signed_reveal_hex.to_string(),
            carrier: 4, // WitnessData
            carrier_name: "witness_data".to_string(),
        })
    }

    /// Create and broadcast a transaction with the given OP_RETURN script
    fn create_and_broadcast_tx_with_script(
        &self,
        op_return_script: ScriptBuf,
        carrier_type: u8,
        fee_rate: u64, // sat/vbyte
    ) -> Result<CreatedTransaction> {
        // Get a change address
        let change_address = self.rpc.get_new_address(None, None)?;
        let change_address = change_address.assume_checked();

        // Convert sat/vbyte to BTC/kB for fundrawtransaction
        // 1 sat/vbyte = 0.00001 BTC/kB (1 sat = 0.00000001 BTC, 1 vbyte = 1/1000 kB)
        let fee_rate_btc_kb = fee_rate as f64 * 0.00001;

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
                    "feeRate": fee_rate_btc_kb
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
            carrier: carrier_type,
            carrier_name: carrier_name(carrier_type).to_string(),
        })
    }

    /// Create and broadcast a Stamps transaction with bare multisig outputs
    /// Builds the transaction manually since Bitcoin Core RPC doesn't support custom scriptPubKey
    fn create_and_broadcast_stamps_tx(&self, scripts: Vec<ScriptBuf>, fee_rate: u64) -> Result<CreatedTransaction> {
        // Get UTXOs
        let utxos = self.rpc.list_unspent(Some(0), None, None, None, None)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for Stamps transaction");
        }

        // Calculate required amount: dust for each output + fee
        // Bare multisig outputs have higher dust thresholds than P2PKH
        let dust_per_output = 1000u64; // satoshis (higher for bare multisig)
        let total_dust = dust_per_output * scripts.len() as u64;
        // Estimate vbytes and calculate fee (rough estimate: 150 base + 40 per output)
        let estimated_vbytes = 150 + scripts.len() as u64 * 40;
        let estimated_fee = std::cmp::max(15000, estimated_vbytes * fee_rate);
        let required = total_dust + estimated_fee;

        // Find UTXOs to cover the required amount
        let mut selected_utxos = Vec::new();
        let mut total_input = 0u64;

        for utxo in &utxos {
            let value = utxo.amount.to_sat();
            selected_utxos.push(utxo);
            total_input += value;
            if total_input >= required + 546 {
                // Need dust for change too
                break;
            }
        }

        if total_input < required {
            anyhow::bail!(
                "Insufficient funds for Stamps: need {} sats, have {}",
                required,
                total_input
            );
        }

        // Get change address
        let change_address = self.rpc.get_new_address(None, None)?;
        let change_address = change_address.assume_checked();

        // Build inputs
        let inputs: Vec<TxIn> = selected_utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        // Build outputs: Stamps multisig outputs + change
        let mut outputs: Vec<TxOut> = scripts
            .iter()
            .map(|script| TxOut {
                value: Amount::from_sat(dust_per_output),
                script_pubkey: script.clone(),
            })
            .collect();

        // Add change output
        let change_value = total_input - total_dust - estimated_fee;
        if change_value >= 546 {
            outputs.push(TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_address.script_pubkey(),
            });
        }

        // Build unsigned transaction
        let unsigned_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: inputs,
            output: outputs,
        };

        let unsigned_hex = serialize_hex(&unsigned_tx);
        debug!("Built unsigned Stamps transaction: {} bytes", unsigned_hex.len() / 2);

        // Sign using wallet
        let signed: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(unsigned_hex)],
        )?;

        if !signed["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("Stamps transaction signing incomplete");
        }

        let signed_hex = signed["hex"].as_str().context("No hex in signed tx")?;

        // Broadcast
        let txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_hex)])?;

        info!(
            "Broadcast Stamps transaction: {} with {} multisig outputs",
            txid,
            scripts.len()
        );

        Ok(CreatedTransaction {
            txid,
            hex: signed_hex.to_string(),
            anchor_vout: 0,
            carrier: 2,
            carrier_name: "stamps".to_string(),
        })
    }

    /// Create and broadcast an Inscription transaction using commit+reveal pattern
    /// This creates a Taproot script-path spend that reveals the inscription in the witness
    fn create_and_broadcast_inscription_tx(&self, reveal_script: ScriptBuf, fee_rate: u64) -> Result<CreatedTransaction> {
        let secp = Secp256k1::new();

        // Generate an internal key (could be from wallet, using random for simplicity)
        // For a real implementation, you'd derive this from the wallet
        let internal_key = {
            // Use a deterministic "nothing up my sleeve" key for the internal pubkey
            // This is the standard NUMS (Nothing Up My Sleeve) point
            let nums_bytes: [u8; 32] = [
                0x50, 0x92, 0x9b, 0x74, 0xc1, 0xa0, 0x49, 0x54, 0xb7, 0x8b, 0x4b, 0x60, 0x35, 0xe9,
                0x7a, 0x5e, 0x07, 0x8a, 0x5a, 0x0f, 0x28, 0xec, 0x96, 0xd5, 0x47, 0xbf, 0xee, 0x9a,
                0xce, 0x80, 0x3a, 0xc0,
            ];
            XOnlyPublicKey::from_slice(&nums_bytes)
                .unwrap_or_else(|_| {
                    // Fallback: generate from a random key
                    let secret = SecretKey::from_slice(&[1u8; 32]).expect("valid key");
                    let keypair = UntweakedKeypair::from_secret_key(&secp, &secret);
                    XOnlyPublicKey::from_keypair(&keypair).0
                })
        };

        // Build the Taproot tree with the inscription script as a leaf
        let taproot_builder = TaprootBuilder::new()
            .add_leaf(0, reveal_script.clone())
            .map_err(|e| anyhow::anyhow!("Failed to build Taproot tree: {:?}", e))?;

        let taproot_info: TaprootSpendInfo = taproot_builder
            .finalize(&secp, internal_key)
            .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

        // Get the Taproot output key (tweaked)
        let output_key = taproot_info.output_key();

        // Build the P2TR script pubkey for the commit transaction
        let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

        debug!("Inscription commit script: {}", hex::encode(commit_script.as_bytes()));

        // Calculate dynamic fee based on reveal script size and fee_rate
        // Reveal tx: ~100 base vbytes + witness data (gets 75% discount)
        let script_size = reveal_script.len();
        let reveal_vbytes = 100 + (script_size + 3) / 4; // witness weight / 4
        let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
        let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes
        
        debug!("Inscription fees: reveal_script={} bytes, reveal_vbytes={}, reveal_fee={} sats", 
               script_size, reveal_vbytes, reveal_fee);

        // Step 1: Create the commit transaction that funds the Taproot address
        // Commit amount must cover reveal fee + dust output
        let commit_amount = reveal_fee + 546; // reveal fee + dust limit
        let utxos = self.rpc.list_unspent(Some(1), None, None, None, None)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for Inscription commit");
        }

        // Select UTXOs
        let mut selected_utxos = Vec::new();
        let mut total_input = 0u64;
        let required = commit_amount + commit_fee; // commit output + commit tx fee

        for utxo in &utxos {
            selected_utxos.push(utxo);
            total_input += utxo.amount.to_sat();
            if total_input >= required + 546 {
                break;
            }
        }

        if total_input < required {
            anyhow::bail!("Insufficient funds for inscription commit: need {} sats", required);
        }

        // Build commit transaction inputs
        let commit_inputs: Vec<TxIn> = selected_utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        // Get change address
        let change_address = self.rpc.get_new_address(None, None)?;
        let change_script = change_address.assume_checked().script_pubkey();

        // Build commit outputs: Taproot commit output + change
        let change_value = total_input - commit_amount - commit_fee;
        let commit_outputs = vec![
            TxOut {
                value: Amount::from_sat(commit_amount),
                script_pubkey: commit_script.clone(),
            },
            TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_script.clone(),
            },
        ];

        let commit_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: commit_inputs,
            output: commit_outputs,
        };

        let commit_hex = serialize_hex(&commit_tx);

        // Sign commit transaction
        let signed_commit: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(commit_hex)],
        )?;

        if !signed_commit["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("Inscription commit signing incomplete");
        }

        let signed_commit_hex = signed_commit["hex"].as_str().context("No hex in signed commit")?;

        // Broadcast commit
        let commit_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_commit_hex)])?;
        info!("Broadcast inscription commit tx: {}", commit_txid);

        // Parse commit txid
        let commit_txid_parsed = Txid::from_str(&commit_txid)?;

        // Step 2: Create the reveal transaction that spends the commit output
        // This reveals the inscription in the witness

        // Get another change address for reveal tx
        let reveal_change_address = self.rpc.get_new_address(None, None)?;
        let reveal_change_script = reveal_change_address.assume_checked().script_pubkey();

        let reveal_input = TxIn {
            previous_output: OutPoint {
                txid: commit_txid_parsed,
                vout: 0, // First output of commit tx
            },
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(), // Will be filled with inscription data
        };

        // Reveal output: just a change output (inscription is in the witness)
        // Output value = commit_amount - reveal_fee, ensuring at least dust limit
        let reveal_output_value = if commit_amount > reveal_fee + 546 {
            commit_amount - reveal_fee
        } else {
            546 // Dust limit
        };
        let reveal_output = TxOut {
            value: Amount::from_sat(reveal_output_value),
            script_pubkey: reveal_change_script,
        };

        let mut reveal_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: vec![reveal_input],
            output: vec![reveal_output],
        };

        // Build the witness for the script-path spend
        // Witness stack for script-path: [script args...] [script] [control block]
        let control_block = taproot_info
            .control_block(&(reveal_script.clone(), LeafVersion::TapScript))
            .context("Failed to build control block")?;

        // Build witness: the inscription script goes into the witness
        // Format: [signature if needed] [script] [control block]
        // For our inscription, we don't need a signature because the script is just data
        let mut witness = Witness::new();
        witness.push(reveal_script.as_bytes()); // The inscription script
        witness.push(control_block.serialize()); // Control block

        reveal_tx.input[0].witness = witness;

        let reveal_hex = serialize_hex(&reveal_tx);

        // Broadcast reveal transaction (no signing needed for script-path with no sig check)
        let reveal_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(reveal_hex)])?;

        info!(
            "Broadcast inscription reveal tx: {} (commit: {})",
            reveal_txid, commit_txid
        );

        Ok(CreatedTransaction {
            txid: reveal_txid,
            hex: reveal_hex,
            anchor_vout: 0, // Inscription is in input witness, not output
            carrier: 1,
            carrier_name: "inscription".to_string(),
        })
    }

    /// Create and broadcast a Taproot Annex transaction
    /// The annex is the last element in the witness stack, prefixed with 0x50
    /// Note: Standard Bitcoin Core nodes don't relay annex transactions, but they are valid
    fn create_and_broadcast_annex_tx(&self, annex_data: Vec<u8>, fee_rate: u64) -> Result<CreatedTransaction> {
        let secp = Secp256k1::new();

        // Generate a keypair for the Taproot key-path spend
        // Use deterministic key derivation for simplicity
        let secret_bytes: [u8; 32] = {
            let mut bytes = [0u8; 32];
            // Use wallet's first address as entropy source
            let addr = self.rpc.get_new_address(None, None)?;
            let addr_bytes = addr.assume_checked().to_string().into_bytes();
            for (i, b) in addr_bytes.iter().take(32).enumerate() {
                bytes[i] = *b;
            }
            // Ensure it's a valid secret key (non-zero, less than curve order)
            bytes[0] = bytes[0].max(1);
            bytes
        };

        let secret_key = SecretKey::from_slice(&secret_bytes)
            .map_err(|e| anyhow::anyhow!("Failed to create secret key: {}", e))?;
        let keypair = UntweakedKeypair::from_secret_key(&secp, &secret_key);
        let (internal_key, _parity) = XOnlyPublicKey::from_keypair(&keypair);

        // Create a simple Taproot key-path output (no script tree)
        let taproot_info = TaprootBuilder::new()
            .finalize(&secp, internal_key)
            .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

        let output_key = taproot_info.output_key();
        let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

        debug!("Annex commit script: {}", hex::encode(commit_script.as_bytes()));

        // Calculate dynamic fee based on annex data size and fee_rate
        // Reveal tx: ~150 base vbytes + witness data (gets 75% discount)
        // Annex is in witness, so it gets the discount too
        let annex_size = annex_data.len();
        let reveal_vbytes = 150 + (annex_size + 64 + 3) / 4; // 64 for schnorr sig
        let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
        let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes
        
        debug!("Annex fees: annex_size={} bytes, reveal_vbytes={}, reveal_fee={} sats", 
               annex_size, reveal_vbytes, reveal_fee);

        // Step 1: Create commit transaction that funds the Taproot address
        // Commit amount must cover reveal fee + dust output
        let commit_amount = reveal_fee + 546; // reveal fee + dust limit
        let utxos = self.rpc.list_unspent(Some(1), None, None, None, None)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for Annex commit");
        }

        // Select UTXOs
        let mut selected_utxos = Vec::new();
        let mut total_input = 0u64;
        let required = commit_amount + commit_fee;

        for utxo in &utxos {
            selected_utxos.push(utxo);
            total_input += utxo.amount.to_sat();
            if total_input >= required + 546 {
                break;
            }
        }

        if total_input < required {
            anyhow::bail!("Insufficient funds for annex commit: need {} sats", required);
        }

        // Build commit transaction
        let commit_inputs: Vec<TxIn> = selected_utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        let change_address = self.rpc.get_new_address(None, None)?;
        let change_script = change_address.assume_checked().script_pubkey();

        let change_value = total_input - commit_amount - commit_fee;
        let commit_outputs = vec![
            TxOut {
                value: Amount::from_sat(commit_amount),
                script_pubkey: commit_script.clone(),
            },
            TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_script.clone(),
            },
        ];

        let commit_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: commit_inputs,
            output: commit_outputs,
        };

        let commit_hex = serialize_hex(&commit_tx);

        // Sign commit transaction
        let signed_commit: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(commit_hex)],
        )?;

        if !signed_commit["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("Annex commit signing incomplete");
        }

        let signed_commit_hex = signed_commit["hex"].as_str().context("No hex in signed commit")?;

        // Broadcast commit
        let commit_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_commit_hex)])?;
        info!("Broadcast annex commit tx: {}", commit_txid);

        let commit_txid_parsed = Txid::from_str(&commit_txid)?;

        // Step 2: Create the reveal transaction with annex in witness
        let reveal_change_address = self.rpc.get_new_address(None, None)?;
        let reveal_change_script = reveal_change_address.assume_checked().script_pubkey();

        let reveal_input = TxIn {
            previous_output: OutPoint {
                txid: commit_txid_parsed,
                vout: 0,
            },
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(),
        };

        // Reveal output value = commit_amount - reveal_fee, ensuring at least dust limit
        let reveal_output_value = if commit_amount > reveal_fee + 546 {
            commit_amount - reveal_fee
        } else {
            546 // Dust limit
        };
        let reveal_output = TxOut {
            value: Amount::from_sat(reveal_output_value),
            script_pubkey: reveal_change_script,
        };

        let mut reveal_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: vec![reveal_input],
            output: vec![reveal_output],
        };

        // For Taproot key-path spend, we need to sign the transaction
        // Then append the annex to the witness

        // Compute the sighash for Taproot key-path spend WITH annex
        use bitcoin::sighash::{Annex, Prevouts, SighashCache, TapSighashType};

        let prev_out = TxOut {
            value: Amount::from_sat(commit_amount),
            script_pubkey: commit_script.clone(),
        };
        let prev_outs = [prev_out];
        let prevouts = Prevouts::All(&prev_outs);

        // Create the Annex struct (validates 0x50 prefix)
        let annex = Annex::new(&annex_data)
            .map_err(|e| anyhow::anyhow!("Invalid annex data: {:?}", e))?;

        let mut sighash_cache = SighashCache::new(&reveal_tx);
        
        // Use taproot_signature_hash with annex for key-path spend
        // For key-path spend: leaf_hash_code_separator = None
        let sighash = sighash_cache
            .taproot_signature_hash(0, &prevouts, Some(annex), None, TapSighashType::Default)
            .map_err(|e| anyhow::anyhow!("Failed to compute sighash with annex: {:?}", e))?;

        // Tweak the keypair for signing (key-path spend, no merkle root)
        let tweaked_keypair = keypair.tap_tweak(&secp, None);

        // Sign the sighash
        use bitcoin::secp256k1::Message;
        let msg = Message::from_digest_slice(sighash.as_ref())
            .map_err(|e| anyhow::anyhow!("Invalid sighash: {}", e))?;
        let signature = secp.sign_schnorr(&msg, &tweaked_keypair.to_keypair());

        // Build witness: [signature] [annex]
        // The annex must be the last element and start with 0x50
        let mut witness = Witness::new();
        witness.push(signature.as_ref()); // 64-byte Schnorr signature
        witness.push(&annex_data); // Annex data (starts with 0x50)

        reveal_tx.input[0].witness = witness;

        let reveal_hex = serialize_hex(&reveal_tx);

        // Broadcast reveal transaction
        // Note: Standard nodes may reject this, but libre relay nodes should accept it
        let reveal_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(reveal_hex)])
            .map_err(|e| anyhow::anyhow!("Failed to broadcast annex tx (may need libre relay): {}", e))?;

        info!(
            "Broadcast annex reveal tx: {} (commit: {})",
            reveal_txid, commit_txid
        );

        Ok(CreatedTransaction {
            txid: reveal_txid,
            hex: reveal_hex,
            anchor_vout: 0,
            carrier: 3,
            carrier_name: "taproot_annex".to_string(),
        })
    }

    /// Create and broadcast a WitnessData transaction using commit+reveal pattern
    /// Similar to inscriptions but uses a simpler data script (data drops + OP_TRUE)
    fn create_and_broadcast_witness_data_tx(&self, data_script: ScriptBuf, fee_rate: u64) -> Result<CreatedTransaction> {
        let secp = Secp256k1::new();

        // Use a NUMS (Nothing Up My Sleeve) point for the internal key
        let internal_key = {
            let nums_bytes: [u8; 32] = [
                0x50, 0x92, 0x9b, 0x74, 0xc1, 0xa0, 0x49, 0x54, 0xb7, 0x8b, 0x4b, 0x60, 0x35, 0xe9,
                0x7a, 0x5e, 0x07, 0x8a, 0x5a, 0x0f, 0x28, 0xec, 0x96, 0xd5, 0x47, 0xbf, 0xee, 0x9a,
                0xce, 0x80, 0x3a, 0xc0,
            ];
            XOnlyPublicKey::from_slice(&nums_bytes)
                .unwrap_or_else(|_| {
                    let secret = SecretKey::from_slice(&[1u8; 32]).expect("valid key");
                    let keypair = UntweakedKeypair::from_secret_key(&secp, &secret);
                    XOnlyPublicKey::from_keypair(&keypair).0
                })
        };

        // Build the Taproot tree with the data script as a leaf
        let taproot_builder = TaprootBuilder::new()
            .add_leaf(0, data_script.clone())
            .map_err(|e| anyhow::anyhow!("Failed to build Taproot tree: {:?}", e))?;

        let taproot_info: TaprootSpendInfo = taproot_builder
            .finalize(&secp, internal_key)
            .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

        let output_key = taproot_info.output_key();
        let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

        debug!("WitnessData commit script: {}", hex::encode(commit_script.as_bytes()));

        // Calculate dynamic fee based on data script size and fee_rate
        // Reveal tx: ~100 base vbytes + witness data (gets 75% discount)
        let script_size = data_script.len();
        let reveal_vbytes = 100 + (script_size + 3) / 4; // witness weight / 4
        let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
        let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes
        
        debug!("WitnessData fees: data_script={} bytes, reveal_vbytes={}, reveal_fee={} sats", 
               script_size, reveal_vbytes, reveal_fee);

        // Step 1: Create the commit transaction
        // Commit amount must cover reveal fee + dust output
        let commit_amount = reveal_fee + 546; // reveal fee + dust limit
        let utxos = self.rpc.list_unspent(Some(1), None, None, None, None)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for WitnessData commit");
        }

        let mut selected_utxos = Vec::new();
        let mut total_input = 0u64;
        let required = commit_amount + commit_fee;

        for utxo in &utxos {
            selected_utxos.push(utxo);
            total_input += utxo.amount.to_sat();
            if total_input >= required + 546 {
                break;
            }
        }

        if total_input < required {
            anyhow::bail!("Insufficient funds for witness data commit: need {} sats", required);
        }

        let commit_inputs: Vec<TxIn> = selected_utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        let change_address = self.rpc.get_new_address(None, None)?;
        let change_script = change_address.assume_checked().script_pubkey();

        let change_value = total_input - commit_amount - commit_fee;
        let commit_outputs = vec![
            TxOut {
                value: Amount::from_sat(commit_amount),
                script_pubkey: commit_script.clone(),
            },
            TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_script.clone(),
            },
        ];

        let commit_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: commit_inputs,
            output: commit_outputs,
        };

        let commit_hex = serialize_hex(&commit_tx);

        // Sign commit transaction
        let signed_commit: serde_json::Value = self.rpc.call(
            "signrawtransactionwithwallet",
            &[serde_json::json!(commit_hex)],
        )?;

        if !signed_commit["complete"].as_bool().unwrap_or(false) {
            anyhow::bail!("WitnessData commit signing incomplete");
        }

        let signed_commit_hex = signed_commit["hex"].as_str().context("No hex in signed commit")?;

        // Broadcast commit
        let commit_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(signed_commit_hex)])?;
        info!("Broadcast witness data commit tx: {}", commit_txid);

        let commit_txid_parsed = Txid::from_str(&commit_txid)?;

        // Step 2: Create the reveal transaction
        let reveal_change_address = self.rpc.get_new_address(None, None)?;
        let reveal_change_script = reveal_change_address.assume_checked().script_pubkey();

        let reveal_input = TxIn {
            previous_output: OutPoint {
                txid: commit_txid_parsed,
                vout: 0,
            },
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(),
        };

        // Reveal output value = commit_amount - reveal_fee, ensuring at least dust limit
        let reveal_output_value = if commit_amount > reveal_fee + 546 {
            commit_amount - reveal_fee
        } else {
            546 // Dust limit
        };
        let reveal_output = TxOut {
            value: Amount::from_sat(reveal_output_value),
            script_pubkey: reveal_change_script,
        };

        let mut reveal_tx = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: vec![reveal_input],
            output: vec![reveal_output],
        };

        // Build the witness for script-path spend
        let control_block = taproot_info
            .control_block(&(data_script.clone(), LeafVersion::TapScript))
            .context("Failed to build control block")?;

        // Witness: [script] [control block]
        // The data script drops all data and returns true, no signature needed
        let mut witness = Witness::new();
        witness.push(data_script.as_bytes());
        witness.push(control_block.serialize());

        reveal_tx.input[0].witness = witness;

        let reveal_hex = serialize_hex(&reveal_tx);

        // Broadcast reveal transaction
        let reveal_txid: String = self.rpc.call("sendrawtransaction", &[serde_json::json!(reveal_hex)])?;

        info!(
            "Broadcast witness data reveal tx: {} (commit: {})",
            reveal_txid, commit_txid
        );

        Ok(CreatedTransaction {
            txid: reveal_txid,
            hex: reveal_hex,
            anchor_vout: 0,
            carrier: 4,
            carrier_name: "witness_data".to_string(),
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

    /// Get raw transaction by txid
    pub fn get_raw_transaction(&self, txid: &str) -> Result<(String, serde_json::Value, Option<u64>)> {
        // Get raw hex
        let hex: String = self.rpc.call(
            "getrawtransaction",
            &[serde_json::json!(txid)],
        )?;

        // Get decoded transaction
        let decoded: serde_json::Value = self.rpc.call(
            "getrawtransaction",
            &[serde_json::json!(txid), serde_json::json!(true)],
        )?;

        // Calculate fee by summing input values and subtracting output values
        let fee = self.calculate_tx_fee(&decoded);

        Ok((hex, decoded, fee))
    }

    /// Calculate transaction fee by fetching input values
    fn calculate_tx_fee(&self, decoded: &serde_json::Value) -> Option<u64> {
        let vin = decoded.get("vin")?.as_array()?;
        let vout = decoded.get("vout")?.as_array()?;

        // Sum output values (in BTC, convert to sats)
        let output_total: f64 = vout
            .iter()
            .filter_map(|out| out.get("value")?.as_f64())
            .sum();

        // Sum input values by fetching each input's previous output
        let mut input_total: f64 = 0.0;
        for input in vin {
            // Skip coinbase inputs
            if input.get("coinbase").is_some() {
                return None; // Coinbase txs have no fee
            }

            let prev_txid = input.get("txid")?.as_str()?;
            let prev_vout = input.get("vout")?.as_u64()? as usize;

            // Fetch previous transaction
            if let Ok(prev_decoded) = self.rpc.call::<serde_json::Value>(
                "getrawtransaction",
                &[serde_json::json!(prev_txid), serde_json::json!(true)],
            ) {
                if let Some(prev_outputs) = prev_decoded.get("vout").and_then(|v| v.as_array()) {
                    if let Some(prev_out) = prev_outputs.get(prev_vout) {
                        if let Some(value) = prev_out.get("value").and_then(|v| v.as_f64()) {
                            input_total += value;
                        }
                    }
                }
            }
        }

        // Fee in satoshis
        let fee_btc = input_total - output_total;
        if fee_btc >= 0.0 {
            Some((fee_btc * 100_000_000.0).round() as u64)
        } else {
            None
        }
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

