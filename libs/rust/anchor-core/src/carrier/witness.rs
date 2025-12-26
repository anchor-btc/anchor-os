//! Witness Data carrier for ANCHOR protocol
//!
//! Embeds ANCHOR data directly in the witness stack of a Taproot spend
//! using a custom Tapscript that includes the data.
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
//! Data is embedded in a Tapscript that drops all data and returns true:
//!
//! ```text
//! Script:
//!   <ANCHOR marker> OP_DROP
//!   <data_chunk_1> OP_DROP
//!   <data_chunk_2> OP_DROP
//!   ...
//!   OP_TRUE
//!
//! Witness Stack:
//!   [0]: <data_chunks...>
//!   [n-1]: <script>
//!   [n]: <control_block>
//! ```

use bitcoin::script::{Builder, PushBytesBuf};
use bitcoin::ScriptBuf;

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, is_anchor_payload, parse_anchor_payload, ParsedAnchorMessage};

/// Witness Data carrier implementation
///
/// Embeds ANCHOR data in the witness stack using a Tapscript.
#[derive(Debug, Clone)]
pub struct WitnessCarrier {
    /// Maximum chunk size for push data
    chunk_size: usize,
}

impl WitnessCarrier {
    /// ANCHOR marker for witness data identification
    pub const MARKER: &'static [u8] = b"ANCHOR";

    /// Maximum push data size in Tapscript
    pub const MAX_PUSH_SIZE: usize = 520;

    /// Maximum witness data size (~4MB)
    pub const MAX_WITNESS_SIZE: usize = 4_000_000;

    /// Create a new witness carrier
    pub fn new() -> Self {
        Self {
            chunk_size: Self::MAX_PUSH_SIZE,
        }
    }

    /// Create with custom chunk size
    pub fn with_chunk_size(chunk_size: usize) -> Self {
        Self { chunk_size }
    }

    /// Build a Tapscript that contains ANCHOR data
    ///
    /// The script drops all data and returns true, making it always spendable.
    pub fn build_data_script(&self, message: &ParsedAnchorMessage) -> CarrierResult<ScriptBuf> {
        let payload = encode_anchor_payload(message);

        let mut builder = Builder::new();

        // Push ANCHOR marker and drop it
        let marker_push = PushBytesBuf::try_from(Self::MARKER.to_vec())
            .map_err(|e| CarrierError::Script(format!("Marker: {}", e)))?;
        builder = builder
            .push_slice(marker_push.as_push_bytes())
            .push_opcode(bitcoin::opcodes::all::OP_DROP);

        // Push payload in chunks and drop each
        for chunk in payload.chunks(self.chunk_size) {
            let chunk_push = PushBytesBuf::try_from(chunk.to_vec())
                .map_err(|e| CarrierError::Script(format!("Chunk: {}", e)))?;
            builder = builder
                .push_slice(chunk_push.as_push_bytes())
                .push_opcode(bitcoin::opcodes::all::OP_DROP);
        }

        // Always succeed - use OP_PUSHNUM_1 which is equivalent to OP_TRUE
        builder = builder.push_opcode(bitcoin::opcodes::all::OP_PUSHNUM_1);

        Ok(builder.into_script())
    }

    /// Split payload into witness stack chunks
    pub fn payload_to_chunks(&self, message: &ParsedAnchorMessage) -> Vec<Vec<u8>> {
        let payload = encode_anchor_payload(message);

        // First chunk is the ANCHOR marker
        let mut chunks = vec![Self::MARKER.to_vec()];

        // Split payload into chunks
        chunks.extend(payload.chunks(self.chunk_size).map(|c| c.to_vec()));

        chunks
    }

    /// Parse ANCHOR data from witness stack
    ///
    /// Looks for the ANCHOR marker and concatenates subsequent data.
    pub fn parse_witness(&self, witness: &[Vec<u8>]) -> CarrierResult<ParsedAnchorMessage> {
        // Strategy 1: Look for ANCHOR marker in witness items
        let mut found_marker = false;
        let mut payload_data = Vec::new();

        for item in witness.iter() {
            if item == Self::MARKER {
                found_marker = true;
                continue;
            }

            if found_marker {
                // Check if this looks like payload data (starts with ANCHOR magic)
                if payload_data.is_empty() && is_anchor_payload(item) {
                    payload_data.extend_from_slice(item);
                } else if !payload_data.is_empty() {
                    // Continue collecting if we started
                    payload_data.extend_from_slice(item);
                }
            }
        }

        if !payload_data.is_empty() {
            return parse_anchor_payload(&payload_data).map_err(CarrierError::from);
        }

        // Strategy 2: Look for script with ANCHOR marker
        for item in witness.iter() {
            if let Some(msg) = self.try_parse_script(item) {
                return Ok(msg);
            }
        }

        // Strategy 3: Look for raw ANCHOR payload in any witness item
        for item in witness.iter() {
            if is_anchor_payload(item) {
                return parse_anchor_payload(item).map_err(CarrierError::from);
            }
        }

        Err(CarrierError::NotFound)
    }

