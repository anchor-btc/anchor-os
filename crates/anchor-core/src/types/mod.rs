//! Core types for the ANCHOR protocol
//!
//! This module contains all the fundamental data structures:
//! - `kind` - AnchorKind enum for message types
//! - `anchor` - Anchor struct for parent references
//! - `message` - ParsedAnchorMessage and IndexedAnchorMessage
//! - `thread` - Thread and ThreadNode for message threading
//! - `serde_helpers` - Hex serialization helpers

mod anchor;
mod kind;
mod message;
pub mod serde_helpers;
mod thread;

// Re-export all public types
pub use anchor::Anchor;
pub use kind::AnchorKind;
pub use message::{IndexedAnchorMessage, ParsedAnchorMessage, ResolvedAnchor};
pub use thread::{Thread, ThreadNode};

