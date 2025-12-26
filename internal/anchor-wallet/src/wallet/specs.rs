//! Type-safe ANCHOR transaction creation using specs
//!
//! This module provides methods that use the `anchor-specs` crate for
//! type-safe transaction creation with automatic validation and carrier selection.

use anyhow::Result;
use std::collections::HashSet;
use tracing::debug;

use anchor_specs::dns::DnsSpec;
use anchor_specs::prelude::*;
use anchor_specs::proof::ProofSpec;
use anchor_specs::text::TextSpec;
use anchor_specs::token::TokenSpec;

use super::service::WalletService;
use super::types::CreatedTransaction;

/// Anchor reference for chained transactions
#[derive(Debug, Clone)]
pub struct AnchorRef {
    pub txid: String,
    pub vout: u8,
}

impl AnchorRef {
    /// Create a new anchor reference
    pub fn new(txid: impl Into<String>, vout: u8) -> Self {
        Self {
            txid: txid.into(),
            vout,
        }
    }
}

impl WalletService {
    // ========================================================================
    // Generic Spec-based Transaction Creation
    // ========================================================================

    /// Create a transaction for any spec that implements KindSpec.
    ///
    /// This method:
    /// 1. Validates the spec
    /// 2. Checks carrier compatibility
    /// 3. Encodes the payload
    /// 4. Creates and broadcasts the transaction
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_specs::text::TextSpec;
    ///
    /// let spec = TextSpec::new("Hello, ANCHOR!");
    /// let tx = wallet.create_spec_transaction(spec, vec![], None, 1)?;
    /// ```
    pub fn create_spec_transaction<S: KindSpec>(
        &self,
        spec: S,
        anchors: Vec<AnchorRef>,
        carrier: Option<CarrierType>,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        self.create_spec_transaction_with_locks(spec, anchors, carrier, fee_rate, None)
    }

    /// Create a spec transaction with lock awareness
    pub fn create_spec_transaction_with_locks<S: KindSpec>(
        &self,
        spec: S,
        anchors: Vec<AnchorRef>,
        carrier: Option<CarrierType>,
        fee_rate: u64,
        locked_set: Option<&HashSet<(String, u32)>>,
    ) -> Result<CreatedTransaction> {
        // Validate the spec
        spec.validate()
            .map_err(|e| anyhow::anyhow!("Spec validation failed: {}", e))?;

        // Determine carrier
        let selected_carrier = carrier.unwrap_or_else(S::recommended_carrier);

        // Validate carrier is supported
        S::validate_carrier(selected_carrier)
            .map_err(|e| anyhow::anyhow!("Carrier validation failed: {}", e))?;

        debug!(
            "Creating {} transaction with carrier {:?}",
            S::KIND_NAME,
            selected_carrier
        );

        // Encode the payload
        let body = spec.to_bytes();

        // Convert anchors
        let (parent_txid, parent_vout) = if !anchors.is_empty() {
            (Some(anchors[0].txid.clone()), Some(anchors[0].vout))
        } else {
            (None, None)
        };

        let additional_anchors: Vec<(String, u8)> = anchors
            .into_iter()
            .skip(1)
            .map(|a| (a.txid, a.vout))
            .collect();

        // Create the transaction
        self.create_anchor_transaction_with_locks(
            S::KIND_ID,
            body,
            parent_txid,
            parent_vout,
            additional_anchors,
            Some(selected_carrier as u8),
            fee_rate,
            locked_set,
        )
    }

    // ========================================================================
    // Text Convenience Methods
    // ========================================================================

    /// Create a text message transaction
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let tx = wallet.send_text("Hello, ANCHOR!", vec![], 1)?;
    /// ```
    pub fn send_text(
        &self,
        text: impl Into<String>,
        anchors: Vec<AnchorRef>,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        let spec = TextSpec::new(text);
        let carrier = Some(spec.best_carrier());
        self.create_spec_transaction(spec, anchors, carrier, fee_rate)
    }

    /// Reply to an existing message with text
    pub fn reply_text(
        &self,
        text: impl Into<String>,
        parent_txid: impl Into<String>,
        parent_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        let anchor = AnchorRef::new(parent_txid, parent_vout);
        self.send_text(text, vec![anchor], fee_rate)
    }

    // ========================================================================
    // DNS Convenience Methods
    // ========================================================================

    /// Register a new domain
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_specs::dns::{DnsRecord, DnsSpec};
    ///
    /// let spec = DnsSpec::register("mydomain.btc", vec![
    ///     DnsRecord::a("93.184.216.34", 3600)?,
    /// ]);
    /// let tx = wallet.register_domain(spec, 1)?;
    /// ```
    pub fn register_domain(&self, spec: DnsSpec, fee_rate: u64) -> Result<CreatedTransaction> {
        if !matches!(spec.operation, anchor_specs::dns::DnsOperation::Register) {
            anyhow::bail!("Expected Register operation for register_domain");
        }
        self.create_spec_transaction(spec, vec![], None, fee_rate)
    }

