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

// Re-export utoipa path macros for OpenAPI docs
pub use canvas::{__path_get_canvas, __path_get_preview, __path_get_region, __path_get_tile};
pub use pixels::{
    __path_get_my_pixels, __path_get_pixel, __path_get_pixels_by_address,
    __path_get_pixels_by_addresses, __path_get_pixels_by_txids, __path_get_recent,
};
pub use system::{__path_get_stats, __path_health};

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
