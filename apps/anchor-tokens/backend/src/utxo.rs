//! UTXO Tracker for Anchor Tokens
//!
//! Manages the token UTXO set, processing mints, transfers, and burns.

use anyhow::Result;
use bitcoin::Transaction;
use tracing::{debug, info};

use anchor_core::Anchor;

use crate::db::Database;
use crate::models::TokenAllocation;

/// UTXO tracker for token operations
#[derive(Clone)]
pub struct UtxoTracker {
    db: Database,
}

impl UtxoTracker {
    /// Create a new UTXO tracker
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Process a MINT operation
    /// Creates a new token UTXO at the specified output
    pub async fn process_mint(
        &self,
        token_id: i32,
        txid: &[u8],
        output_index: i32,
        amount: &str,
        owner_address: Option<&str>,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        // Create the new UTXO
        let utxo_id = self
            .db
            .create_utxo(
                token_id,
                txid,
                output_index,
                amount,
                None, // owner_script not extracted here
                owner_address,
                block_hash,
                block_height,
            )
            .await?;

        // Update holder count
        self.db.update_holder_count(token_id).await?;

        debug!(
            "Created token UTXO {} for {} tokens at output {}",
            utxo_id, amount, output_index
        );

        Ok(utxo_id)
    }

    /// Process a TRANSFER operation
    /// Spends input UTXOs and creates new output UTXOs
    pub async fn process_transfer(
        &self,
        tx: &Transaction,
        txid: &[u8],
        vout: i32,
        token_id: i32,
        allocations: &[TokenAllocation],
        anchors: &[Anchor],
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<bool> {
        // Find and spend input UTXOs referenced by anchors
        let mut total_input: u128 = 0;
        let mut spent_addresses: Vec<String> = Vec::new();

        for anchor in anchors {
            // Find UTXO by txid prefix
            let utxo = self
                .db
                .find_utxo_by_prefix(token_id, &anchor.txid_prefix, anchor.vout as i32)
                .await?;

            if let Some((input_txid, amount_str)) = utxo {
                let amount: u128 = amount_str.parse().unwrap_or(0);
                total_input += amount;

                // Spend the UTXO
                let owner = self
                    .db
                    .spend_utxo(
                        token_id,
                        &input_txid,
                        anchor.vout as i32,
                        txid,
                        vout,
                        block_height,
                    )
                    .await?;

                if let Some(addr) = owner {
                    if !spent_addresses.contains(&addr) {
                        spent_addresses.push(addr);
                    }
                }

                debug!(
                    "Spent UTXO: {}:{} ({} tokens)",
                    hex::encode(&input_txid),
                    anchor.vout,
                    amount
                );
            } else {
                debug!(
                    "UTXO not found for anchor prefix: {}:{}",
                    hex::encode(&anchor.txid_prefix),
                    anchor.vout
                );
            }
        }

        // Verify total allocation doesn't exceed input
        let total_output: u128 = allocations.iter().map(|a| a.amount).sum();

        if total_output > total_input {
            debug!(
                "Transfer rejected: output {} exceeds input {}",
                total_output, total_input
            );
            return Ok(false);
        }

        // Create output UTXOs
        let mut created_addresses: Vec<String> = Vec::new();

        for alloc in allocations {
            // Get output address
            let output_addr = tx
                .output
                .get(alloc.output_index as usize)
                .and_then(|o| {
                    bitcoin::Address::from_script(&o.script_pubkey, bitcoin::Network::Regtest).ok()
                })
                .map(|a| a.to_string());

            // Create the UTXO
            self.db
                .create_utxo(
                    token_id,
                    txid,
                    alloc.output_index as i32,
                    &alloc.amount.to_string(),
                    None,
                    output_addr.as_deref(),
                    block_hash,
                    block_height,
                )
                .await?;

            if let Some(addr) = output_addr {
                if !created_addresses.contains(&addr) {
                    created_addresses.push(addr.clone());
                }

                // Record operation
                let from_addr = spent_addresses.first().cloned();
                self.db
                    .record_operation(
                        token_id,
                        3, // TRANSFER
                        txid,
                        vout,
                        Some(&alloc.amount.to_string()),
                        from_addr.as_deref(),
                        Some(&addr),
                        block_hash,
                        block_height,
                    )
                    .await?;
            }

            debug!(
                "Created output UTXO: {}:{} ({} tokens)",
                hex::encode(txid),
                alloc.output_index,
                alloc.amount
            );
        }

        // Handle remainder (implicit burn or change)
        let remainder = total_input.saturating_sub(total_output);
        if remainder > 0 {
            debug!("Transfer remainder (burned): {} tokens", remainder);
        }

        // Update holder count
        self.db.update_holder_count(token_id).await?;

        info!(
            "Transferred {} tokens across {} outputs",
            total_output,
            allocations.len()
        );

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allocation_sum() {
        let allocations = vec![
            TokenAllocation {
                output_index: 0,
                amount: 500,
            },
            TokenAllocation {
                output_index: 1,
                amount: 300,
            },
            TokenAllocation {
                output_index: 2,
                amount: 200,
            },
        ];

        let total: u128 = allocations.iter().map(|a| a.amount).sum();
        assert_eq!(total, 1000);
    }
}
