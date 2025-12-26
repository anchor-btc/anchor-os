//! HTTP request handlers for the Anchor Domains API
//!
//! This module is organized by functionality:
//! - `system`: Health check and statistics
//! - `resolution`: Domain name resolution
//! - `domains`: Domain listing and details
//! - `registration`: Domain registration and updates
//! - `pending`: Pending transaction management
//! - `identity`: DNS-based identity publishing (Selfie Records)

pub mod domains;
pub mod identity;
pub mod pending;
pub mod registration;
pub mod resolution;
pub mod system;

// Re-export all handlers for easy access
pub use domains::*;
pub use identity::*;
pub use pending::*;
pub use registration::*;
pub use resolution::*;
pub use system::*;
