//! Witness Data (Taproot commit+reveal) transaction builder

use anyhow::{Context, Result};
use bitcoin::consensus::encode::serialize_hex;
use bitcoin::key::UntweakedKeypair;
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::taproot::{LeafVersion, TaprootBuilder, TaprootSpendInfo};
use bitcoin::transaction::Version;
use bitcoin::{
    absolute::LockTime, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Txid,
    Witness, XOnlyPublicKey,
};
use bitcoincore_rpc::RpcApi;
use std::collections::HashSet;
use std::str::FromStr;
use tracing::{debug, info};

use crate::wallet::service::WalletService;
use crate::wallet::types::CreatedTransaction;

/// Create and broadcast a WitnessData transaction using commit+reveal pattern
/// Similar to inscriptions but uses a simpler data script (data drops + OP_TRUE)
pub fn create_and_broadcast_witness_data_tx(
    wallet: &WalletService,
    data_script: ScriptBuf,
    fee_rate: u64,
    locked_set: Option<&HashSet<(String, u32)>>,
) -> Result<CreatedTransaction> {
    // Acquire the transaction creation mutex to prevent race conditions
    let _tx_guard = wallet.tx_creation_mutex.lock()
        .map_err(|e| anyhow::anyhow!("Transaction mutex poisoned: {}", e))?;
    
    let secp = Secp256k1::new();

    // Use a NUMS (Nothing Up My Sleeve) point for the internal key
    let internal_key = {
        let nums_bytes: [u8; 32] = [
            0x50, 0x92, 0x9b, 0x74, 0xc1, 0xa0, 0x49, 0x54, 0xb7, 0x8b, 0x4b, 0x60, 0x35, 0xe9,
            0x7a, 0x5e, 0x07, 0x8a, 0x5a, 0x0f, 0x28, 0xec, 0x96, 0xd5, 0x47, 0xbf, 0xee, 0x9a,
            0xce, 0x80, 0x3a, 0xc0,
        ];
        XOnlyPublicKey::from_slice(&nums_bytes).unwrap_or_else(|_| {
            let secret = SecretKey::from_slice(&[1u8; 32]).expect("valid key");
            let keypair = UntweakedKeypair::from_secret_key(&secp, &secret);
            XOnlyPublicKey::from_keypair(&keypair).0
        })
    };

    // Build the Taproot tree with the data script as a leaf
    let taproot_builder = TaprootBuilder::new()
        .add_leaf(0, data_script.clone())
        .map_err(|e| anyhow::anyhow!("Failed to build Taproot tree: {:?}", e))?;

    let taproot_info: TaprootSpendInfo = taproot_builder
        .finalize(&secp, internal_key)
        .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

    let output_key = taproot_info.output_key();
    let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

    debug!(
        "WitnessData commit script: {}",
        hex::encode(commit_script.as_bytes())
    );

    // Calculate dynamic fee based on data script size and fee_rate
    // Reveal tx: ~100 base vbytes + witness data (gets 75% discount)
    let script_size = data_script.len();
    let reveal_vbytes = 100 + script_size.div_ceil(4); // witness weight / 4
    let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
    let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes

    debug!(
        "WitnessData fees: data_script={} bytes, reveal_vbytes={}, reveal_fee={} sats",
        script_size, reveal_vbytes, reveal_fee
    );

    // Step 1: Create the commit transaction
    // Commit amount must cover reveal fee + dust output
    let commit_amount = reveal_fee + 546; // reveal fee + dust limit
    let utxos = wallet.list_unspent_unlocked(Some(1), locked_set)?;
    if utxos.is_empty() {
        anyhow::bail!("No UTXOs available for WitnessData commit (all may be locked)");
    }

    let mut selected_utxos = Vec::new();
    let mut total_input = 0u64;
    let required = commit_amount + commit_fee;

    for utxo in &utxos {
        selected_utxos.push(utxo);
        total_input += utxo.amount.to_sat();
        if total_input >= required + 546 {
            break;
        }
    }

    if total_input < required {
        anyhow::bail!(
            "Insufficient funds for witness data commit: need {} sats",
            required
        );
    }

    let commit_inputs: Vec<TxIn> = selected_utxos
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

    let change_address = wallet.rpc.get_new_address(None, None)?;
    let change_script = change_address.assume_checked().script_pubkey();

    let change_value = total_input - commit_amount - commit_fee;
    let commit_outputs = vec![
        TxOut {
            value: Amount::from_sat(commit_amount),
            script_pubkey: commit_script.clone(),
        },
        TxOut {
            value: Amount::from_sat(change_value),
            script_pubkey: change_script.clone(),
        },
    ];

    let commit_tx = Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: commit_inputs,
        output: commit_outputs,
    };

    let commit_hex = serialize_hex(&commit_tx);

    // Sign commit transaction
    let signed_commit: serde_json::Value = wallet.rpc.call(
        "signrawtransactionwithwallet",
        &[serde_json::json!(commit_hex)],
    )?;

    if !signed_commit["complete"].as_bool().unwrap_or(false) {
        anyhow::bail!("WitnessData commit signing incomplete");
    }

    let signed_commit_hex = signed_commit["hex"]
        .as_str()
        .context("No hex in signed commit")?;

    // Broadcast commit
    let commit_txid: String =
        wallet
            .rpc
            .call("sendrawtransaction", &[serde_json::json!(signed_commit_hex)])?;
    info!("Broadcast witness data commit tx: {}", commit_txid);

    let commit_txid_parsed = Txid::from_str(&commit_txid)?;

    // Step 2: Create the reveal transaction
    let reveal_change_address = wallet.rpc.get_new_address(None, None)?;
    let reveal_change_script = reveal_change_address.assume_checked().script_pubkey();

    let reveal_input = TxIn {
        previous_output: OutPoint {
            txid: commit_txid_parsed,
            vout: 0,
        },
        script_sig: ScriptBuf::new(),
        sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
        witness: Witness::new(),
    };

    // Reveal output value = commit_amount - reveal_fee, ensuring at least dust limit
    let reveal_output_value = if commit_amount > reveal_fee + 546 {
        commit_amount - reveal_fee
    } else {
        546 // Dust limit
    };
    let reveal_output = TxOut {
        value: Amount::from_sat(reveal_output_value),
        script_pubkey: reveal_change_script,
    };

    let mut reveal_tx = Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: vec![reveal_input],
        output: vec![reveal_output],
    };

    // Build the witness for script-path spend
    let control_block = taproot_info
        .control_block(&(data_script.clone(), LeafVersion::TapScript))
        .context("Failed to build control block")?;

    // Witness: [script] [control block]
    // The data script drops all data and returns true, no signature needed
    let mut witness = Witness::new();
    witness.push(data_script.as_bytes());
    witness.push(control_block.serialize());

    reveal_tx.input[0].witness = witness;

    let reveal_hex = serialize_hex(&reveal_tx);

    // Broadcast reveal transaction
    let reveal_txid: String =
        wallet
            .rpc
            .call("sendrawtransaction", &[serde_json::json!(reveal_hex)])?;

    info!(
        "Broadcast witness data reveal tx: {} (commit: {})",
        reveal_txid, commit_txid
    );

    Ok(CreatedTransaction {
        txid: reveal_txid,
        hex: reveal_hex,
        anchor_vout: 0,
        carrier: 4,
        carrier_name: "witness_data".to_string(),
    })
}

