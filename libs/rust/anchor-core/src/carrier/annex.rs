//! Taproot Annex carrier for ANCHOR protocol
//!
//! The annex is a reserved field in Taproot (BIP 341) that allows attaching
//! additional data to a transaction input. This carrier is "future-ready" -
//! implemented now so we're prepared when annex usage becomes standard.
//!
//! # Characteristics
//!
//! - **Max Size**: TBD (conservative 10KB limit)
//! - **Prunable**: Yes (witness data can be pruned)
//! - **UTXO Impact**: No
//! - **Witness Discount**: Yes (75% fee discount)
//! - **Status**: Reserved (not relayed by default on Bitcoin Core)
//!
//! # Format
//!
//! The annex is the last element in a Taproot witness stack, identified by
//! a 0x50 prefix byte:
//!
//! ```text
//! Witness Stack:
//!   [0]: signature
//!   [1]: ... (other witness items)
//!   [n]: <0x50><ANCHOR><payload>   // Annex (last item)
//! ```
//!
//! # Important Notes
//!
//! - Bitcoin Core does NOT relay transactions with annex by default
//! - This carrier is implemented for future compatibility
//! - Use `allow_broadcast: true` only with custom mempool/mining setups

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, is_anchor_payload, parse_anchor_payload, ParsedAnchorMessage};

/// Taproot Annex carrier implementation
///
/// Implements data embedding via the Taproot annex field (BIP 341).
/// Currently reserved for future use - transactions with annex are not
/// relayed by standard Bitcoin Core nodes.
#[derive(Debug, Clone)]
pub struct AnnexCarrier {
    /// Whether to allow encoding for broadcast
    /// Set to true only if you have a custom mining/mempool setup
    pub allow_broadcast: bool,
}

impl AnnexCarrier {
    /// Annex prefix byte (BIP 341)
    pub const ANNEX_PREFIX: u8 = 0x50;

    /// ANCHOR marker within annex (for identification)
    pub const ANCHOR_MARKER: &'static [u8] = b"ANCHOR";

    /// Conservative maximum size (TBD by future BIPs)
    pub const MAX_SIZE: usize = 10_000;

    /// Create a new annex carrier (broadcast disabled by default)
    pub fn new() -> Self {
        Self {
            allow_broadcast: false,
        }
    }

    /// Create with broadcast enabled (for custom setups)
    pub fn with_broadcast() -> Self {
        Self {
            allow_broadcast: true,
        }
    }

    /// Enable broadcast (builder pattern)
    pub fn enable_broadcast(mut self) -> Self {
        self.allow_broadcast = true;
        self
    }

    /// Build annex data from ANCHOR message
    ///
    /// Format: 0x50 + "ANCHOR" + payload
    pub fn build_annex(&self, message: &ParsedAnchorMessage) -> Vec<u8> {
        let payload = encode_anchor_payload(message);

        let mut annex = Vec::with_capacity(1 + Self::ANCHOR_MARKER.len() + payload.len());
        annex.push(Self::ANNEX_PREFIX);
        annex.extend_from_slice(Self::ANCHOR_MARKER);
        annex.extend_from_slice(&payload);

        annex
    }

    /// Parse annex data to extract ANCHOR payload
    pub fn parse_annex(&self, annex: &[u8]) -> CarrierResult<Vec<u8>> {
        // Must start with 0x50
        if annex.first() != Some(&Self::ANNEX_PREFIX) {
            return Err(CarrierError::InvalidFormat(
                "Missing annex prefix 0x50".into(),
            ));
        }

        let data = &annex[1..];

        // Check for ANCHOR marker
        if !data.starts_with(Self::ANCHOR_MARKER) {
            return Err(CarrierError::NotAnchor);
        }

        Ok(data[Self::ANCHOR_MARKER.len()..].to_vec())
    }

    /// Check if a witness stack item is an annex
    pub fn is_annex(data: &[u8]) -> bool {
        !data.is_empty() && data[0] == Self::ANNEX_PREFIX
    }

    /// Extract annex from witness stack (if present)
    ///
    /// The annex is always the last element in the witness stack for Taproot
    /// key path or script path spends, and it starts with 0x50.
    pub fn extract_from_witness(witness: &[Vec<u8>]) -> Option<&Vec<u8>> {
        witness.last().filter(|item| Self::is_annex(item))
    }
}

impl Default for AnnexCarrier {
    fn default() -> Self {
        Self::new()
    }
}

impl Carrier for AnnexCarrier {
    fn info(&self) -> CarrierInfo {
        CarrierInfo {
            carrier_type: CarrierType::TaprootAnnex,
            name: "taproot_annex",
            max_size: Self::MAX_SIZE,
            is_prunable: true,
            utxo_impact: false,
            witness_discount: true,
            status: CarrierStatus::Reserved, // Not standard relay yet
        }
    }

    fn can_handle(&self, payload_size: usize) -> bool {
        // Only handle if broadcast is allowed OR we're in decode-only mode
        payload_size <= Self::MAX_SIZE
    }

