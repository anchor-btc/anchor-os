//! HTTP handlers for the AnchorProofs API
//!
//! This module is organized by functionality:
//! - `system` - Health check and statistics
//! - `proofs` - Proof CRUD operations
//! - `stamp` - Create and revoke proofs

mod proofs;
mod stamp;
mod system;

use std::sync::Arc;

use crate::db::Database;
use crate::services::WalletClient;

pub use proofs::*;
pub use stamp::*;
pub use system::*;

/// App state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub wallet: WalletClient,
}

impl AppState {
    /// Create new app state
    pub fn new(db: Database, wallet_url: String) -> Arc<Self> {
        Arc::new(Self {
            db,
            wallet: WalletClient::new(wallet_url),
        })
    }
}

