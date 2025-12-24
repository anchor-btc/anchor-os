//! HTTP request handlers for the wallet API
//!
//! This module is organized into submodules by functionality:
//! - `health` - System health endpoints
//! - `wallet` - Basic wallet operations (balance, address, UTXOs)
//! - `message` - ANCHOR message creation
//! - `transaction` - Transaction operations (broadcast, mine, rawtx)
//! - `locks` - UTXO lock management
//! - `assets` - Asset aggregation and browsing
//! - `backup` - Wallet backup, mnemonic, and recovery

mod assets;
mod backup;
mod health;
mod locks;
mod message;
mod transaction;
mod wallet;

// Re-export all handlers
pub use health::*;
pub use wallet::*;
pub use message::*;
pub use transaction::*;
pub use locks::*;
pub use assets::*;
pub use backup::*;

