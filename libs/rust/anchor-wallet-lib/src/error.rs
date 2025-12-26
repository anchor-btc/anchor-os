//! Error types for the wallet library

use thiserror::Error;

/// Result type for wallet operations
pub type Result<T> = std::result::Result<T, WalletError>;

/// Wallet error types
#[derive(Error, Debug)]
pub enum WalletError {
    /// Bitcoin RPC error
    #[error("Bitcoin RPC error: {0}")]
    Rpc(#[from] bitcoincore_rpc::Error),

    /// ANCHOR protocol error
    #[error("ANCHOR protocol error: {0}")]
    Anchor(#[from] anchor_core::AnchorError),

    /// Invalid configuration
    #[error("Invalid configuration: {0}")]
    Config(String),

    /// Insufficient funds
    #[error("Insufficient funds: need {needed} sats, have {available} sats")]
    InsufficientFunds { needed: u64, available: u64 },

    /// No UTXOs available
    #[error("No UTXOs available for spending")]
    NoUtxos,

    /// Transaction building error
    #[error("Transaction building error: {0}")]
    TransactionBuild(String),

    /// Invalid transaction ID
    #[error("Invalid transaction ID: {0}")]
    InvalidTxid(String),

    /// Message too large
    #[error("Message too large: {size} bytes (max {max} bytes)")]
    MessageTooLarge { size: usize, max: usize },

    /// Wallet not loaded
    #[error("Wallet not loaded: {0}")]
    WalletNotLoaded(String),

    /// Serialization error
    #[error("Serialization error: {0}")]
    Serialization(String),

    /// Hex decoding error
    #[error("Hex decoding error: {0}")]
    HexDecode(#[from] hex::FromHexError),
}
