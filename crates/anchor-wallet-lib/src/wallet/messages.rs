//! Message creation methods for the wallet

use bitcoin::Txid;
use anchor_core::carrier::CarrierType;
use anchor_core::AnchorKind;

use super::core::AnchorWallet;
use crate::error::{Result, WalletError};
use crate::transaction::{AnchorTransaction, TransactionBuilder};

impl AnchorWallet {
    /// Create a root message (new thread)
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let txid = wallet.create_root_message("Hello, ANCHOR!")?;
    /// println!("Created message: {}", txid);
    /// ```
    pub fn create_root_message(&self, body: &str) -> Result<Txid> {
        self.create_message(AnchorKind::Text, body.as_bytes(), &[])
    }

    /// Create a reply to an existing message
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let txid = wallet.create_reply(
    ///     "This is a reply!",
    ///     &parent_txid,
    ///     0,
    /// )?;
    /// ```
    pub fn create_reply(&self, body: &str, parent_txid: &Txid, parent_vout: u8) -> Result<Txid> {
        self.create_message(
            AnchorKind::Text,
            body.as_bytes(),
            &[(*parent_txid, parent_vout)],
        )
    }

    /// Create a message with custom kind and multiple anchors
    pub fn create_message(
        &self,
        kind: AnchorKind,
        body: &[u8],
        anchors: &[(Txid, u8)],
    ) -> Result<Txid> {
        self.create_message_with_carrier(kind, body, anchors, None)
    }

    /// Create a message with a specific carrier type
    pub fn create_message_with_carrier(
        &self,
        kind: AnchorKind,
        body: &[u8],
        anchors: &[(Txid, u8)],
        carrier: Option<CarrierType>,
    ) -> Result<Txid> {
        // Get UTXOs
        let utxos = self.list_utxos()?;
        if utxos.is_empty() {
            return Err(WalletError::NoUtxos);
        }

        // Get change address
        let change_address = self.get_new_address()?;
        let change_address = change_address.assume_checked();

        // Build transaction
        let mut builder = TransactionBuilder::new()
            .kind(kind)
            .body_bytes(body.to_vec())
            .fee_rate(self.config.fee_rate)
            .change_script(change_address.script_pubkey());

        // Set carrier if specified
        if let Some(ct) = carrier {
            builder = builder.carrier(ct);
        }

        // Add anchors
        for (txid, vout) in anchors {
            builder = builder.anchor(*txid, *vout);
        }

        // Add inputs - for Stamps, we need more inputs due to dust outputs
        let required_inputs = if carrier == Some(CarrierType::Stamps) {
            2 // Stamps needs more funds
        } else {
            1
        };

        for utxo in utxos.iter().take(required_inputs.min(utxos.len())) {
            builder = builder.input(utxo.txid, utxo.vout, utxo.amount);
        }

        // Build the transaction
        let anchor_tx = builder.build()?;

        // Sign and broadcast
        let txid = self.sign_and_broadcast(&anchor_tx)?;

        Ok(txid)
    }

    /// Create a permanent message using Stamps carrier
    ///
    /// This message will be stored permanently in the UTXO set and cannot be pruned.
    pub fn create_permanent_message(&self, body: &str) -> Result<Txid> {
        self.create_message_with_carrier(
            AnchorKind::Text,
            body.as_bytes(),
            &[],
            Some(CarrierType::Stamps),
        )
    }

    /// Create a permanent reply using Stamps carrier
    pub fn create_permanent_reply(
        &self,
        body: &str,
        parent_txid: &Txid,
        parent_vout: u8,
    ) -> Result<Txid> {
        self.create_message_with_carrier(
            AnchorKind::Text,
            body.as_bytes(),
            &[(*parent_txid, parent_vout)],
            Some(CarrierType::Stamps),
        )
    }

    /// Build an unsigned ANCHOR transaction
    ///
    /// Use this for custom signing flows (hardware wallets, etc.)
    pub fn build_transaction(
        &self,
        kind: AnchorKind,
        body: &[u8],
        anchors: &[(Txid, u8)],
    ) -> Result<AnchorTransaction> {
        let utxos = self.list_utxos()?;
        if utxos.is_empty() {
            return Err(WalletError::NoUtxos);
        }

        let change_address = self.get_new_address()?;
        let change_address = change_address.assume_checked();

        let mut builder = TransactionBuilder::new()
            .kind(kind)
            .body_bytes(body.to_vec())
            .fee_rate(self.config.fee_rate)
            .change_script(change_address.script_pubkey());

        for (txid, vout) in anchors {
            builder = builder.anchor(*txid, *vout);
        }

        let utxo = &utxos[0];
        builder = builder.input(utxo.txid, utxo.vout, utxo.amount);

        builder.build()
    }
}

