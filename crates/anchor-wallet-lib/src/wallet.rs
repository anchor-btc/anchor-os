//! ANCHOR Wallet implementation

use bitcoin::{Address, Amount, Network, ScriptBuf, Txid};
use bitcoincore_rpc::{Auth, Client, RpcApi};

use crate::config::WalletConfig;
use crate::error::{Result, WalletError};
use crate::transaction::{AnchorTransaction, TransactionBuilder};
use anchor_core::AnchorKind;

/// UTXO information
#[derive(Debug, Clone)]
pub struct Utxo {
    /// Transaction ID
    pub txid: Txid,
    /// Output index
    pub vout: u32,
    /// Value in satoshis
    pub amount: u64,
    /// Script pubkey
    pub script_pubkey: ScriptBuf,
    /// Number of confirmations
    pub confirmations: u32,
}

/// Wallet balance
#[derive(Debug, Clone, Default)]
pub struct Balance {
    /// Confirmed balance in satoshis
    pub confirmed: u64,
    /// Unconfirmed balance in satoshis
    pub unconfirmed: u64,
    /// Total balance in satoshis
    pub total: u64,
}

/// ANCHOR wallet for creating and broadcasting messages
pub struct AnchorWallet {
    config: WalletConfig,
    client: Client,
}

impl AnchorWallet {
    /// Create a new wallet connected to a Bitcoin Core node
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_wallet_lib::{AnchorWallet, WalletConfig};
    ///
    /// let config = WalletConfig::regtest("http://127.0.0.1:18443", "user", "pass");
    /// let wallet = AnchorWallet::new(config)?;
    /// ```
    pub fn new(config: WalletConfig) -> Result<Self> {
        config.validate()?;

        let auth = Auth::UserPass(config.rpc_user.clone(), config.rpc_password.clone());
        
        let client = if let Some(ref wallet_name) = config.wallet_name {
            let url = format!("{}/wallet/{}", config.rpc_url, wallet_name);
            Client::new(&url, auth)?
        } else {
            Client::new(&config.rpc_url, auth)?
        };

        Ok(Self { config, client })
    }

    /// Get the wallet configuration
    pub fn config(&self) -> &WalletConfig {
        &self.config
    }

    /// Get the network
    pub fn network(&self) -> Network {
        self.config.network
    }

    /// Get wallet balance
    pub fn get_balance(&self) -> Result<Balance> {
        let balances = self.client.get_balances()?;
        
        let confirmed = balances.mine.trusted.to_sat();
        let unconfirmed = balances.mine.untrusted_pending.to_sat();
        
        Ok(Balance {
            confirmed,
            unconfirmed,
            total: confirmed + unconfirmed,
        })
    }

    /// Get a new receiving address
    pub fn get_new_address(&self) -> Result<Address<bitcoin::address::NetworkUnchecked>> {
        let address = self.client.get_new_address(None, None)?;
        Ok(address)
    }

    /// List unspent transaction outputs (UTXOs)
    pub fn list_utxos(&self) -> Result<Vec<Utxo>> {
        let unspent = self.client.list_unspent(
            Some(self.config.min_confirmations as usize),
            None,
            None,
            None,
            None,
        )?;

        let utxos = unspent
            .into_iter()
            .map(|u| Utxo {
                txid: u.txid,
                vout: u.vout,
                amount: u.amount.to_sat(),
                script_pubkey: u.script_pub_key,
                confirmations: u.confirmations,
            })
            .collect();

        Ok(utxos)
    }

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

        // Add anchors
        for (txid, vout) in anchors {
            builder = builder.anchor(*txid, *vout);
        }

        // Add inputs (use first UTXO for simplicity)
        // In a real wallet, you'd implement coin selection
        let utxo = &utxos[0];
        builder = builder.input(utxo.txid, utxo.vout, utxo.amount);

        // Build the transaction
        let anchor_tx = builder.build()?;

        // Sign and broadcast
        let txid = self.sign_and_broadcast(&anchor_tx)?;

        Ok(txid)
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

    /// Sign and broadcast a transaction
    pub fn sign_and_broadcast(&self, anchor_tx: &AnchorTransaction) -> Result<Txid> {
        let hex = anchor_tx.to_hex();
        
        // Sign the transaction
        let signed = self.client.sign_raw_transaction_with_wallet(hex.as_str(), None, None)?;
        
        if !signed.complete {
            return Err(WalletError::TransactionBuild(
                "Failed to sign transaction".to_string()
            ));
        }

        // Broadcast - signed.hex is the signed transaction bytes
        let signed_hex = ::hex::encode(&signed.hex);
        let txid = self.client.send_raw_transaction(signed_hex.as_str())?;

        Ok(txid)
    }

    /// Broadcast a raw transaction hex
    pub fn broadcast(&self, tx_hex: &str) -> Result<Txid> {
        let txid = self.client.send_raw_transaction(tx_hex)?;
        Ok(txid)
    }

    /// Mine blocks (regtest only)
    pub fn mine_blocks(&self, count: u32) -> Result<Vec<bitcoin::BlockHash>> {
        let address = self.get_new_address()?;
        let address = address.assume_checked();
        let hashes = self.client.generate_to_address(count as u64, &address)?;
        Ok(hashes)
    }

    /// Get transaction details
    pub fn get_transaction(&self, txid: &Txid) -> Result<bitcoincore_rpc::json::GetTransactionResult> {
        let tx = self.client.get_transaction(txid, None)?;
        Ok(tx)
    }

    /// Get raw transaction
    pub fn get_raw_transaction(&self, txid: &Txid) -> Result<bitcoin::Transaction> {
        let tx = self.client.get_raw_transaction(txid, None)?;
        Ok(tx)
    }

    /// Get blockchain info
    pub fn get_blockchain_info(&self) -> Result<bitcoincore_rpc::json::GetBlockchainInfoResult> {
        let info = self.client.get_blockchain_info()?;
        Ok(info)
    }

    /// Estimate smart fee
    pub fn estimate_fee(&self, blocks: u16) -> Result<Amount> {
        let result = self.client.estimate_smart_fee(blocks, None)?;
        Ok(result.fee_rate.unwrap_or(Amount::from_sat(1000)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_validation() {
        let config = WalletConfig::new("", "user", "pass");
        assert!(config.validate().is_err());

        let config = WalletConfig::new("http://localhost:18443", "user", "pass");
        assert!(config.validate().is_ok());
    }
}

