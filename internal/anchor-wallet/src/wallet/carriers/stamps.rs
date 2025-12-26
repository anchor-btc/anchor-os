//! Stamps (bare multisig) transaction builder

use anyhow::Result;
use bitcoin::consensus::encode::serialize_hex;
use bitcoin::transaction::Version;
use bitcoin::{
    absolute::LockTime, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Witness,
};
use bitcoincore_rpc::RpcApi;
use std::collections::HashSet;
use tracing::{debug, info};

use crate::wallet::service::WalletService;
use crate::wallet::types::CreatedTransaction;

/// Create and broadcast a Stamps transaction with bare multisig outputs
/// Builds the transaction manually since Bitcoin Core RPC doesn't support custom scriptPubKey
pub fn create_and_broadcast_stamps_tx(
    wallet: &WalletService,
    scripts: Vec<ScriptBuf>,
    fee_rate: u64,
    locked_set: Option<&HashSet<(String, u32)>>,
) -> Result<CreatedTransaction> {
    // Get UTXOs (excluding locked ones if provided)
    let utxos = wallet.list_unspent_unlocked(Some(0), locked_set)?;
    if utxos.is_empty() {
        anyhow::bail!("No UTXOs available for Stamps transaction");
    }

    // Calculate required amount: dust for each output + fee
    // Bare multisig outputs have higher dust thresholds than P2PKH
    let dust_per_output = 1000u64; // satoshis (higher for bare multisig)
    let total_dust = dust_per_output * scripts.len() as u64;
    // Estimate vbytes and calculate fee (rough estimate: 150 base + 40 per output)
    let estimated_vbytes = 150 + scripts.len() as u64 * 40;
    let estimated_fee = std::cmp::max(15000, estimated_vbytes * fee_rate);
    let required = total_dust + estimated_fee;

    // Find UTXOs to cover the required amount
    let mut selected_utxos = Vec::new();
    let mut total_input = 0u64;

    for utxo in &utxos {
        let value = utxo.amount.to_sat();
        selected_utxos.push(utxo);
        total_input += value;
        if total_input >= required + 546 {
            // Need dust for change too
            break;
        }
    }

    if total_input < required {
        anyhow::bail!(
            "Insufficient funds for Stamps: need {} sats, have {}",
            required,
            total_input
        );
    }

    // Get change address
    let change_address = wallet.rpc.get_new_address(None, None)?;
    let change_address = change_address.assume_checked();

    // Build inputs
    let inputs: Vec<TxIn> = selected_utxos
        .iter()
        .map(|utxo| TxIn {
            previous_output: OutPoint {
                txid: utxo.txid,
                vout: utxo.vout,
            },
            script_sig: ScriptBuf::new(),
            sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
            witness: Witness::new(),
        })
        .collect();

    // Build outputs: Stamps multisig outputs + change
    let mut outputs: Vec<TxOut> = scripts
        .iter()
        .map(|script| TxOut {
            value: Amount::from_sat(dust_per_output),
            script_pubkey: script.clone(),
        })
        .collect();

    // Add change output
    let change_value = total_input - total_dust - estimated_fee;
    if change_value >= 546 {
        outputs.push(TxOut {
            value: Amount::from_sat(change_value),
            script_pubkey: change_address.script_pubkey(),
        });
    }

    // Build unsigned transaction
    let unsigned_tx = Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: inputs,
        output: outputs,
    };

    let unsigned_hex = serialize_hex(&unsigned_tx);
    debug!(
        "Built unsigned Stamps transaction: {} bytes",
        unsigned_hex.len() / 2
    );

    // Sign using wallet
    let signed: serde_json::Value = wallet.rpc.call(
        "signrawtransactionwithwallet",
        &[serde_json::json!(unsigned_hex)],
    )?;

    if !signed["complete"].as_bool().unwrap_or(false) {
        anyhow::bail!("Stamps transaction signing incomplete");
    }

    let signed_hex = signed["hex"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No hex in signed tx"))?;

    // Broadcast
    let txid: String = wallet
        .rpc
        .call("sendrawtransaction", &[serde_json::json!(signed_hex)])?;

    info!(
        "Broadcast Stamps transaction: {} with {} multisig outputs",
        txid,
        scripts.len()
    );

    Ok(CreatedTransaction {
        txid,
        hex: signed_hex.to_string(),
        anchor_vout: 0,
        carrier: 2,
        carrier_name: "stamps".to_string(),
    })
}
