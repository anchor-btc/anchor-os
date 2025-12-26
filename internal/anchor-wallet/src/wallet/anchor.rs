//! ANCHOR transaction creation

use anyhow::{Context, Result};
use bitcoin::Txid;
use std::collections::HashSet;
use std::str::FromStr;
use tracing::debug;

use anchor_core::{AnchorKind, AnchorMessageBuilder};

use super::service::WalletService;
use super::types::CreatedTransaction;

impl WalletService {
    /// Create and broadcast an ANCHOR message transaction
    ///
    /// # Arguments
    /// * `locked_set` - Optional set of locked UTXOs to exclude from coin selection
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
        self.create_anchor_transaction_with_locks(
            kind,
            body,
            parent_txid,
            parent_vout,
            additional_anchors,
            carrier,
            fee_rate,
            None,
        )
    }

    /// Create and broadcast an ANCHOR message transaction with lock awareness
    ///
    /// # Arguments
    /// * `locked_set` - Optional set of locked UTXOs to exclude from coin selection
    pub fn create_anchor_transaction_with_locks(
        &self,
        kind: u8,
        body: Vec<u8>,
        parent_txid: Option<String>,
        parent_vout: Option<u8>,
        additional_anchors: Vec<(String, u8)>,
        carrier: Option<u8>,
        fee_rate: u64,
        locked_set: Option<&HashSet<(String, u32)>>,
    ) -> Result<CreatedTransaction> {
        // Ensure wallet is loaded before proceeding
        if !self.ensure_wallet_loaded() {
            anyhow::bail!("Wallet is not available and could not be recovered");
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
                Ok(output) => match output {
                    CarrierOutput::OpReturn(script) => {
                        debug!("Created ANCHOR OP_RETURN script: {} bytes", script.len());
                        super::carriers::op_return::create_and_broadcast_tx_with_script(
                            self, script, 0, fee_rate,
                        )
                    }
                    CarrierOutput::Stamps(scripts) => {
                        debug!(
                            "Creating Stamps transaction with {} multisig outputs",
                            scripts.len()
                        );
                        super::carriers::stamps::create_and_broadcast_stamps_tx(
                            self, scripts, fee_rate, locked_set,
                        )
                    }
                    CarrierOutput::Inscription {
                        reveal_script,
                        content_type: _,
                    } => {
                        debug!("Creating Inscription transaction with reveal script");
                        super::carriers::inscription::create_and_broadcast_inscription_tx(
                            self,
                            reveal_script,
                            fee_rate,
                            locked_set,
                        )
                    }
                    CarrierOutput::Annex(annex_data) => {
                        debug!(
                            "Creating Taproot Annex transaction with {} bytes",
                            annex_data.len()
                        );
                        super::carriers::annex::create_and_broadcast_annex_tx(
                            self, annex_data, fee_rate, locked_set,
                        )
                    }
                    CarrierOutput::WitnessData { chunks: _, script } => {
                        debug!(
                            "Creating WitnessData transaction with script {} bytes",
                            script.len()
                        );
                        super::carriers::witness::create_and_broadcast_witness_data_tx(
                            self, script, fee_rate, locked_set,
                        )
                    }
                },
                Err(e) => {
                    debug!("Carrier encode failed: {}, falling back to OP_RETURN", e);
                    let anchor_script = builder.to_script();
                    super::carriers::op_return::create_and_broadcast_tx_with_script(
                        self,
                        anchor_script,
                        0,
                        fee_rate,
                    )
                }
            }
        } else {
            // Carrier not available, use OP_RETURN
            let anchor_script = builder.to_script();
            super::carriers::op_return::create_and_broadcast_tx_with_script(
                self,
                anchor_script,
                0,
                fee_rate,
            )
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
}
