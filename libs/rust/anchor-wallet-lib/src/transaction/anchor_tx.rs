//! ANCHOR transaction types

use anchor_core::carrier::CarrierType;
use anchor_core::{Anchor, AnchorKind};
use bitcoin::{ScriptBuf, Transaction, Txid};

/// Represents an ANCHOR transaction
#[derive(Debug, Clone)]
pub struct AnchorTransaction {
    /// The built transaction
    pub transaction: Transaction,

    /// The ANCHOR message body
    pub body: Vec<u8>,

    /// The message kind
    pub kind: AnchorKind,

    /// Parent anchors (for replies)
    pub anchors: Vec<Anchor>,

    /// The carrier type used
    pub carrier: CarrierType,

    /// Additional carrier-specific data (for inscription reveal, etc.)
    pub carrier_data: Option<CarrierData>,
}

/// Additional data for specific carriers
#[derive(Debug, Clone)]
pub enum CarrierData {
    /// Inscription requires a reveal script
    Inscription {
        reveal_script: ScriptBuf,
        content_type: String,
    },
    /// Stamps creates multiple outputs
    Stamps { scripts: Vec<ScriptBuf> },
    /// Annex data for Taproot
    Annex { data: Vec<u8> },
    /// Witness data chunks
    WitnessData {
        chunks: Vec<Vec<u8>>,
        script: ScriptBuf,
    },
}

impl AnchorTransaction {
    /// Get the transaction ID
    pub fn txid(&self) -> Txid {
        self.transaction.compute_txid()
    }

    /// Get the transaction as hex
    pub fn to_hex(&self) -> String {
        bitcoin::consensus::encode::serialize_hex(&self.transaction)
    }

    /// Get the OP_RETURN output index (always 0 for ANCHOR transactions)
    pub fn anchor_vout(&self) -> u32 {
        0
    }

    /// Get the transaction size in virtual bytes
    pub fn vsize(&self) -> usize {
        self.transaction.vsize()
    }

    /// Get the transaction weight
    pub fn weight(&self) -> usize {
        self.transaction.weight().to_wu() as usize
    }
}
