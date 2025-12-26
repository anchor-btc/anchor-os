//! OP_RETURN transaction builder

use anyhow::{Context, Result};
use bitcoin::ScriptBuf;
use bitcoincore_rpc::RpcApi;
use tracing::debug;

use crate::wallet::service::WalletService;
use crate::wallet::types::CreatedTransaction;
use crate::wallet::utils::{carrier_name, extract_op_return_data};

/// Create and broadcast a transaction with the given OP_RETURN script
pub fn create_and_broadcast_tx_with_script(
    wallet: &WalletService,
    op_return_script: ScriptBuf,
    carrier_type: u8,
    fee_rate: u64, // sat/vbyte
) -> Result<CreatedTransaction> {
    // Get a change address
    let change_address = wallet.rpc.get_new_address(None, None)?;
    let change_address = change_address.assume_checked();

    // Convert sat/vbyte to BTC/kB for fundrawtransaction
    // 1 sat/vbyte = 0.00001 BTC/kB (1 sat = 0.00000001 BTC, 1 vbyte = 1/1000 kB)
    let fee_rate_btc_kb = fee_rate as f64 * 0.00001;

    // Create raw transaction with OP_RETURN output
    // We need to use the RPC call directly for complex output handling
    let raw_tx: String = wallet.rpc.call(
        "createrawtransaction",
        &[
            serde_json::json!([]),
            serde_json::json!([
                { "data": hex::encode(extract_op_return_data(&op_return_script)) }
            ]),
        ],
    )?;

    // Fund the transaction
    let funded: serde_json::Value = wallet.rpc.call(
        "fundrawtransaction",
        &[
            serde_json::json!(raw_tx),
            serde_json::json!({
                "changeAddress": change_address.to_string(),
                "feeRate": fee_rate_btc_kb
            }),
        ],
    )?;

    let funded_hex = funded["hex"].as_str().context("No hex in funded tx")?;

    // Sign the transaction
    let signed: serde_json::Value = wallet.rpc.call(
        "signrawtransactionwithwallet",
        &[serde_json::json!(funded_hex)],
    )?;

    if !signed["complete"].as_bool().unwrap_or(false) {
        anyhow::bail!("Transaction signing incomplete");
    }

    let signed_hex = signed["hex"].as_str().context("No hex in signed tx")?;

    // Broadcast the transaction
    let txid: String = wallet
        .rpc
        .call("sendrawtransaction", &[serde_json::json!(signed_hex)])?;

    debug!("Broadcast transaction: {}", txid);

    // Find the OP_RETURN output index
    let decoded: serde_json::Value = wallet
        .rpc
        .call("decoderawtransaction", &[serde_json::json!(signed_hex)])?;

    let mut anchor_vout = 0u32;
    if let Some(outputs) = decoded["vout"].as_array() {
        for (i, output) in outputs.iter().enumerate() {
            if let Some(script_type) = output["scriptPubKey"]["type"].as_str() {
                if script_type == "nulldata" {
                    anchor_vout = i as u32;
                    break;
                }
            }
        }
    }

    Ok(CreatedTransaction {
        txid,
        hex: signed_hex.to_string(),
        anchor_vout,
        carrier: carrier_type,
        carrier_name: carrier_name(carrier_type).to_string(),
    })
}
