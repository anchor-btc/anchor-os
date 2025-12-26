//! HTTP request handlers for the Anchor Places API

mod categories;
mod markers;
mod system;

use std::sync::Arc;

use crate::db::Database;
use crate::services::WalletClient;

pub use categories::*;
pub use markers::*;
pub use system::*;

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub wallet: WalletClient,
}

impl AppState {
    pub fn new(db: Database, wallet_url: String) -> Arc<Self> {
        Arc::new(Self {
            db,
            wallet: WalletClient::new(wallet_url),
        })
    }
}
