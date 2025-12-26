//! OP_RETURN carrier for ANCHOR protocol
//!
//! This is the default and simplest carrier for ANCHOR messages.
//! Data is embedded directly in an OP_RETURN output.
//!
//! # Characteristics
//!
//! - **Max Size**: 80 bytes (legacy) or up to 100KB (v30+)
//! - **Prunable**: Yes (unspendable outputs can be pruned)
//! - **UTXO Impact**: No (OP_RETURN outputs are not added to UTXO set)
//! - **Witness Discount**: No
//!
//! # Format
//!
//! ```text
//! OP_RETURN <ANCHOR_MAGIC> <kind> <anchor_count> <anchors...> <body>
//! ```

use bitcoin::script::{Builder, Instruction, PushBytesBuf};
use bitcoin::ScriptBuf;

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, is_anchor_payload, parse_anchor_payload, ParsedAnchorMessage};

/// OP_RETURN carrier implementation
///
/// The default carrier for ANCHOR messages, embedding data in an OP_RETURN output.
#[derive(Debug, Clone)]
pub struct OpReturnCarrier {
    /// Maximum payload size (80 for legacy, up to 100_000 for v30+)
    max_size: usize,
}

impl OpReturnCarrier {
    /// Legacy OP_RETURN limit (80 bytes)
    pub const LEGACY_LIMIT: usize = 80;

    /// Extended limit for Bitcoin Core v30+ (100 KB)
    pub const EXTENDED_LIMIT: usize = 100_000;

    /// Create a new OP_RETURN carrier with extended limit (v30+)
    pub fn new() -> Self {
        Self {
            max_size: Self::EXTENDED_LIMIT,
        }
    }

    /// Create a new OP_RETURN carrier with legacy limit (80 bytes)
    pub fn legacy() -> Self {
        Self {
            max_size: Self::LEGACY_LIMIT,
        }
    }

    /// Create with extended limit (v30+)
    pub fn extended() -> Self {
        Self {
            max_size: Self::EXTENDED_LIMIT,
        }
    }

    /// Create with custom limit
    pub fn with_limit(max_size: usize) -> Self {
        Self { max_size }
    }

    /// Build an OP_RETURN script from raw payload bytes
    pub fn build_script(payload: &[u8]) -> CarrierResult<ScriptBuf> {
        let push_bytes = PushBytesBuf::try_from(payload.to_vec())
            .map_err(|e| CarrierError::Script(format!("Failed to create push bytes: {}", e)))?;

        let script = Builder::new()
            .push_opcode(bitcoin::opcodes::all::OP_RETURN)
            .push_slice(push_bytes.as_push_bytes())
            .into_script();

        Ok(script)
    }

    /// Extract data from an OP_RETURN script
    pub fn extract_data(script: &bitcoin::Script) -> Option<Vec<u8>> {
        if !script.is_op_return() {
            return None;
        }

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
}

impl Default for OpReturnCarrier {
    fn default() -> Self {
        Self::new()
    }
}

impl Carrier for OpReturnCarrier {
    fn info(&self) -> CarrierInfo {
        CarrierInfo {
            carrier_type: CarrierType::OpReturn,
            name: "op_return",
            max_size: self.max_size,
            is_prunable: true,
            utxo_impact: false,
            witness_discount: false,
            status: CarrierStatus::Active,
        }
    }

