//! Thread types - message threading structures

use serde::{Deserialize, Serialize};

use super::message::IndexedAnchorMessage;

/// Thread of messages starting from a root
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thread {
    /// The root message
    pub root: IndexedAnchorMessage,
    /// Direct replies to the root
    pub replies: Vec<ThreadNode>,
}

/// A node in the thread tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadNode {
    /// The message at this node
    pub message: IndexedAnchorMessage,
    /// Replies to this message
    pub replies: Vec<ThreadNode>,
}
