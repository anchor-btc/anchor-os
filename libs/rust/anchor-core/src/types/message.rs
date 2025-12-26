//! Message types - parsed and indexed anchor messages

use bitcoin::Txid;
use serde::{Deserialize, Serialize};

use super::anchor::Anchor;
use super::kind::AnchorKind;
use super::serde_helpers::{hex_array_8, hex_bytes, option_txid_hex, txid_hex};

/// A parsed ANCHOR message (without blockchain context)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParsedAnchorMessage {
    /// Message type
    pub kind: AnchorKind,
    /// References to parent messages
    pub anchors: Vec<Anchor>,
    /// Message body (opaque bytes)
    #[serde(with = "hex_bytes")]
    pub body: Vec<u8>,
}

impl ParsedAnchorMessage {
    /// Create a new root message (no anchors)
    pub fn new_root(kind: AnchorKind, body: Vec<u8>) -> Self {
        Self {
            kind,
            anchors: Vec::new(),
            body,
        }
    }

    /// Create a new reply message with a single parent
    pub fn new_reply(kind: AnchorKind, parent_txid: &Txid, parent_vout: u8, body: Vec<u8>) -> Self {
        Self {
            kind,
            anchors: vec![Anchor::from_txid(parent_txid, parent_vout)],
            body,
        }
    }

    /// Check if this is a root message (no anchors)
    pub fn is_root(&self) -> bool {
        self.anchors.is_empty()
    }

    /// Get the canonical parent anchor (first anchor), if any
    pub fn canonical_parent(&self) -> Option<&Anchor> {
        self.anchors.first()
    }

    /// Get the body as a UTF-8 string (for text messages)
    pub fn body_as_text(&self) -> Option<&str> {
        std::str::from_utf8(&self.body).ok()
    }
}

/// A fully indexed ANCHOR message with blockchain context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedAnchorMessage {
    /// Database ID
    pub id: i32,
    /// Transaction ID containing this message
    #[serde(with = "txid_hex")]
    pub txid: Txid,
    /// Output index of the OP_RETURN
    pub vout: u32,
    /// Block hash (None if unconfirmed)
    pub block_hash: Option<Vec<u8>>,
    /// Block height (None if unconfirmed)
    pub block_height: Option<i32>,
    /// Message type
    pub kind: AnchorKind,
    /// References to parent messages
    pub anchors: Vec<ResolvedAnchor>,
    /// Message body
    #[serde(with = "hex_bytes")]
    pub body: Vec<u8>,
    /// Timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// An anchor with resolution status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedAnchor {
    /// Position in the anchor list (0 = canonical parent)
    pub index: u8,
    /// 64-bit prefix of the parent txid
    #[serde(with = "hex_array_8")]
    pub txid_prefix: [u8; 8],
    /// Output index
    pub vout: u8,
    /// Resolved parent txid (if unique match found)
    #[serde(with = "option_txid_hex")]
    pub resolved_txid: Option<Txid>,
    /// Whether the anchor is ambiguous (multiple matches)
    pub is_ambiguous: bool,
    /// Whether the anchor is orphan (no matches)
    pub is_orphan: bool,
}
