//! ANCHOR protocol payload parser

use bitcoin::hashes::Hash;
use bitcoin::script::Instruction;
use bitcoin::{Script, Txid, Transaction};

use crate::{
    Anchor, AnchorError, AnchorKind, ParsedAnchorMessage,
    ANCHOR_MAGIC, ANCHOR_SIZE, MIN_PAYLOAD_SIZE, TXID_PREFIX_SIZE,
};

/// Parse an ANCHOR payload from raw bytes
///
/// The payload structure is:
/// - 4 bytes: magic (0xA11C0001)
/// - 1 byte: kind
/// - 1 byte: anchor_count
/// - N * 9 bytes: anchors (8 bytes prefix + 1 byte vout each)
/// - remaining bytes: body
pub fn parse_anchor_payload(data: &[u8]) -> Result<ParsedAnchorMessage, AnchorError> {
    // Check minimum size
    if data.len() < MIN_PAYLOAD_SIZE {
        return Err(AnchorError::PayloadTooShort);
    }

    // Verify magic bytes
    if data[0..4] != ANCHOR_MAGIC {
        return Err(AnchorError::InvalidMagic);
    }

    // Parse kind
    let kind = AnchorKind::from(data[4]);

    // Parse anchor count
    let anchor_count = data[5] as usize;

    // Calculate required size for anchors
    let anchors_size = anchor_count * ANCHOR_SIZE;
    let header_size = 6; // magic (4) + kind (1) + anchor_count (1)
    let required_size = header_size + anchors_size;

    if data.len() < required_size {
        return Err(AnchorError::TruncatedAnchors {
            expected: anchor_count,
            available_bytes: data.len() - header_size,
        });
    }

    // Parse anchors
    let mut anchors = Vec::with_capacity(anchor_count);
    for i in 0..anchor_count {
        let offset = header_size + i * ANCHOR_SIZE;
        let prefix_bytes = &data[offset..offset + TXID_PREFIX_SIZE];
        let vout = data[offset + TXID_PREFIX_SIZE];

        let mut txid_prefix = [0u8; 8];
        txid_prefix.copy_from_slice(prefix_bytes);

        anchors.push(Anchor { txid_prefix, vout });
    }

    // Remaining bytes are the body
    let body = data[required_size..].to_vec();

    Ok(ParsedAnchorMessage { kind, anchors, body })
}

/// Check if raw bytes start with the ANCHOR magic
pub fn is_anchor_payload(data: &[u8]) -> bool {
    data.len() >= 4 && data[0..4] == ANCHOR_MAGIC
}

/// Extract ANCHOR payloads from a Bitcoin transaction
///
/// Returns a vector of (vout, parsed_message) for each valid ANCHOR output
pub fn parse_transaction(tx: &Transaction) -> Vec<(u32, ParsedAnchorMessage)> {
    let mut messages = Vec::new();

    for (vout, output) in tx.output.iter().enumerate() {
        if let Some(msg) = parse_output_script(&output.script_pubkey) {
            messages.push((vout as u32, msg));
        }
    }

    messages
}

/// Try to parse an ANCHOR message from an output script
pub fn parse_output_script(script: &Script) -> Option<ParsedAnchorMessage> {
    // Check if it's an OP_RETURN script
    if !script.is_op_return() {
        return None;
    }

    // Extract the data from OP_RETURN
    let data = extract_op_return_data(script)?;

    // Check for ANCHOR magic and parse
    if is_anchor_payload(&data) {
        parse_anchor_payload(&data).ok()
    } else {
        None
    }
}

/// Extract data bytes from an OP_RETURN script
fn extract_op_return_data(script: &Script) -> Option<Vec<u8>> {
    let mut instructions = script.instructions();
    
    // First instruction should be OP_RETURN
    match instructions.next() {
        Some(Ok(Instruction::Op(bitcoin::opcodes::all::OP_RETURN))) => {}
        _ => return None,
    }

    // Collect all push data
    let mut data = Vec::new();
    for instruction in instructions {
        match instruction {
            Ok(Instruction::PushBytes(bytes)) => {
                data.extend_from_slice(bytes.as_bytes());
            }
            _ => break,
        }
    }

    if data.is_empty() {
        None
    } else {
        Some(data)
    }
}

/// Convert a Txid to its 64-bit prefix
///
/// Note: Bitcoin txids are displayed in reverse byte order.
/// We use the first 8 bytes of the internal representation.
pub fn txid_to_prefix(txid: &Txid) -> [u8; 8] {
    let bytes = txid.as_byte_array();
    let mut prefix = [0u8; 8];
    prefix.copy_from_slice(&bytes[0..8]);
    prefix
}

/// Check if a txid matches a given prefix
pub fn txid_matches_prefix(txid: &Txid, prefix: &[u8; 8]) -> bool {
    txid_to_prefix(txid) == *prefix
}

#[cfg(test)]
mod tests {
    use super::*;
    #[allow(unused_imports)]
    use bitcoin::hashes::Hash;

    #[test]
    fn test_is_anchor_payload() {
        assert!(is_anchor_payload(&[0xA1, 0x1C, 0x00, 0x01, 0x00, 0x00]));
        assert!(!is_anchor_payload(&[0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        assert!(!is_anchor_payload(&[0xA1, 0x1C])); // too short
    }

    #[test]
    fn test_parse_empty_body() {
        let payload = [0xA1, 0x1C, 0x00, 0x01, 0x00, 0x00]; // kind=0, anchors=0, no body
        let msg = parse_anchor_payload(&payload).unwrap();
        assert_eq!(msg.kind, AnchorKind::Generic);
        assert!(msg.anchors.is_empty());
        assert!(msg.body.is_empty());
    }

    #[test]
    fn test_parse_multiple_anchors() {
        let mut payload = vec![0xA1, 0x1C, 0x00, 0x01, 0x01, 0x02]; // kind=1, anchors=2
        
        // First anchor
        payload.extend_from_slice(&[0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
        payload.push(0x00);
        
        // Second anchor
        payload.extend_from_slice(&[0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11]);
        payload.push(0x01);
        
        let msg = parse_anchor_payload(&payload).unwrap();
        assert_eq!(msg.anchors.len(), 2);
        assert_eq!(msg.anchors[0].vout, 0);
        assert_eq!(msg.anchors[1].vout, 1);
    }

    #[test]
    fn test_txid_prefix() {
        // Create a known txid
        let txid = Txid::from_byte_array([
            0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        
        let prefix = txid_to_prefix(&txid);
        assert_eq!(prefix, [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
        assert!(txid_matches_prefix(&txid, &prefix));
    }
}

