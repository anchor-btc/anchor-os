//! HTTP request handlers for the AnchorCanvas API

pub mod system;
pub mod pixels;
pub mod canvas;

use std::sync::Arc;

use crate::canvas::CanvasManager;
use crate::db::Database;

// Re-export handlers
pub use system::{health, get_stats};
pub use pixels::{get_pixel, get_recent, get_pixels_by_txids, get_pixels_by_address, get_pixels_by_addresses, get_my_pixels};
pub use canvas::{get_tile, get_region, get_preview, get_canvas};

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub canvas: CanvasManager,
}

impl AppState {
    pub fn new(db: Database, canvas: CanvasManager) -> Arc<Self> {
        Arc::new(Self { db, canvas })
    }
}

