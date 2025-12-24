//! Wallet operations using Bitcoin Core RPC and BDK
//!
//! This module is organized into submodules:
//! - `types` - Data structures (Utxo, Balance, CreatedTransaction)
//! - `service` - WalletService core implementation (Bitcoin Core RPC)
//! - `bdk_service` - BDK-based wallet with full key management
//! - `anchor` - ANCHOR transaction creation
//! - `advanced` - Advanced transaction with required inputs/outputs
//! - `specs` - Type-safe spec-based transaction creation
//! - `carriers/` - Carrier-specific transaction builders

mod advanced;
mod anchor;
pub mod bdk_service;
mod service;
mod specs;
mod types;
mod utils;

pub mod carriers;

// Re-export public types
pub use service::WalletService;
pub use bdk_service::{BdkWalletService, WalletInfo};
// Types are re-exported for external use
#[allow(unused_imports)]
pub use types::{Balance, CreatedTransaction, Utxo};
#[allow(unused_imports)]
pub use specs::AnchorRef;

