//! Core types for the ANCHOR protocol

use bitcoin::Txid;
use serde::{Deserialize, Serialize};

/// Represents the kind/type of an ANCHOR message
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum AnchorKind {
    /// Generic/unspecified type
    Generic = 0,
    /// Text message (body interpreted as UTF-8)
    Text = 1,
    /// State update
    State = 2,
    /// Vote
    Vote = 3,
    /// Custom type (value 4-255)
    Custom(u8),
}

impl From<u8> for AnchorKind {
    fn from(value: u8) -> Self {
        match value {
            0 => AnchorKind::Generic,
            1 => AnchorKind::Text,
            2 => AnchorKind::State,
            3 => AnchorKind::Vote,
            n => AnchorKind::Custom(n),
        }
    }
}

impl From<AnchorKind> for u8 {
    fn from(kind: AnchorKind) -> Self {
        match kind {
            AnchorKind::Generic => 0,
            AnchorKind::Text => 1,
            AnchorKind::State => 2,
            AnchorKind::Vote => 3,
            AnchorKind::Custom(n) => n,
        }
    }
}

/// A compact reference to a parent message
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Anchor {
    /// 64-bit prefix of the parent transaction ID
    #[serde(with = "hex_array_8")]
    pub txid_prefix: [u8; 8],
    /// Output index of the parent message
    pub vout: u8,
}

impl Anchor {
    /// Create a new anchor from a full txid and vout
    pub fn from_txid(txid: &Txid, vout: u8) -> Self {
        Self {
            txid_prefix: crate::txid_to_prefix(txid),
            vout,
        }
    }

    /// Check if this anchor's prefix matches the given txid
    pub fn matches_txid(&self, txid: &Txid) -> bool {
        let prefix = crate::txid_to_prefix(txid);
        self.txid_prefix == prefix
    }
}

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

// Serde helpers for hex encoding

mod hex_bytes {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S, T>(bytes: T, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: AsRef<[u8]>,
    {
        serializer.serialize_str(&hex::encode(bytes.as_ref()))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        hex::decode(&s).map_err(serde::de::Error::custom)
    }
}

mod hex_array_8 {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8; 8], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&hex::encode(bytes))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 8], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(&s).map_err(serde::de::Error::custom)?;
        bytes.try_into().map_err(|_| serde::de::Error::custom("invalid length for [u8; 8]"))
    }
}

mod txid_hex {
    use bitcoin::Txid;
    use serde::{Deserialize, Deserializer, Serializer};
    use std::str::FromStr;

    pub fn serialize<S>(txid: &Txid, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&txid.to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Txid, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Txid::from_str(&s).map_err(serde::de::Error::custom)
    }
}

mod option_txid_hex {
    use bitcoin::Txid;
    use serde::{Deserialize, Deserializer, Serializer};
    use std::str::FromStr;

    pub fn serialize<S>(txid: &Option<Txid>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match txid {
            Some(t) => serializer.serialize_some(&t.to_string()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Txid>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s: Option<String> = Option::deserialize(deserializer)?;
        match s {
            Some(s) => Ok(Some(Txid::from_str(&s).map_err(serde::de::Error::custom)?)),
            None => Ok(None),
        }
    }
}