    /// Update a domain's records
    ///
    /// Requires the ownership UTXO from the current domain registration/update.
    pub fn update_domain(
        &self,
        spec: DnsSpec,
        ownership_txid: impl Into<String>,
        ownership_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        if !matches!(spec.operation, anchor_specs::dns::DnsOperation::Update) {
            anyhow::bail!("Expected Update operation for update_domain");
        }
        let anchor = AnchorRef::new(ownership_txid, ownership_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }

    /// Transfer a domain to a new owner
    pub fn transfer_domain(
        &self,
        name: impl Into<String>,
        ownership_txid: impl Into<String>,
        ownership_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        let spec = DnsSpec::transfer(name);
        let anchor = AnchorRef::new(ownership_txid, ownership_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }

    // ========================================================================
    // Token Convenience Methods
    // ========================================================================

    /// Deploy a new token
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_specs::token::{TokenSpec, DeployFlags};
    ///
    /// let spec = TokenSpec::deploy(
    ///     "MYTOKEN",
    ///     8,                      // decimals
    ///     21_000_000_00000000,    // max supply
    ///     Some(1000_00000000),    // mint limit
    ///     DeployFlags::new().with_open_mint().with_burnable(),
    /// );
    /// let tx = wallet.deploy_token(spec, 1)?;
    /// ```
    pub fn deploy_token(&self, spec: TokenSpec, fee_rate: u64) -> Result<CreatedTransaction> {
        if !matches!(
            spec.operation,
            anchor_specs::token::TokenOperation::Deploy { .. }
        ) {
            anyhow::bail!("Expected Deploy operation for deploy_token");
        }
        self.create_spec_transaction(spec, vec![], None, fee_rate)
    }

    /// Mint tokens
    ///
    /// Requires anchor to the deploy transaction.
    pub fn mint_token(
        &self,
        spec: TokenSpec,
        deploy_txid: impl Into<String>,
        deploy_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        if !matches!(
            spec.operation,
            anchor_specs::token::TokenOperation::Mint { .. }
        ) {
            anyhow::bail!("Expected Mint operation for mint_token");
        }
        let anchor = AnchorRef::new(deploy_txid, deploy_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }

    /// Transfer tokens
    ///
    /// Requires anchor to the token UTXO being spent.
    pub fn transfer_token(
        &self,
        spec: TokenSpec,
        token_txid: impl Into<String>,
        token_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        if !matches!(
            spec.operation,
            anchor_specs::token::TokenOperation::Transfer { .. }
        ) {
            anyhow::bail!("Expected Transfer operation for transfer_token");
        }
        let anchor = AnchorRef::new(token_txid, token_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }

    /// Burn tokens
    pub fn burn_token(
        &self,
        spec: TokenSpec,
        token_txid: impl Into<String>,
        token_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        if !matches!(
            spec.operation,
            anchor_specs::token::TokenOperation::Burn { .. }
        ) {
            anyhow::bail!("Expected Burn operation for burn_token");
        }
        let anchor = AnchorRef::new(token_txid, token_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }

    // ========================================================================
    // Proof Convenience Methods
    // ========================================================================

    /// Create a proof of existence
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use anchor_specs::proof::{ProofSpec, ProofEntry, ProofMetadata, HashAlgorithm};
    ///
    /// let hash = sha256_hash_of_file(&file_bytes);
    /// let spec = ProofSpec::stamp(ProofEntry::sha256(
    ///     hash,
    ///     ProofMetadata::new()
    ///         .with_filename("document.pdf")
    ///         .with_description("Important contract"),
    /// )?);
    /// let tx = wallet.create_proof(spec, 1)?;
    /// ```
    pub fn create_proof(&self, spec: ProofSpec, fee_rate: u64) -> Result<CreatedTransaction> {
        self.create_spec_transaction(spec, vec![], None, fee_rate)
    }

    /// Revoke a proof
    ///
    /// Requires anchor to the original proof transaction.
    pub fn revoke_proof(
        &self,
        spec: ProofSpec,
        proof_txid: impl Into<String>,
        proof_vout: u8,
        fee_rate: u64,
    ) -> Result<CreatedTransaction> {
        if !matches!(spec.operation, anchor_specs::proof::ProofOperation::Revoke) {
            anyhow::bail!("Expected Revoke operation for revoke_proof");
        }
        let anchor = AnchorRef::new(proof_txid, proof_vout);
        self.create_spec_transaction(spec, vec![anchor], None, fee_rate)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_spec_validation() {
        let spec = TextSpec::new("Hello!");
        assert!(spec.validate().is_ok());
    }

    #[test]
    fn test_dns_spec_carrier_validation() {
        // DNS should not support OP_RETURN
        assert!(DnsSpec::validate_carrier(CarrierType::OpReturn).is_err());
        assert!(DnsSpec::validate_carrier(CarrierType::WitnessData).is_ok());
    }

    #[test]
    fn test_anchor_ref() {
        let anchor = AnchorRef::new("abc123", 0);
        assert_eq!(anchor.txid, "abc123");
        assert_eq!(anchor.vout, 0);
    }
}
