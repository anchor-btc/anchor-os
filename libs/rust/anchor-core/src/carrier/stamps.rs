//! Stamps carrier for ANCHOR protocol (Permanent Storage)
//!
//! Embeds ANCHOR data using bare multisig outputs, making data permanently
//! stored in the UTXO set and impossible to prune.
//!
//! # Characteristics
//!
//! - **Max Size**: ~8KB practical limit
//! - **Prunable**: **NO** - Data is stored in UTXO set permanently
//! - **UTXO Impact**: **YES** - Creates unspendable UTXOs
//! - **Witness Discount**: No
//!
//! # Format
//!
//! Data is encoded as fake public keys in a 1-of-N multisig:
//!
//! ```text
//! OP_1
//!   <33-byte-chunk-1>   // 0x02 or 0x03 prefix + 31 bytes data
//!   <33-byte-chunk-2>
//!   <burn-pubkey>       // 0x0222...2222 (unspendable)
//! OP_N
//! OP_CHECKMULTISIG
//! ```

use bitcoin::script::Builder;
use bitcoin::ScriptBuf;

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, is_anchor_payload, parse_anchor_payload, ParsedAnchorMessage};

/// Stamps carrier implementation (permanent bare multisig storage)
#[derive(Debug, Clone)]
pub struct StampsCarrier {
    /// Maximum data keys per multisig script
    max_keys_per_script: usize,
}

impl StampsCarrier {
    /// Burn public key (unspendable) - 0x02 followed by 32 bytes of 0x22
    pub const BURN_PUBKEY: [u8; 33] = [
        0x02, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
        0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
        0x22, 0x22, 0x22,
    ];

    /// ANCHOR marker for stamps (first chunk identifier)
    pub const ANCHOR_MARKER: [u8; 6] = *b"ANCHOR";

    /// Data bytes per chunk (33 byte pubkey - 1 byte prefix - 1 byte padding)
    pub const DATA_PER_CHUNK: usize = 31;

    /// Maximum keys in a multisig (Bitcoin limit is 20 for bare multisig)
    pub const MAX_MULTISIG_KEYS: usize = 20;

    /// Practical maximum size (~8KB)
    pub const MAX_SIZE: usize = 8_000;

    /// Create a new stamps carrier
    pub fn new() -> Self {
        Self {
            // Use 2 data keys + 1 burn key = 3 keys per script (1-of-3)
            max_keys_per_script: 2,
        }
    }

    /// Create with custom keys per script
    pub fn with_keys_per_script(max_keys: usize) -> Self {
        Self {
            max_keys_per_script: max_keys.min(Self::MAX_MULTISIG_KEYS - 1),
        }
    }

    /// Encode a data chunk as a fake public key
    ///
    /// Format: [prefix (0x02/0x03)] [31 bytes data]
    pub fn encode_chunk(data: &[u8]) -> [u8; 33] {
        assert!(data.len() <= Self::DATA_PER_CHUNK);

        let mut pubkey = [0u8; 33];

        // Use 0x02 or 0x03 prefix based on first data byte for valid-looking pubkey
        pubkey[0] = if !data.is_empty() && data[0] & 1 == 0 {
            0x02
        } else {
            0x03
        };

        // Copy data (padded with zeros if shorter)
        pubkey[1..1 + data.len()].copy_from_slice(data);

        pubkey
    }

    /// Decode a fake public key back to data
    pub fn decode_chunk(pubkey: &[u8; 33]) -> Vec<u8> {
        // Skip the 0x02/0x03 prefix
        pubkey[1..].to_vec()
    }

