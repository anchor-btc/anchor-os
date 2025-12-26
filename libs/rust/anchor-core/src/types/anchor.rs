//! Anchor struct - compact reference to parent messages

use bitcoin::Txid;
use serde::{Deserialize, Serialize};

use super::serde_helpers::hex_array_8;

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