    /// Try to parse ANCHOR data from a script
    fn try_parse_script(&self, data: &[u8]) -> Option<ParsedAnchorMessage> {
        use bitcoin::script::Instruction;

        let script = bitcoin::Script::from_bytes(data);
        let mut instructions = script.instructions();

        // Look for ANCHOR marker
        let mut found_marker = false;
        let mut payload_chunks = Vec::new();

        while let Some(Ok(instruction)) = instructions.next() {
            match instruction {
                Instruction::PushBytes(bytes) => {
                    if bytes.as_bytes() == Self::MARKER {
                        found_marker = true;
                    } else if found_marker {
                        payload_chunks.push(bytes.as_bytes().to_vec());
                    }
                }
                Instruction::Op(bitcoin::opcodes::all::OP_DROP) => {
                    // Expected after each data push
                }
                Instruction::Op(bitcoin::opcodes::all::OP_PUSHNUM_1) => {
                    // End of data script (OP_TRUE / OP_1)
                    break;
                }
                _ => {}
            }
        }

        if payload_chunks.is_empty() {
            return None;
        }

        // Concatenate chunks
        let payload: Vec<u8> = payload_chunks.into_iter().flatten().collect();

        if !is_anchor_payload(&payload) {
            return None;
        }

        parse_anchor_payload(&payload).ok()
    }
}

impl Default for WitnessCarrier {
    fn default() -> Self {
        Self::new()
    }
}

impl Carrier for WitnessCarrier {
    fn info(&self) -> CarrierInfo {
        CarrierInfo {
            carrier_type: CarrierType::WitnessData,
            name: "witness_data",
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

        let script = self.build_data_script(message)?;
        let chunks = self.payload_to_chunks(message);

        Ok(CarrierOutput::WitnessData { chunks, script })
    }

    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage> {
        match input {
            CarrierInput::Witness(witness) => self.parse_witness(witness),
            CarrierInput::Bytes(data) => {
                // Try as script
                if let Some(msg) = self.try_parse_script(data) {
                    return Ok(msg);
                }

                // Try as raw payload
                if is_anchor_payload(data) {
                    return parse_anchor_payload(data).map_err(CarrierError::from);
                }

                Err(CarrierError::NotAnchor)
            }
            _ => Err(CarrierError::InvalidInput),
        }
    }

    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64 {
        // Calculate witness size
        // Each chunk: varint length + data
        let num_chunks = payload_size.div_ceil(self.chunk_size);

        // Marker + chunks
        let items = 1 + num_chunks;

        // Each item has a varint length prefix
        let varint_overhead = items * 2; // Conservative estimate

        // Script overhead: MARKER OP_DROP + (chunk OP_DROP) * N + OP_TRUE
        let script_overhead = Self::MARKER.len() + 1 + (num_chunks * 2) + 1;

        let total_witness = varint_overhead + Self::MARKER.len() + payload_size + script_overhead;

        // Witness discount: 1/4 weight
        let weight_units = total_witness;
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
        let carrier = WitnessCarrier::new();
        let info = carrier.info();

        assert_eq!(info.carrier_type, CarrierType::WitnessData);
        assert_eq!(info.name, "witness_data");
        assert!(info.witness_discount);
        assert!(info.is_prunable);
        assert_eq!(info.status, CarrierStatus::Active);
    }

    #[test]
    fn test_build_data_script() {
        let carrier = WitnessCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello, witness!".to_vec(),
        };

        let script = carrier.build_data_script(&message).unwrap();

        // Script should contain ANCHOR marker
        let script_bytes = script.as_bytes();
        assert!(script_bytes.len() > 20);

        // Should contain ANCHOR marker
        let script_str = String::from_utf8_lossy(script_bytes);
        assert!(
            script_str.contains("ANCHOR")
                || script_bytes.windows(6).any(|w| w == WitnessCarrier::MARKER)
        );
    }

    #[test]
    fn test_payload_to_chunks() {
        let carrier = WitnessCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Test message".to_vec(),
        };

        let chunks = carrier.payload_to_chunks(&message);

        // First chunk should be ANCHOR marker
        assert_eq!(chunks[0], WitnessCarrier::MARKER);

        // Should have at least marker + one data chunk
        assert!(chunks.len() >= 2);
    }

    #[test]
    fn test_encode_produces_witness_output() {
        let carrier = WitnessCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Witness test".to_vec(),
        };

        let output = carrier.encode(&message).unwrap();

        match output {
            CarrierOutput::WitnessData { chunks, script } => {
                assert!(!chunks.is_empty());
                assert!(!script.is_empty());
            }
            _ => panic!("Expected WitnessData output"),
        }
    }

    #[test]
    fn test_decode_from_raw_payload() {
        let carrier = WitnessCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Raw payload test".to_vec(),
        };

        let payload = encode_anchor_payload(&message);
        let input = CarrierInput::Bytes(&payload);

        let decoded = carrier.decode(&input).unwrap();

        assert_eq!(decoded.kind, message.kind);
        assert_eq!(decoded.body, message.body);
    }

    #[test]
    fn test_fee_estimation_with_discount() {
        let carrier = WitnessCarrier::new();

        // 1000 bytes payload
        let fee = carrier.estimate_fee(1000, 4.0);

        // Should be reasonable with witness discount
        assert!(fee > 0);
        assert!(fee < 5000);
    }
}
