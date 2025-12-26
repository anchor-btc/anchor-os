//! Inscription carrier for ANCHOR protocol (Ordinals-style)
//!
//! Embeds ANCHOR data in the witness of a Taproot transaction using
//! the Ordinals envelope format (OP_FALSE OP_IF ... OP_ENDIF).
//!
//! # Characteristics
//!
//! - **Max Size**: ~4MB (witness data limit)
//! - **Prunable**: Yes (witness data can be pruned after validation)
//! - **UTXO Impact**: No
//! - **Witness Discount**: Yes (75% fee discount)
//!
//! # Format
//!
//! ```text
//! OP_FALSE
//! OP_IF
//!   OP_PUSH "anchor"              // Protocol ID
//!   OP_PUSH 1                     // Content-type tag
//!   OP_PUSH "application/anchor"  // MIME type
//!   OP_PUSH 0                     // Body tag
//!   OP_PUSH <payload_chunk_1>     // Data in 520-byte chunks
//!   OP_PUSH <payload_chunk_2>
//!   ...
//! OP_ENDIF
//! ```

use bitcoin::script::{Builder, Instruction, PushBytesBuf};
use bitcoin::ScriptBuf;

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, parse_anchor_payload, AnchorKind, ParsedAnchorMessage};

/// Inscription carrier implementation (Ordinals-style envelope)
#[derive(Debug, Clone)]
pub struct InscriptionCarrier {
    /// Maximum chunk size for push data
    chunk_size: usize,
}

impl InscriptionCarrier {
    /// Protocol identifier for ANCHOR inscriptions
    pub const PROTOCOL_ID: &'static [u8] = b"anchor";

    /// Alternative protocol ID (Ordinals compatibility)
    pub const ORD_PROTOCOL_ID: &'static [u8] = b"ord";

    /// Content-type tag
    pub const CONTENT_TYPE_TAG: u8 = 1;

    /// Body tag
    pub const BODY_TAG: u8 = 0;

    /// Maximum push data size in Tapscript
    pub const MAX_PUSH_SIZE: usize = 520;

    /// Maximum witness data size (~4MB)
    pub const MAX_WITNESS_SIZE: usize = 4_000_000;

    /// Create a new inscription carrier
    pub fn new() -> Self {
        Self {
            chunk_size: Self::MAX_PUSH_SIZE,
        }
    }

    /// Create with custom chunk size
    pub fn with_chunk_size(chunk_size: usize) -> Self {
        Self { chunk_size }
    }

