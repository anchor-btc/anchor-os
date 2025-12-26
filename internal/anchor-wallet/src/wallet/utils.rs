//! Wallet utility functions

use bitcoin::ScriptBuf;

/// Get carrier name from type
pub fn carrier_name(carrier: u8) -> &'static str {
    match carrier {
        0 => "op_return",
        1 => "inscription",
        2 => "stamps",
        3 => "taproot_annex",
        4 => "witness_data",
        _ => "unknown",
    }
}

/// Extract data from an OP_RETURN script
pub fn extract_op_return_data(script: &ScriptBuf) -> Vec<u8> {
    let bytes = script.as_bytes();
    // Skip OP_RETURN (0x6a) and the push opcode
    if bytes.len() > 2 && bytes[0] == 0x6a {
        // Handle different push opcodes
        if bytes[1] <= 0x4b {
            // Direct push
            let len = bytes[1] as usize;
            if bytes.len() >= 2 + len {
                return bytes[2..2 + len].to_vec();
            }
        } else if bytes[1] == 0x4c {
            // OP_PUSHDATA1
            if bytes.len() > 3 {
                let len = bytes[2] as usize;
                if bytes.len() >= 3 + len {
                    return bytes[3..3 + len].to_vec();
                }
            }
        } else if bytes[1] == 0x4d {
            // OP_PUSHDATA2
            if bytes.len() > 4 {
                let len = u16::from_le_bytes([bytes[2], bytes[3]]) as usize;
                if bytes.len() >= 4 + len {
                    return bytes[4..4 + len].to_vec();
                }
            }
        }
    }
    bytes.to_vec()
}