    fn encode(&self, message: &ParsedAnchorMessage) -> CarrierResult<CarrierOutput> {
        // Note: if !self.allow_broadcast, the annex won't be relayed by standard nodes
        // This is logged/handled at the wallet layer

        let payload = encode_anchor_payload(message);

        if payload.len() > Self::MAX_SIZE {
            return Err(CarrierError::PayloadTooLarge {
                size: payload.len(),
                limit: Self::MAX_SIZE,
            });
        }

        let annex = self.build_annex(message);
        Ok(CarrierOutput::Annex(annex))
    }

    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage> {
        match input {
            CarrierInput::Witness(witness) => {
                // Find annex in witness stack
                let annex = Self::extract_from_witness(witness).ok_or(CarrierError::NotFound)?;

                let payload = self.parse_annex(annex)?;

                if !is_anchor_payload(&payload) {
                    return Err(CarrierError::NotAnchor);
                }

                parse_anchor_payload(&payload).map_err(CarrierError::from)
            }
            CarrierInput::Bytes(data) => {
                // Treat as raw annex data
                let payload = self.parse_annex(data)?;

                if !is_anchor_payload(&payload) {
                    return Err(CarrierError::NotAnchor);
                }

                parse_anchor_payload(&payload).map_err(CarrierError::from)
            }
            _ => Err(CarrierError::InvalidInput),
        }
    }

    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64 {
        // Annex is witness data with 75% discount
        // Size: 1 (prefix) + 6 (ANCHOR marker) + payload + varint length
        let annex_size = 1 + Self::ANCHOR_MARKER.len() + payload_size;

        // Add varint for the annex length in witness
        let varint_size = if annex_size < 253 {
            1
        } else if annex_size < 65536 {
            3
        } else {
            5
        };

        let witness_size = varint_size + annex_size;

        // Witness discount: 1/4 weight
        let weight_units = witness_size;
        let vbytes = weight_units.div_ceil(4);

        (vbytes as f64 * fee_rate).ceil() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AnchorKind;

    #[test]
    fn test_carrier_info() {
        let carrier = AnnexCarrier::new();
        let info = carrier.info();

        assert_eq!(info.carrier_type, CarrierType::TaprootAnnex);
        assert_eq!(info.name, "taproot_annex");
        assert_eq!(info.status, CarrierStatus::Reserved);
        assert!(info.witness_discount);
        assert!(info.is_prunable);
    }

    #[test]
    fn test_broadcast_disabled_by_default() {
        let carrier = AnnexCarrier::new();
        assert!(!carrier.allow_broadcast);
    }

    #[test]
    fn test_enable_broadcast() {
        let carrier = AnnexCarrier::with_broadcast();
        assert!(carrier.allow_broadcast);

        let carrier = AnnexCarrier::new().enable_broadcast();
        assert!(carrier.allow_broadcast);
    }

    #[test]
    fn test_build_annex() {
        let carrier = AnnexCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello from annex!".to_vec(),
        };

        let annex = carrier.build_annex(&message);

        // Check structure
        assert_eq!(annex[0], AnnexCarrier::ANNEX_PREFIX);
        assert!(annex[1..].starts_with(AnnexCarrier::ANCHOR_MARKER));
    }

    #[test]
    fn test_is_annex() {
        assert!(AnnexCarrier::is_annex(&[0x50, 0x01, 0x02]));
        assert!(!AnnexCarrier::is_annex(&[0x51, 0x01, 0x02]));
        assert!(!AnnexCarrier::is_annex(&[]));
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let carrier = AnnexCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Annex roundtrip test".to_vec(),
        };

        // Encode
        let output = carrier.encode(&message).unwrap();
        let CarrierOutput::Annex(annex) = output else {
            panic!("Expected Annex output");
        };

        // Verify format
        assert_eq!(annex[0], 0x50);

        // Decode
        let witness = vec![annex];
        let input = CarrierInput::Witness(&witness);
        let decoded = carrier.decode(&input).unwrap();

        assert_eq!(decoded.kind, message.kind);
        assert_eq!(decoded.body, message.body);
    }

    #[test]
    fn test_extract_from_witness() {
        let annex = vec![0x50, 0x01, 0x02, 0x03];
        let other = vec![0x04, 0x05, 0x06];

        // Annex should be last
        let witness = vec![other.clone(), annex.clone()];
        let extracted = AnnexCarrier::extract_from_witness(&witness);
        assert_eq!(extracted, Some(&annex));

        // Non-annex last item
        let witness = vec![annex.clone(), other.clone()];
        let extracted = AnnexCarrier::extract_from_witness(&witness);
        assert!(extracted.is_none());
    }

    #[test]
    fn test_fee_estimation() {
        let carrier = AnnexCarrier::new();

        // 100 bytes payload
        let fee = carrier.estimate_fee(100, 4.0);

        // Should be cheap due to witness discount
        // (1 + 6 + 100 + 1) / 4 * 4 = ~108 sats
        assert!(fee > 0);
        assert!(fee < 500);
    }

    #[test]
    fn test_parse_invalid_annex() {
        let carrier = AnnexCarrier::new();

        // Wrong prefix
        let result = carrier.parse_annex(&[0x51, 0x01, 0x02]);
        assert!(matches!(result, Err(CarrierError::InvalidFormat(_))));

        // Missing ANCHOR marker
        let result = carrier.parse_annex(&[0x50, 0x01, 0x02]);
        assert!(matches!(result, Err(CarrierError::NotAnchor)));
    }
}
