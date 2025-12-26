//! Common types for the wallet library

use bitcoin::{ScriptBuf, Txid};

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