    /// Get content type for ANCHOR message kind
    pub fn content_type_for_kind(kind: AnchorKind) -> &'static str {
        match kind {
            AnchorKind::Generic => "application/octet-stream",
            AnchorKind::Text => "text/plain;charset=utf-8",
            AnchorKind::State => "application/json",
            AnchorKind::Vote => "application/json",
            AnchorKind::Image => "image/png",
            // Oracle types - use binary format
            AnchorKind::Oracle => "application/octet-stream",
            AnchorKind::OracleAttestation => "application/octet-stream",
            AnchorKind::OracleDispute => "application/octet-stream",
            AnchorKind::OracleSlash => "application/octet-stream",
            // Prediction Market types - use binary format
            AnchorKind::MarketCreate => "application/octet-stream",
            AnchorKind::PlaceBet => "application/octet-stream",
            AnchorKind::MarketResolve => "application/octet-stream",
            AnchorKind::ClaimWinnings => "application/octet-stream",
            AnchorKind::Custom(_) => "application/octet-stream",
        }
    }

    /// Build the inscription envelope script
    pub fn build_envelope(&self, message: &ParsedAnchorMessage) -> CarrierResult<ScriptBuf> {
        let payload = encode_anchor_payload(message);
        let content_type = Self::content_type_for_kind(message.kind);

        let mut builder = Builder::new()
            .push_opcode(bitcoin::opcodes::all::OP_PUSHBYTES_0) // OP_FALSE
            .push_opcode(bitcoin::opcodes::all::OP_IF);

        // Push protocol ID
        let protocol_push = PushBytesBuf::try_from(Self::PROTOCOL_ID.to_vec())
            .map_err(|e| CarrierError::Script(format!("Protocol ID: {}", e)))?;
        builder = builder.push_slice(protocol_push.as_push_bytes());

        // Push content-type tag (1)
        builder = builder.push_int(Self::CONTENT_TYPE_TAG as i64);

        // Push content type
        let content_type_push = PushBytesBuf::try_from(content_type.as_bytes().to_vec())
            .map_err(|e| CarrierError::Script(format!("Content type: {}", e)))?;
        builder = builder.push_slice(content_type_push.as_push_bytes());

        // Push body tag (0)
        builder = builder.push_int(Self::BODY_TAG as i64);

        // Push payload in chunks
        for chunk in payload.chunks(self.chunk_size) {
            let chunk_push = PushBytesBuf::try_from(chunk.to_vec())
                .map_err(|e| CarrierError::Script(format!("Payload chunk: {}", e)))?;
            builder = builder.push_slice(chunk_push.as_push_bytes());
        }

        builder = builder.push_opcode(bitcoin::opcodes::all::OP_ENDIF);

        // Add OP_PUSHNUM_1 (same as OP_TRUE) to make the script spendable
        // The envelope (OP_FALSE OP_IF ... OP_ENDIF) is a no-op that preserves the inscription data
        // OP_PUSHNUM_1 ensures the script succeeds with exactly one truthy value on the stack
        builder = builder.push_opcode(bitcoin::opcodes::all::OP_PUSHNUM_1);

        Ok(builder.into_script())
    }

    /// Parse inscription envelope from witness stack
    pub fn parse_envelope(&self, witness: &[Vec<u8>]) -> CarrierResult<ParsedAnchorMessage> {
        // Find the script in witness (usually second-to-last item before control block)
        // The envelope is typically in the script itself, not as separate witness items

        for item in witness.iter().rev() {
            if let Some(msg) = self.try_parse_script_envelope(item) {
                return Ok(msg);
            }
        }

        Err(CarrierError::NotFound)
    }

    /// Try to parse an envelope from script bytes
    fn try_parse_script_envelope(&self, data: &[u8]) -> Option<ParsedAnchorMessage> {
        // Look for OP_FALSE OP_IF pattern
        if data.len() < 10 {
            return None;
        }

        // Try to parse as a script and look for envelope
        let script = bitcoin::Script::from_bytes(data);
        let mut instructions = script.instructions().peekable();

        // Look for OP_FALSE (0x00) or OP_0
        loop {
            match instructions.next() {
                Some(Ok(Instruction::PushBytes(bytes))) if bytes.is_empty() => {
                    // Found OP_FALSE / OP_0
                    break;
                }
                Some(Ok(Instruction::Op(bitcoin::opcodes::all::OP_PUSHBYTES_0))) => {
                    break;
                }
                Some(Ok(_)) => continue, // Skip other instructions
                _ => return None,
            }
        }

        // Next should be OP_IF
        match instructions.next() {
            Some(Ok(Instruction::Op(bitcoin::opcodes::all::OP_IF))) => {}
            _ => return None,
        }

        // Next should be protocol ID
        let protocol_id = match instructions.next() {
            Some(Ok(Instruction::PushBytes(bytes))) => bytes.as_bytes(),
            _ => return None,
        };

        // Check if it's an ANCHOR inscription
        if protocol_id != Self::PROTOCOL_ID && protocol_id != Self::ORD_PROTOCOL_ID {
            return None;
        }

        // Parse tags and body
        let mut body_data = Vec::new();
        let mut in_body = false;

        while let Some(Ok(instruction)) = instructions.next() {
            match instruction {
                Instruction::Op(bitcoin::opcodes::all::OP_ENDIF) => break,
                Instruction::PushBytes(bytes) => {
                    // Empty push (OP_0) indicates body tag - start of body data
                    if bytes.is_empty() {
                        in_body = true;
                    } else if in_body {
                        body_data.extend_from_slice(bytes.as_bytes());
                    }
                }
                Instruction::Op(op) => {
                    // Check for body tag (OP_0) as explicit opcode
                    if op == bitcoin::opcodes::all::OP_PUSHBYTES_0 {
                        in_body = true;
                    }
                }
            }
        }

        if body_data.is_empty() {
            return None;
        }

        // Try to parse as ANCHOR payload
        parse_anchor_payload(&body_data).ok()
    }
}

impl Default for InscriptionCarrier {
    fn default() -> Self {
        Self::new()
    }
}

