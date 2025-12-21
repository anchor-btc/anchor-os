//! Wallet operations using Bitcoin Core RPC
//!
//! This module is organized into submodules:
//! - `types` - Data structures (Utxo, Balance, CreatedTransaction)
//! - `service` - WalletService core implementation
//! - `anchor` - ANCHOR transaction creation
//! - `advanced` - Advanced transaction with required inputs/outputs
//! - `carriers/` - Carrier-specific transaction builders

mod advanced;
mod anchor;
mod service;
mod types;
mod utils;

pub mod carriers;

// Re-export public types
pub use service::WalletService;
// Types are re-exported for external use
#[allow(unused_imports)]
pub use types::{Balance, CreatedTransaction, Utxo};

