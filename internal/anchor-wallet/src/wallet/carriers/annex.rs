//! Taproot Annex transaction builder

use anyhow::{Context, Result};
use bitcoin::consensus::encode::serialize_hex;
use bitcoin::key::{TapTweak, UntweakedKeypair};
use bitcoin::secp256k1::{Secp256k1, SecretKey};
use bitcoin::sighash::{Annex, Prevouts, SighashCache, TapSighashType};
use bitcoin::taproot::TaprootBuilder;
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

/// Create and broadcast a Taproot Annex transaction
/// The annex is the last element in the witness stack, prefixed with 0x50
/// Note: Standard Bitcoin Core nodes don't relay annex transactions, but they are valid
pub fn create_and_broadcast_annex_tx(
    wallet: &WalletService,
    annex_data: Vec<u8>,
    fee_rate: u64,
    locked_set: Option<&HashSet<(String, u32)>>,
) -> Result<CreatedTransaction> {
    // Acquire the transaction creation mutex to prevent race conditions
    let _tx_guard = wallet
        .tx_creation_mutex
        .lock()
        .map_err(|e| anyhow::anyhow!("Transaction mutex poisoned: {}", e))?;

    let secp = Secp256k1::new();

    // Generate a keypair for the Taproot key-path spend
    // Use deterministic key derivation for simplicity
    let secret_bytes: [u8; 32] = {
        let mut bytes = [0u8; 32];
        // Use wallet's first address as entropy source
        let addr = wallet.rpc.get_new_address(None, None)?;
        let addr_bytes = addr.assume_checked().to_string().into_bytes();
        for (i, b) in addr_bytes.iter().take(32).enumerate() {
            bytes[i] = *b;
        }
        // Ensure it's a valid secret key (non-zero, less than curve order)
        bytes[0] = bytes[0].max(1);
        bytes
    };

    let secret_key = SecretKey::from_slice(&secret_bytes)
        .map_err(|e| anyhow::anyhow!("Failed to create secret key: {}", e))?;
    let keypair = UntweakedKeypair::from_secret_key(&secp, &secret_key);
    let (internal_key, _parity) = XOnlyPublicKey::from_keypair(&keypair);

    // Create a simple Taproot key-path output (no script tree)
    let taproot_info = TaprootBuilder::new()
        .finalize(&secp, internal_key)
        .map_err(|e| anyhow::anyhow!("Failed to finalize Taproot: {:?}", e))?;

    let output_key = taproot_info.output_key();
    let commit_script = ScriptBuf::new_p2tr_tweaked(output_key);

    debug!(
        "Annex commit script: {}",
        hex::encode(commit_script.as_bytes())
    );

    // Calculate dynamic fee based on annex data size and fee_rate
    // Reveal tx: ~150 base vbytes + witness data (gets 75% discount)
    // Annex is in witness, so it gets the discount too
    let annex_size = annex_data.len();
    let reveal_vbytes = 150 + (annex_size + 64).div_ceil(4); // 64 for schnorr sig
    let reveal_fee = std::cmp::max(15000, reveal_vbytes as u64 * fee_rate);
    let commit_fee = std::cmp::max(12000, 150 * fee_rate); // Commit tx is ~150 vbytes

    debug!(
        "Annex fees: annex_size={} bytes, reveal_vbytes={}, reveal_fee={} sats",
        annex_size, reveal_vbytes, reveal_fee
    );

    // Step 1: Create commit transaction that funds the Taproot address
    // Commit amount must cover reveal fee + dust output
    let commit_amount = reveal_fee + 546; // reveal fee + dust limit
    let utxos = wallet.list_unspent_unlocked(Some(1), locked_set)?;
    if utxos.is_empty() {
        anyhow::bail!("No UTXOs available for Annex commit (all may be locked)");
    }

    // Select UTXOs
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
            "Insufficient funds for annex commit: need {} sats",
            required
        );
    }

    // Build commit transaction
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
        anyhow::bail!("Annex commit signing incomplete");
    }

    let signed_commit_hex = signed_commit["hex"]
        .as_str()
        .context("No hex in signed commit")?;

    // Broadcast commit
    let commit_txid: String = wallet.rpc.call(
        "sendrawtransaction",
        &[serde_json::json!(signed_commit_hex)],
    )?;
    info!("Broadcast annex commit tx: {}", commit_txid);

    let commit_txid_parsed = Txid::from_str(&commit_txid)?;

    // Step 2: Create the reveal transaction with annex in witness
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

    // For Taproot key-path spend, we need to sign the transaction
    // Then append the annex to the witness

    // Compute the sighash for Taproot key-path spend WITH annex
    let prev_out = TxOut {
        value: Amount::from_sat(commit_amount),
        script_pubkey: commit_script.clone(),
    };
    let prev_outs = [prev_out];
    let prevouts = Prevouts::All(&prev_outs);

    // Create the Annex struct (validates 0x50 prefix)
    let annex =
        Annex::new(&annex_data).map_err(|e| anyhow::anyhow!("Invalid annex data: {:?}", e))?;

    let mut sighash_cache = SighashCache::new(&reveal_tx);

    // Use taproot_signature_hash with annex for key-path spend
    // For key-path spend: leaf_hash_code_separator = None
    let sighash = sighash_cache
        .taproot_signature_hash(0, &prevouts, Some(annex), None, TapSighashType::Default)
        .map_err(|e| anyhow::anyhow!("Failed to compute sighash with annex: {:?}", e))?;

    // Tweak the keypair for signing (key-path spend, no merkle root)
    let tweaked_keypair = keypair.tap_tweak(&secp, None);

    // Sign the sighash
    use bitcoin::secp256k1::Message;
    let msg = Message::from_digest_slice(sighash.as_ref())
        .map_err(|e| anyhow::anyhow!("Invalid sighash: {}", e))?;
    let signature = secp.sign_schnorr(&msg, &tweaked_keypair.to_keypair());

    // Build witness: [signature] [annex]
    // The annex must be the last element and start with 0x50
    let mut witness = Witness::new();
    witness.push(signature.as_ref()); // 64-byte Schnorr signature
    witness.push(&annex_data); // Annex data (starts with 0x50)

    reveal_tx.input[0].witness = witness;

    let reveal_hex = serialize_hex(&reveal_tx);

    // Broadcast reveal transaction
    // Note: Standard nodes may reject this, but libre relay nodes should accept it
    let reveal_txid: String = wallet
        .rpc
        .call("sendrawtransaction", &[serde_json::json!(reveal_hex)])
        .map_err(|e| {
            anyhow::anyhow!("Failed to broadcast annex tx (may need libre relay): {}", e)
        })?;

    info!(
        "Broadcast annex reveal tx: {} (commit: {})",
        reveal_txid, commit_txid
    );

    Ok(CreatedTransaction {
        txid: reveal_txid,
        hex: reveal_hex,
        anchor_vout: 0,
        carrier: 3,
        carrier_name: "taproot_annex".to_string(),
    })
}
