//! Service modules for Anchor Proofs backend
//!
//! This module contains external service clients:
//! - `wallet` - Communication with the anchor-wallet service

mod wallet;

pub use wallet::{AnchorRef, WalletClient};

