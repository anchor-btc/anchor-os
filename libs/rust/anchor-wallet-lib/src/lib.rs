//! # ANCHOR Wallet Library
//!
//! A Rust library for building ANCHOR protocol wallets.
//!
//! This crate provides all the tools needed to create wallets that can:
//! - Create ANCHOR messages (root messages and replies)
//! - Build Bitcoin transactions with ANCHOR payloads
//! - Sign and broadcast transactions
//! - Parse and validate ANCHOR messages
//!
//! ## Quick Start
//!
//! ```rust,ignore
//! use anchor_wallet_lib::{AnchorWallet, WalletConfig};
//!
//! // Connect to a Bitcoin Core node
//! let config = WalletConfig::new("http://127.0.0.1:18443", "user", "pass");
//! let wallet = AnchorWallet::new(config)?;
//!
//! // Create a new root message
//! let txid = wallet.create_root_message("Hello, ANCHOR!")?;
//! println!("Message created: {}", txid);
//!
//! // Reply to an existing message
//! let reply_txid = wallet.create_reply(
//!     "This is a reply!",
//!     &parent_txid,
//!     0, // vout
//! )?;
//! ```
//!
//! ## Features
//!
//! - `async` - Enable async/await support with Tokio
//!
//! ## Re-exports
//!
//! This crate re-exports `anchor-core` types for convenience.

mod config;
mod error;
mod transaction;
mod types;
mod wallet;

pub use anchor_core::{
    AnchorKind,
    Anchor,
    ParsedAnchorMessage,
    AnchorMessageBuilder,
    parse_anchor_payload,
    encode_anchor_payload,
    create_anchor_script,
    ANCHOR_MAGIC,
};

// Re-export carrier types
pub use anchor_core::carrier::{
    Carrier,
    CarrierError,
    CarrierInfo,
    CarrierInput,
    CarrierOutput,
    CarrierPreferences,
    CarrierResult,
    CarrierSelector,
    CarrierStatus,
    CarrierType,
    OpReturnCarrier,
    InscriptionCarrier,
    StampsCarrier,
    AnnexCarrier,
    WitnessCarrier,
};

pub use config::WalletConfig;
pub use error::{WalletError, Result};
pub use transaction::{AnchorTransaction, TransactionBuilder, CarrierData, MAX_OP_RETURN_SIZE};
pub use types::{Utxo, Balance};
pub use wallet::AnchorWallet;

/// Protocol version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