    fn encode(&self, message: &ParsedAnchorMessage) -> CarrierResult<CarrierOutput> {
        let payload = encode_anchor_payload(message);

        if payload.len() > self.max_size {
            return Err(CarrierError::PayloadTooLarge {
                size: payload.len(),
                limit: self.max_size,
            });
        }

        let script = Self::build_script(&payload)?;
        Ok(CarrierOutput::OpReturn(script))
    }

    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage> {
        let data = match input {
            CarrierInput::Script(script) => {
                Self::extract_data(script).ok_or(CarrierError::NotFound)?
            }
            CarrierInput::Transaction { tx, vout } => {
                let output = tx
                    .output
                    .get(*vout as usize)
                    .ok_or(CarrierError::NotFound)?;
                Self::extract_data(&output.script_pubkey).ok_or(CarrierError::NotFound)?
            }
            CarrierInput::Bytes(data) => data.to_vec(),
            CarrierInput::Witness(_) => return Err(CarrierError::InvalidInput),
        };

        if !is_anchor_payload(&data) {
            return Err(CarrierError::NotAnchor);
        }

        parse_anchor_payload(&data).map_err(CarrierError::from)
    }

    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64 {
        // OP_RETURN output structure:
        // - 8 bytes: value (0)
        // - 1 byte: script length varint (for small scripts)
        // - 1 byte: OP_RETURN
        // - 1 byte: push opcode (OP_PUSHDATA1 for > 75 bytes)
        // - N bytes: payload

        let script_size = if payload_size <= 75 {
            1 + 1 + payload_size // OP_RETURN + push opcode + data
        } else if payload_size <= 255 {
            1 + 2 + payload_size // OP_RETURN + OP_PUSHDATA1 + length + data
        } else {
            1 + 3 + payload_size // OP_RETURN + OP_PUSHDATA2 + length + data
        };

        let output_size = 8 + 1 + script_size; // value + script_len + script

        // No witness discount for OP_RETURN
        let vbytes = output_size;

        (vbytes as f64 * fee_rate).ceil() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AnchorKind;

    #[test]
    fn test_carrier_info() {
        let carrier = OpReturnCarrier::new();
        let info = carrier.info();

        assert_eq!(info.carrier_type, CarrierType::OpReturn);
        assert_eq!(info.name, "op_return");
        assert_eq!(info.max_size, OpReturnCarrier::EXTENDED_LIMIT);
        assert!(info.is_prunable);
        assert!(!info.utxo_impact);
        assert!(!info.witness_discount);
        assert_eq!(info.status, CarrierStatus::Active);
    }

    #[test]
    fn test_extended_carrier() {
        let carrier = OpReturnCarrier::extended();
        assert_eq!(carrier.info().max_size, 100_000);
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let carrier = OpReturnCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello, ANCHOR!".to_vec(),
        };

        let output = carrier.encode(&message).unwrap();
        let CarrierOutput::OpReturn(script) = output else {
            panic!("Expected OpReturn output");
        };

        assert!(script.is_op_return());

        // Decode
        let input = CarrierInput::Script(&script);
        let decoded = carrier.decode(&input).unwrap();

        assert_eq!(decoded.kind, message.kind);
        assert_eq!(decoded.anchors.len(), message.anchors.len());
        assert_eq!(decoded.body, message.body);
    }

    #[test]
    fn test_payload_too_large() {
        let carrier = OpReturnCarrier::legacy();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: vec![0u8; 100], // Too large for 80 byte legacy limit
        };

        let result = carrier.encode(&message);
        assert!(matches!(result, Err(CarrierError::PayloadTooLarge { .. })));
    }

    #[test]
    fn test_fee_estimation() {
        let carrier = OpReturnCarrier::new();

        // Small payload (< 75 bytes)
        let fee_small = carrier.estimate_fee(20, 1.0);
        // 8 (value) + 1 (script_len) + 1 (OP_RETURN) + 1 (push) + 20 (data) = 31 bytes
        assert_eq!(fee_small, 31);

        // Medium payload (> 75 bytes)
        let fee_medium = carrier.estimate_fee(100, 1.0);
        // 8 (value) + 1 (script_len) + 1 (OP_RETURN) + 2 (OP_PUSHDATA1) + 100 (data) = 112 bytes
        assert_eq!(fee_medium, 112);
    }

    #[test]
    fn test_invalid_input() {
        let carrier = OpReturnCarrier::new();

        let witness_input = CarrierInput::Witness(&[]);
        let result = carrier.decode(&witness_input);
        assert!(matches!(result, Err(CarrierError::InvalidInput)));
    }
}
