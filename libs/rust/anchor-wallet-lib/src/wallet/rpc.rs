//! RPC methods for the wallet

use bitcoin::{Amount, Txid};
use bitcoincore_rpc::RpcApi;

use super::core::AnchorWallet;
use crate::error::{Result, WalletError};
use crate::transaction::AnchorTransaction;

impl AnchorWallet {
    /// Sign and broadcast a transaction
    pub fn sign_and_broadcast(&self, anchor_tx: &AnchorTransaction) -> Result<Txid> {
        let hex = anchor_tx.to_hex();

        // Sign the transaction
        let signed = self
            .client
            .sign_raw_transaction_with_wallet(hex.as_str(), None, None)?;

        if !signed.complete {
            return Err(WalletError::TransactionBuild(
                "Failed to sign transaction".to_string(),
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
    pub fn get_transaction(
        &self,
        txid: &Txid,
    ) -> Result<bitcoincore_rpc::json::GetTransactionResult> {
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