    /// Build a multisig script containing data chunks
    fn build_multisig_script(&self, chunks: &[[u8; 33]]) -> CarrierResult<ScriptBuf> {
        if chunks.is_empty() {
            return Err(CarrierError::Custom("No data chunks provided".into()));
        }

        if chunks.len() > self.max_keys_per_script {
            return Err(CarrierError::Custom(format!(
                "Too many chunks: {} > {}",
                chunks.len(),
                self.max_keys_per_script
            )));
        }

        let mut builder = Builder::new().push_int(1); // 1-of-N

        // Add data chunks as fake pubkeys
        for chunk in chunks {
            builder = builder.push_slice(chunk);
        }

        // Add burn pubkey (makes it unspendable)
        builder = builder.push_slice(Self::BURN_PUBKEY);

        // Total keys = data chunks + burn key
        let total_keys = (chunks.len() + 1) as i64;
        builder = builder.push_int(total_keys);

        builder = builder.push_opcode(bitcoin::opcodes::all::OP_CHECKMULTISIG);

        Ok(builder.into_script())
    }

    /// Parse a stamps multisig script to extract data
    fn parse_multisig_script(&self, script: &bitcoin::Script) -> Option<Vec<u8>> {
        use bitcoin::script::Instruction;

        let mut instructions = script.instructions();
        let mut pubkeys: Vec<[u8; 33]> = Vec::new();

        // First instruction should be OP_1 (1-of-N)
        match instructions.next() {
            Some(Ok(Instruction::Op(bitcoin::opcodes::all::OP_PUSHNUM_1))) => {}
            _ => return None,
        }

        // Collect pubkeys until we hit a number
        loop {
            match instructions.next() {
                Some(Ok(Instruction::PushBytes(bytes))) => {
                    if bytes.len() == 33 {
                        let mut pubkey = [0u8; 33];
                        pubkey.copy_from_slice(bytes.as_bytes());

                        // Skip burn pubkey
                        if pubkey != Self::BURN_PUBKEY {
                            pubkeys.push(pubkey);
                        }
                    }
                }
                Some(Ok(Instruction::Op(_))) => break,
                _ => return None,
            }
        }

        if pubkeys.is_empty() {
            return None;
        }

        // Decode chunks and concatenate
        let mut data = Vec::new();
        for pubkey in &pubkeys {
            data.extend_from_slice(&Self::decode_chunk(pubkey));
        }

        Some(data)
    }
}

impl Default for StampsCarrier {
    fn default() -> Self {
        Self::new()
    }
}

impl Carrier for StampsCarrier {
    fn info(&self) -> CarrierInfo {
        CarrierInfo {
            carrier_type: CarrierType::Stamps,
            name: "stamps",
            max_size: Self::MAX_SIZE,
            is_prunable: false, // PERMANENT!
            utxo_impact: true,  // Creates unspendable UTXOs
            witness_discount: false,
            status: CarrierStatus::Active,
        }
    }

    fn encode(&self, message: &ParsedAnchorMessage) -> CarrierResult<CarrierOutput> {
        let payload = encode_anchor_payload(message);

        if payload.len() > Self::MAX_SIZE {
            return Err(CarrierError::PayloadTooLarge {
                size: payload.len(),
                limit: Self::MAX_SIZE,
            });
        }

        // Split payload into 31-byte chunks
        let chunks: Vec<[u8; 33]> = payload
            .chunks(Self::DATA_PER_CHUNK)
            .map(Self::encode_chunk)
            .collect();

        // Group chunks into multisig scripts
        let scripts: Vec<ScriptBuf> = chunks
            .chunks(self.max_keys_per_script)
            .map(|group| self.build_multisig_script(group))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(CarrierOutput::Stamps(scripts))
    }

    fn decode(&self, input: &CarrierInput) -> CarrierResult<ParsedAnchorMessage> {
        match input {
            CarrierInput::Script(script) => {
                let data = self
                    .parse_multisig_script(script)
                    .ok_or(CarrierError::NotFound)?;

                if !is_anchor_payload(&data) {
                    return Err(CarrierError::NotAnchor);
                }

                parse_anchor_payload(&data).map_err(CarrierError::from)
            }
            CarrierInput::Transaction { tx, vout } => {
                // For stamps, we may need to collect data from multiple outputs
                let mut all_data = Vec::new();

                // Start from the specified vout and collect consecutive stamps outputs
                for output in tx.output.iter().skip(*vout as usize) {
                    if let Some(data) = self.parse_multisig_script(&output.script_pubkey) {
                        all_data.extend(data);
                    } else {
                        break; // Stop at first non-stamps output
                    }
                }

                if all_data.is_empty() {
                    return Err(CarrierError::NotFound);
                }

                // Trim trailing zeros (padding)
                while all_data.last() == Some(&0) && all_data.len() > 6 {
                    all_data.pop();
                }

                if !is_anchor_payload(&all_data) {
                    return Err(CarrierError::NotAnchor);
                }

                parse_anchor_payload(&all_data).map_err(CarrierError::from)
            }
            _ => Err(CarrierError::InvalidInput),
        }
    }

