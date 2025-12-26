//! HTTP request handlers for the AnchorCanvas API

pub mod canvas;
pub mod pixels;
pub mod system;

use std::sync::Arc;

use crate::canvas::CanvasManager;
use crate::db::Database;

// Re-export handlers
pub use canvas::{get_canvas, get_preview, get_region, get_tile};
pub use pixels::{
    get_my_pixels, get_pixel, get_pixels_by_address, get_pixels_by_addresses, get_pixels_by_txids,
    get_recent,
};
pub use system::{get_stats, health};

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
