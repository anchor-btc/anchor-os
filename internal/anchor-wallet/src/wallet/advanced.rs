//! Advanced transaction creation with required inputs and custom outputs

use anyhow::{Context, Result};
use bitcoin::consensus::encode::serialize_hex;
use bitcoin::taproot::{LeafVersion, TaprootBuilder};
use bitcoin::transaction::Version;
use bitcoin::{
    absolute::LockTime, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Txid,
    Witness,
};
use std::collections::HashSet;
use std::str::FromStr;
use tracing::{debug, info, warn};

use anchor_core::{AnchorKind, AnchorMessageBuilder};

use super::service::WalletService;
use super::types::CreatedTransaction;
use super::utils::extract_op_return_data;

impl WalletService {
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
        self.create_anchor_transaction_advanced_with_locks(
            kind,
            body,
            parent_txid,
            parent_vout,
            additional_anchors,
            carrier,
            fee_rate,
            required_inputs,
            custom_outputs,
            None,
        )
    }

    /// Create and broadcast an ANCHOR message transaction with advanced options and lock awareness
    /// Supports required inputs (for UTXO-based token transfers) and custom outputs
    pub fn create_anchor_transaction_advanced_with_locks(
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
        locked_set: Option<&HashSet<(String, u32)>>,
    ) -> Result<CreatedTransaction> {
        // Ensure wallet is loaded before proceeding
        if !self.ensure_wallet_loaded() {
            anyhow::bail!("Wallet is not available and could not be recovered");
        }

        // If no required inputs or custom outputs, use the simple version
        if required_inputs.is_empty() && custom_outputs.is_empty() {
            return self.create_anchor_transaction_with_locks(
                kind,
                body,
                parent_txid,
                parent_vout,
                additional_anchors,
                carrier,
                fee_rate,
                locked_set,
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
                                locked_set,
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
                                    locked_set,
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
    pub(crate) fn create_and_broadcast_advanced_tx(
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

        use bitcoincore_rpc::RpcApi;
        
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
    pub(crate) fn create_and_broadcast_advanced_witness_tx(
        &self,
        data_script: ScriptBuf,
        fee_rate: u64,
        required_inputs: Vec<(String, u32)>,
        custom_outputs: Vec<(String, u64)>,
        locked_set: Option<&HashSet<(String, u32)>>,
    ) -> Result<CreatedTransaction> {
        // Acquire the transaction creation mutex to prevent race conditions
        let _tx_guard = self.tx_creation_mutex.lock()
            .map_err(|e| anyhow::anyhow!("Transaction mutex poisoned: {}", e))?;
        
        use bitcoin::secp256k1::Secp256k1;
        use bitcoin::XOnlyPublicKey;

        let secp = Secp256k1::new();
        
        // Use a static internal key (no key path spend)
        let internal_key_bytes = hex::decode("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")?;
        let internal_key = bitcoin::secp256k1::PublicKey::from_slice(&internal_key_bytes)?;
        let internal_xonly = XOnlyPublicKey::from(internal_key);

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
        let utxos = self.list_unspent_unlocked(Some(1), locked_set)?;
        if utxos.is_empty() {
            anyhow::bail!("No UTXOs available for advanced witness tx (all may be locked)");
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

        use bitcoincore_rpc::RpcApi;
        
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
}

