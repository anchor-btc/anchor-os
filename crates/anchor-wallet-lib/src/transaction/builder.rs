//! Transaction builder for ANCHOR messages

use bitcoin::{
    absolute::LockTime,
    transaction::Version,
    Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Txid, Witness,
};
use anchor_core::carrier::{CarrierOutput, CarrierPreferences, CarrierSelector, CarrierType};
use anchor_core::{Anchor, AnchorKind, ParsedAnchorMessage, create_anchor_script, encode_anchor_payload};

use super::anchor_tx::{AnchorTransaction, CarrierData};
use crate::error::{Result, WalletError};

/// Maximum OP_RETURN payload size (legacy)
pub const MAX_OP_RETURN_SIZE: usize = 80;

/// Builder for creating ANCHOR transactions
#[derive(Debug)]
pub struct TransactionBuilder {
    kind: AnchorKind,
    body: Vec<u8>,
    anchors: Vec<Anchor>,
    inputs: Vec<(OutPoint, u64)>, // (outpoint, value in sats)
    change_script: Option<ScriptBuf>,
    fee_rate: f64,
    carrier: Option<CarrierType>,
    carrier_prefs: CarrierPreferences,
}

impl TransactionBuilder {
    /// Create a new transaction builder
    pub fn new() -> Self {
        Self {
            kind: AnchorKind::Text,
            body: Vec::new(),
            anchors: Vec::new(),
            inputs: Vec::new(),
            change_script: None,
            fee_rate: 1.0,
            carrier: None,
            carrier_prefs: CarrierPreferences::default(),
        }
    }

    /// Set the message kind
    pub fn kind(mut self, kind: AnchorKind) -> Self {
        self.kind = kind;
        self
    }

    /// Set the message body as text
    pub fn body_text(mut self, text: &str) -> Self {
        self.body = text.as_bytes().to_vec();
        self.kind = AnchorKind::Text;
        self
    }

    /// Set the message body as raw bytes
    pub fn body_bytes(mut self, bytes: Vec<u8>) -> Self {
        self.body = bytes;
        self
    }

    /// Add an anchor to a parent message
    pub fn anchor(mut self, parent_txid: Txid, parent_vout: u8) -> Self {
        self.anchors.push(Anchor::from_txid(&parent_txid, parent_vout));
        self
    }

    /// Add an anchor from a txid string
    pub fn anchor_str(mut self, parent_txid: &str, parent_vout: u8) -> Result<Self> {
        let txid: Txid = parent_txid.parse()
            .map_err(|_| WalletError::InvalidTxid(parent_txid.to_string()))?;
        self.anchors.push(Anchor::from_txid(&txid, parent_vout));
        Ok(self)
    }

    /// Add an input UTXO
    pub fn input(mut self, txid: Txid, vout: u32, value_sats: u64) -> Self {
        let outpoint = OutPoint { txid, vout };
        self.inputs.push((outpoint, value_sats));
        self
    }

    /// Add an input UTXO from strings
    pub fn input_str(mut self, txid: &str, vout: u32, value_sats: u64) -> Result<Self> {
        let txid: Txid = txid.parse()
            .map_err(|_| WalletError::InvalidTxid(txid.to_string()))?;
        let outpoint = OutPoint { txid, vout };
        self.inputs.push((outpoint, value_sats));
        Ok(self)
    }

    /// Set the change script
    pub fn change_script(mut self, script: ScriptBuf) -> Self {
        self.change_script = Some(script);
        self
    }

    /// Set the fee rate in sat/vB
    pub fn fee_rate(mut self, rate: f64) -> Self {
        self.fee_rate = rate;
        self
    }

    /// Set a specific carrier type to use
    pub fn carrier(mut self, carrier: CarrierType) -> Self {
        self.carrier = Some(carrier);
        self
    }

    /// Set carrier preferences for auto-selection
    pub fn carrier_prefs(mut self, prefs: CarrierPreferences) -> Self {
        self.carrier_prefs = prefs;
        self
    }

    /// Require permanent storage (uses Stamps carrier)
    pub fn permanent(mut self) -> Self {
        self.carrier = Some(CarrierType::Stamps);
        self
    }

    /// Build the parsed anchor message
    fn build_message(&self) -> ParsedAnchorMessage {
        ParsedAnchorMessage {
            kind: self.kind.clone(),
            anchors: self.anchors.clone(),
            body: self.body.clone(),
        }
    }

    /// Build the ANCHOR message payload
    pub fn build_payload(&self) -> Result<Vec<u8>> {
        let message = self.build_message();
        let payload = encode_anchor_payload(&message);
        
        if payload.len() > MAX_OP_RETURN_SIZE {
            return Err(WalletError::MessageTooLarge {
                size: payload.len(),
                max: MAX_OP_RETURN_SIZE,
            });
        }
        
        Ok(payload)
    }

