//! ANCHOR Protocol Core Library
//!
//! This crate provides the core types and parsing logic for the ANCHOR protocol v1.
//! ANCHOR is a minimalist metaprotocol for recording chained messages on Bitcoin.
//!
//! # Features
//!
//! - **Multi-carrier support**: Embed ANCHOR messages in OP_RETURN, Inscriptions,
//!   Stamps, Taproot Annex, or Witness Data
//! - **Message chaining**: Reference parent messages via compact 64-bit anchors
//! - **Extensible kinds**: Support for text, images, state updates, votes, and more
//!
//! # Example
//!
//! ```ignore
//! use anchor_core::{AnchorMessageBuilder, AnchorKind};
//! use anchor_core::carrier::{CarrierSelector, CarrierPreferences};
//!
//! // Create a message
//! let message = AnchorMessageBuilder::new()
//!     .text("Hello, ANCHOR!")
//!     .build();
//!
//! // Select best carrier and encode
//! let selector = CarrierSelector::new();
//! let prefs = CarrierPreferences::default();
//! let (carrier_type, output) = selector.encode(&message, &prefs)?;
//! ```

pub mod carrier;
mod encoder;
mod error;
mod parser;
mod types;

pub use encoder::*;
pub use error::*;
pub use parser::*;
pub use types::*;

/// ANCHOR v1 magic bytes: 0xA11C0001
/// - 0xA11C = "ANCH" in leetspeak
/// - 0x0001 = version 1
pub const ANCHOR_MAGIC: [u8; 4] = [0xA1, 0x1C, 0x00, 0x01];

/// Size of the txid prefix in bytes (64 bits)
pub const TXID_PREFIX_SIZE: usize = 8;

/// Size of each anchor in bytes (8 bytes prefix + 1 byte vout)
pub const ANCHOR_SIZE: usize = 9;

/// Minimum payload size (magic + kind + anchor_count)
pub const MIN_PAYLOAD_SIZE: usize = 6;

/// Maximum recommended anchor count to leave room for body in OP_RETURN
pub const MAX_RECOMMENDED_ANCHORS: u8 = 16;

#[cfg(test)]
mod tests {
    use super::*;
    #[allow(unused_imports)]
    use bitcoin::hashes::Hash;
    use bitcoin::Txid;
    use std::str::FromStr;

    #[test]
    fn test_magic_bytes() {
        assert_eq!(ANCHOR_MAGIC, [0xA1, 0x1C, 0x00, 0x01]);
    }

    #[test]
    fn test_parse_root_message() {
        // Magic + kind=1 + anchor_count=0 + body="hello"
        let payload = [
            0xA1, 0x1C, 0x00, 0x01, // magic
            0x01, // kind = 1 (text)
            0x00, // anchor_count = 0
            b'h', b'e', b'l', b'l', b'o', // body
        ];

        let msg = parse_anchor_payload(&payload).unwrap();
        assert_eq!(msg.kind, AnchorKind::Text);
        assert!(msg.anchors.is_empty());
        assert_eq!(msg.body, b"hello");
    }

    #[test]
    fn test_parse_message_with_anchor() {
        // Magic + kind=1 + anchor_count=1 + anchor + body="reply"
        let mut payload = vec![
            0xA1, 0x1C, 0x00, 0x01, // magic
            0x01, // kind = 1 (text)
            0x01, // anchor_count = 1
        ];
        // Add anchor: 8 bytes prefix + 1 byte vout
        payload.extend_from_slice(&[0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]); // prefix
        payload.push(0x00); // vout = 0
        payload.extend_from_slice(b"reply");

        let msg = parse_anchor_payload(&payload).unwrap();
        assert_eq!(msg.kind, AnchorKind::Text);
        assert_eq!(msg.anchors.len(), 1);
        assert_eq!(
            msg.anchors[0].txid_prefix,
            [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]
        );
        assert_eq!(msg.anchors[0].vout, 0);
        assert_eq!(msg.body, b"reply");
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let original = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![Anchor {
                txid_prefix: [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11],
                vout: 1,
            }],
            body: b"test message".to_vec(),
        };

        let encoded = encode_anchor_payload(&original);
        let decoded = parse_anchor_payload(&encoded).unwrap();

        assert_eq!(decoded.kind, original.kind);
        assert_eq!(decoded.anchors.len(), original.anchors.len());
        assert_eq!(
            decoded.anchors[0].txid_prefix,
            original.anchors[0].txid_prefix
        );
        assert_eq!(decoded.anchors[0].vout, original.anchors[0].vout);
        assert_eq!(decoded.body, original.body);
    }

    #[test]
    fn test_txid_to_prefix() {
        let txid =
            Txid::from_str("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
                .unwrap();
        let prefix = txid_to_prefix(&txid);
        // Bitcoin txids are displayed in reverse byte order
        assert_eq!(prefix.len(), 8);
    }

    #[test]
    fn test_invalid_magic() {
        let payload = [0x00, 0x00, 0x00, 0x00, 0x01, 0x00];
        let result = parse_anchor_payload(&payload);
        assert!(matches!(result, Err(AnchorError::InvalidMagic)));
    }

    #[test]
    fn test_truncated_payload() {
        let payload = [0xA1, 0x1C, 0x00, 0x01, 0x01]; // missing anchor_count
        let result = parse_anchor_payload(&payload);
        assert!(matches!(result, Err(AnchorError::PayloadTooShort)));
    }
}
