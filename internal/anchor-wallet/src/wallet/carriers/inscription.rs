//! Inscription (Taproot commit+reveal) transaction builder

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

/// Create and broadcast an Inscription transaction using commit+reveal pattern
/// This creates a Taproot script-path spend that reveals the inscription in the witness
pub fn create_and_broadcast_inscription_tx(
    wallet: &WalletService,
    reveal_script: ScriptBuf,
    fee_rate: u64,
    locked_set: Option<&HashSet<(String, u32)>>,
) -> Result<CreatedTransaction> {
    // Acquire the transaction creation mutex to prevent race conditions
    // This serializes all two-stage transactions to avoid UTXO conflicts
    let _tx_guard = wallet
        .tx_creation_mutex
        .lock()
        .map_err(|e| anyhow::anyhow!("Transaction mutex poisoned: {}", e))?;

    let secp = Secp256k1::new();

    // Generate an internal key (could be from wallet, using random for simplicity)
    // For a real implementation, you'd derive this from the wallet
    let internal_key = {
        // Use a deterministic "nothing up my sleeve" key for the internal pubkey
        // This is the standard NUMS (Nothing Up My Sleeve) point
        let nums_bytes: [u8; 32] = [
            0x50, 0x92, 0x9b, 0x74, 0xc1, 0xa0, 0x49, 0x54, 0xb7, 0x8b, 0x4b, 0x60, 0x35, 0xe9,
            0x7a, 0x5e, 0x07, 0x8a, 0x5a, 0x0f, 0x28, 0xec, 0x96, 0xd5, 0x47, 0xbf, 0xee, 0x9a,
            0xce, 0x80, 0x3a, 0xc0,
        ];
        XOnlyPublicKey::from_slice(&nums_bytes).unwrap_or_else(|_| {
            // Fallback: generate from a random key
            let secret = SecretKey::from_slice(&[1u8; 32]).expect("valid key");
            let keypair = UntweakedKeypair::from_secret_key(&secp, &secret);
            XOnlyPublicKey::from_keypair(&keypair).0
        })
    };

    // Build the Taproot tree with the inscription script as a leaf
    let taproot_builder = TaprootBuilder::new()
        .add_leaf(0, reveal_script.clone())
        .map_err(|e| anyhow::anyhow!("Failed to build Taproot tree: {:?}", e))?;

    let taproot_info: TaprootSpendInfo = taproot_builder
        .finalize(&secp, internal_key)
        .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

    // Get the Taproot output key (tweaked)
    let output_key = taproot_info.output_key();

    // Build the P2TR script pubkey for the commit transaction
    let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

    debug!(
        "Inscription commit script: {}",
        hex::encode(commit_script.as_bytes())
    );

    // Calculate dynamic fee based on reveal script size and fee_rate
    // Reveal tx: ~100 base vbytes + witness data (gets 75% discount)
    let script_size = reveal_script.len();
    let reveal_vbytes = 100 + script_size.div_ceil(4); // witness weight / 4
    let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
    let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes

    debug!(
        "Inscription fees: reveal_script={} bytes, reveal_vbytes={}, reveal_fee={} sats",
        script_size, reveal_vbytes, reveal_fee
    );

    // Step 1: Create the commit transaction that funds the Taproot address
    // Commit amount must cover reveal fee + dust output
    let commit_amount = reveal_fee + 546; // reveal fee + dust limit
    let utxos = wallet.list_unspent_unlocked(Some(1), locked_set)?;
    if utxos.is_empty() {
        anyhow::bail!("No UTXOs available for Inscription commit (all may be locked)");
    }

    // Select UTXOs
    let mut selected_utxos = Vec::new();
    let mut total_input = 0u64;
    let required = commit_amount + commit_fee; // commit output + commit tx fee

    for utxo in &utxos {
        selected_utxos.push(utxo);
        total_input += utxo.amount.to_sat();
        if total_input >= required + 546 {
            break;
        }
    }

    if total_input < required {
        anyhow::bail!(
            "Insufficient funds for inscription commit: need {} sats",
            required
        );
    }

    // Build commit transaction inputs
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

    // Get change address
    let change_address = wallet.rpc.get_new_address(None, None)?;
    let change_script = change_address.assume_checked().script_pubkey();

    // Build commit outputs: Taproot commit output + change
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
        anyhow::bail!("Inscription commit signing incomplete");
    }

    let signed_commit_hex = signed_commit["hex"]
        .as_str()
        .context("No hex in signed commit")?;

    // Broadcast commit
    let commit_txid: String = wallet.rpc.call(
        "sendrawtransaction",
        &[serde_json::json!(signed_commit_hex)],
    )?;
    info!("Broadcast inscription commit tx: {}", commit_txid);

    // Parse commit txid
    let commit_txid_parsed = Txid::from_str(&commit_txid)?;

    // Step 2: Create the reveal transaction that spends the commit output
    // This reveals the inscription in the witness

    // Get another change address for reveal tx
    let reveal_change_address = wallet.rpc.get_new_address(None, None)?;
    let reveal_change_script = reveal_change_address.assume_checked().script_pubkey();

    let reveal_input = TxIn {
        previous_output: OutPoint {
            txid: commit_txid_parsed,
            vout: 0, // First output of commit tx
        },
        script_sig: ScriptBuf::new(),
        sequence: Sequence::ENABLE_RBF_NO_LOCKTIME,
        witness: Witness::new(), // Will be filled with inscription data
    };

    // Reveal output: just a change output (inscription is in the witness)
    // Output value = commit_amount - reveal_fee, ensuring at least dust limit
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

    // Build the witness for the script-path spend
    // Witness stack for script-path: [script args...] [script] [control block]
    let control_block = taproot_info
        .control_block(&(reveal_script.clone(), LeafVersion::TapScript))
        .context("Failed to build control block")?;

    // Build witness: the inscription script goes into the witness
    // Format: [signature if needed] [script] [control block]
    // For our inscription, we don't need a signature because the script is just data
    let mut witness = Witness::new();
    witness.push(reveal_script.as_bytes()); // The inscription script
    witness.push(control_block.serialize()); // Control block

    reveal_tx.input[0].witness = witness;

    let reveal_hex = serialize_hex(&reveal_tx);

    // Broadcast reveal transaction (no signing needed for script-path with no sig check)
    let reveal_txid: String = wallet
        .rpc
        .call("sendrawtransaction", &[serde_json::json!(reveal_hex)])?;

    info!(
        "Broadcast inscription reveal tx: {} (commit: {})",
        reveal_txid, commit_txid
    );

    Ok(CreatedTransaction {
        txid: reveal_txid,
        hex: reveal_hex,
        anchor_vout: 0, // Inscription is in input witness, not output
        carrier: 1,
        carrier_name: "inscription".to_string(),
    })
}