    /// Build the unsigned transaction
    pub fn build(self) -> Result<AnchorTransaction> {
        if self.inputs.is_empty() {
            return Err(WalletError::NoUtxos);
        }

        // Build the ANCHOR message
        let message = self.build_message();

        // Select carrier
        let selector = CarrierSelector::new();
        let carrier_type = if let Some(ct) = self.carrier {
            ct
        } else {
            // Auto-select based on payload size and preferences
            let payload = encode_anchor_payload(&message);
            if payload.len() <= MAX_OP_RETURN_SIZE {
                CarrierType::OpReturn
            } else {
                // Try to find a suitable carrier
                match selector.select(&message, &self.carrier_prefs) {
                    Ok(carrier) => carrier.info().carrier_type,
                    Err(_) => {
                        return Err(WalletError::MessageTooLarge {
                            size: payload.len(),
                            max: MAX_OP_RETURN_SIZE,
                        });
                    }
                }
            }
        };

        // Get the carrier and encode
        let carrier = selector
            .get_carrier(carrier_type)
            .ok_or_else(|| WalletError::TransactionBuild("Carrier not available".to_string()))?;

        let carrier_output = carrier
            .encode(&message)
            .map_err(|e| WalletError::TransactionBuild(format!("Carrier encode error: {}", e)))?;

        // Build transaction based on carrier type
        self.build_with_carrier(message, carrier_type, carrier_output)
    }

    /// Build transaction with a specific carrier output
    fn build_with_carrier(
        self,
        message: ParsedAnchorMessage,
        carrier_type: CarrierType,
        carrier_output: CarrierOutput,
    ) -> Result<AnchorTransaction> {
        // Calculate total input value
        let total_input: u64 = self.inputs.iter().map(|(_, v)| v).sum();

        // Build inputs
        let tx_inputs: Vec<TxIn> = self
            .inputs
            .iter()
            .map(|(outpoint, _)| TxIn {
                previous_output: *outpoint,
                script_sig: ScriptBuf::new(),
                sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
                witness: Witness::new(),
            })
            .collect();

        // Build outputs based on carrier
        let (mut outputs, carrier_data) = match carrier_output {
            CarrierOutput::OpReturn(script) => {
                let outputs = vec![TxOut {
                    value: Amount::ZERO,
                    script_pubkey: script,
                }];
                (outputs, None)
            }
            CarrierOutput::Stamps(scripts) => {
                let outputs: Vec<TxOut> = scripts
                    .iter()
                    .map(|s| TxOut {
                        value: Amount::from_sat(546), // Dust limit for each output
                        script_pubkey: s.clone(),
                    })
                    .collect();
                let data = CarrierData::Stamps {
                    scripts: scripts.clone(),
                };
                (outputs, Some(data))
            }
            CarrierOutput::Inscription {
                reveal_script,
                content_type,
            } => {
                // For inscriptions, we create a commit transaction first
                let outputs = vec![TxOut {
                    value: Amount::ZERO,
                    script_pubkey: create_anchor_script(&message),
                }];
                let data = CarrierData::Inscription {
                    reveal_script,
                    content_type,
                };
                (outputs, Some(data))
            }
            CarrierOutput::Annex(annex_data) => {
                // Annex goes in witness, use OP_RETURN as placeholder
                let outputs = vec![TxOut {
                    value: Amount::ZERO,
                    script_pubkey: create_anchor_script(&message),
                }];
                let data = CarrierData::Annex { data: annex_data };
                (outputs, Some(data))
            }
            CarrierOutput::WitnessData { chunks, script } => {
                let outputs = vec![TxOut {
                    value: Amount::ZERO,
                    script_pubkey: create_anchor_script(&message),
                }];
                let data = CarrierData::WitnessData { chunks, script };
                (outputs, Some(data))
            }
        };

        // Estimate transaction size for fee calculation
        let estimated_vsize = 10 + (self.inputs.len() * 68) + (outputs.len() * 34);
        let fee = (estimated_vsize as f64 * self.fee_rate).ceil() as u64;

        // For Stamps, we need to account for the dust outputs
        let stamps_dust: u64 = if carrier_type == CarrierType::Stamps {
            outputs.iter().map(|o| o.value.to_sat()).sum()
        } else {
            0
        };

        // Add change output if we have enough and a change script
        if let Some(change_script) = self.change_script {
            let change_value = total_input.saturating_sub(fee + stamps_dust);

            if change_value < 546 {
                return Err(WalletError::InsufficientFunds {
                    needed: fee + stamps_dust + 546,
                    available: total_input,
                });
            }

            outputs.push(TxOut {
                value: Amount::from_sat(change_value),
                script_pubkey: change_script,
            });
        }

        let transaction = Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: tx_inputs,
            output: outputs,
        };

        Ok(AnchorTransaction {
            transaction,
            body: self.body,
            kind: self.kind,
            anchors: self.anchors,
            carrier: carrier_type,
            carrier_data,
        })
    }
}

impl Default for TransactionBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_payload() {
        let builder = TransactionBuilder::new()
            .body_text("Hello, ANCHOR!");

        let payload = builder.build_payload().unwrap();
        assert!(!payload.is_empty());
        
        // Should start with magic bytes
        assert_eq!(&payload[0..4], &[0xA1, 0x1C, 0x00, 0x01]);
    }

    #[test]
    fn test_message_too_large() {
        let large_body = "x".repeat(100);
        let builder = TransactionBuilder::new()
            .body_text(&large_body);

        let result = builder.build_payload();
        assert!(matches!(result, Err(WalletError::MessageTooLarge { .. })));
    }
}

