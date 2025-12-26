//! Wallet data types

use serde::{Deserialize, Serialize};

/// UTXO information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    pub amount: f64,
    pub confirmations: u32,
    /// Bitcoin address that holds this UTXO
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
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