impl Carrier for InscriptionCarrier {
    fn info(&self) -> CarrierInfo {
        CarrierInfo {
            carrier_type: CarrierType::Inscription,
            name: "inscription",
            max_size: Self::MAX_WITNESS_SIZE,
            is_prunable: true,
            utxo_impact: false,
            witness_discount: true,
            status: CarrierStatus::Active,
        }
    }

    fn encode(&self, message: &ParsedAnchorMessage) -> CarrierResult<CarrierOutput> {
        let payload = encode_anchor_payload(message);

        if payload.len() > Self::MAX_WITNESS_SIZE {
            return Err(CarrierError::PayloadTooLarge {
                size: payload.len(),
                limit: Self::MAX_WITNESS_SIZE,
            });
        }

        let reveal_script = self.build_envelope(message)?;
        let content_type = Self::content_type_for_kind(message.kind).to_string();

        Ok(CarrierOutput::Inscription {
            reveal_script,
            content_type,
        })
    }

    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage> {
        match input {
            CarrierInput::Witness(witness) => self.parse_envelope(witness),
            CarrierInput::Bytes(data) => self
                .try_parse_script_envelope(data)
                .ok_or(CarrierError::NotAnchor),
            _ => Err(CarrierError::InvalidInput),
        }
    }

    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64 {
        // Inscription requires commit + reveal transaction pattern
        // Here we estimate just the reveal transaction witness cost

        // Envelope overhead:
        // - OP_FALSE (1) + OP_IF (1)
        // - Protocol ID push (~8)
        // - Content-type tag + value (~30)
        // - Body tag (1)
        // - OP_ENDIF (1)
        let envelope_overhead = 50;

        // Chunk overhead: each 520-byte chunk needs push opcode
        let num_chunks = payload_size.div_ceil(self.chunk_size);
        let chunk_overhead = num_chunks * 3; // OP_PUSHDATA2 + 2 length bytes

        let witness_size = envelope_overhead + chunk_overhead + payload_size;

        // Witness discount: 1/4 weight
        let weight_units = witness_size;
        let vbytes = weight_units.div_ceil(4);

        (vbytes as f64 * fee_rate).ceil() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_carrier_info() {
        let carrier = InscriptionCarrier::new();
        let info = carrier.info();

        assert_eq!(info.carrier_type, CarrierType::Inscription);
        assert_eq!(info.name, "inscription");
        assert!(info.witness_discount);
        assert!(info.is_prunable);
    }

    #[test]
    fn test_content_type_mapping() {
        assert_eq!(
            InscriptionCarrier::content_type_for_kind(AnchorKind::Text),
            "text/plain;charset=utf-8"
        );
        assert_eq!(
            InscriptionCarrier::content_type_for_kind(AnchorKind::Image),
            "image/png"
        );
        assert_eq!(
            InscriptionCarrier::content_type_for_kind(AnchorKind::Generic),
            "application/octet-stream"
        );
    }

    #[test]
    fn test_build_envelope() {
        let carrier = InscriptionCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello, ANCHOR inscription!".to_vec(),
        };

        let result = carrier.build_envelope(&message);
        assert!(result.is_ok());

        let script = result.unwrap();
        // Check that it's a valid script with OP_IF...OP_ENDIF
        let script_bytes = script.as_bytes();
        assert!(script_bytes.len() > 20);
    }

    #[test]
    fn test_encode_produces_inscription_output() {
        let carrier = InscriptionCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Test inscription".to_vec(),
        };

        let output = carrier.encode(&message).unwrap();

        match output {
            CarrierOutput::Inscription {
                reveal_script,
                content_type,
            } => {
                assert!(!reveal_script.is_empty());
                assert_eq!(content_type, "text/plain;charset=utf-8");
            }
            _ => panic!("Expected Inscription output"),
        }
    }

    #[test]
    fn test_fee_estimation_with_discount() {
        let carrier = InscriptionCarrier::new();

        // 100 bytes payload
        let fee = carrier.estimate_fee(100, 4.0);

        // With witness discount, should be cheaper than OP_RETURN
        // (100 + 50 overhead) / 4 * 4 = ~150 sats
        assert!(fee > 0);
        assert!(fee < 1000); // Reasonable range
    }
}