    fn estimate_fee(&self, payload_size: usize, fee_rate: f64) -> u64 {
        // Calculate number of chunks needed
        let num_chunks = payload_size.div_ceil(Self::DATA_PER_CHUNK);

        // Calculate number of outputs needed
        let num_outputs = num_chunks.div_ceil(self.max_keys_per_script);

        // Each output: 8 (value) + 1 (script_len varint) + script
        // Script: 1 (OP_1) + N*(1 + 33) + 1 (OP_N) + 1 (OP_CHECKMULTISIG)
        let keys_per_output = self.max_keys_per_script + 1; // +1 for burn key
        let script_size = 1 + keys_per_output * 34 + 2;
        let output_size = 8 + 1 + script_size;

        let total_size = num_outputs * output_size;

        // No witness discount for bare multisig
        (total_size as f64 * fee_rate).ceil() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AnchorKind;

    #[test]
    fn test_carrier_info() {
        let carrier = StampsCarrier::new();
        let info = carrier.info();

        assert_eq!(info.carrier_type, CarrierType::Stamps);
        assert_eq!(info.name, "stamps");
        assert!(!info.is_prunable); // PERMANENT
        assert!(info.utxo_impact);
        assert!(!info.witness_discount);
    }

    #[test]
    fn test_encode_chunk() {
        let data = b"Hello, Stamps!";
        let chunk = StampsCarrier::encode_chunk(data);

        assert_eq!(chunk.len(), 33);
        assert!(chunk[0] == 0x02 || chunk[0] == 0x03);
        assert_eq!(&chunk[1..1 + data.len()], data);
    }

    #[test]
    fn test_chunk_roundtrip() {
        let original = b"Test data chunk";
        let encoded = StampsCarrier::encode_chunk(original);
        let decoded = StampsCarrier::decode_chunk(&encoded);

        assert_eq!(&decoded[..original.len()], original);
    }

    #[test]
    fn test_encode_small_message() {
        let carrier = StampsCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello, Stamps!".to_vec(),
        };

        let output = carrier.encode(&message).unwrap();

        match output {
            CarrierOutput::Stamps(scripts) => {
                assert!(!scripts.is_empty());
                // Small message should fit in one script
                assert_eq!(scripts.len(), 1);
            }
            _ => panic!("Expected Stamps output"),
        }
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let carrier = StampsCarrier::new();

        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Permanent ANCHOR message".to_vec(),
        };

        let output = carrier.encode(&message).unwrap();
        let CarrierOutput::Stamps(scripts) = output else {
            panic!("Expected Stamps output");
        };

        // Decode from first script
        let input = CarrierInput::Script(&scripts[0]);
        let decoded = carrier.decode(&input).unwrap();

        assert_eq!(decoded.kind, message.kind);
        // Note: Stamps may have trailing zeros due to 31-byte chunk padding
        // The decoded body contains the original message at the start
        assert!(decoded.body.starts_with(&message.body));
        // Verify any extra bytes are just padding zeros
        for &b in &decoded.body[message.body.len()..] {
            assert_eq!(b, 0, "Extra bytes should be zero padding");
        }
    }

    #[test]
    fn test_fee_estimation_expensive() {
        let carrier = StampsCarrier::new();

        // Stamps should be more expensive than OP_RETURN
        let stamps_fee = carrier.estimate_fee(50, 1.0);

        // Should be relatively high due to multisig overhead
        assert!(stamps_fee > 100);
    }
}
