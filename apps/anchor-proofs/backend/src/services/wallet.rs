//! Wallet service client for Anchor Proofs
//!
//! Handles communication with the anchor-wallet service using anchor-specs
//! for proper payload encoding.

use anchor_specs::proof::ProofSpec;
use anchor_specs::KindSpec;
use serde::Deserialize;

use crate::error::{AppError, Result};
use crate::models::CreateTxResponse;

/// Anchor reference for revocation
pub struct AnchorRef {
    pub txid_prefix: Vec<u8>,
    pub vout: u8,
}

/// Wallet addresses response
#[derive(Debug, Deserialize)]
pub struct WalletAddressesResponse {
    pub addresses: Vec<String>,
}

/// Client for the anchor-wallet service
#[derive(Clone)]
pub struct WalletClient {
    base_url: String,
    client: reqwest::Client,
}

impl WalletClient {
    /// Create a new wallet client
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    /// Create a proof transaction (stamp or batch)
    pub async fn create_proof(
        &self,
        spec: &ProofSpec,
        carrier: u8,
    ) -> Result<CreateTxResponse> {
        // Validate the spec
        spec.validate().map_err(|e| AppError::Spec(e.to_string()))?;

        // Encode payload using anchor-specs
        let body_hex = hex::encode(spec.to_bytes());

        // Create the wallet request
        let wallet_request = serde_json::json!({
            "kind": ProofSpec::KIND_ID,
            "body": body_hex,
            "body_is_hex": true,
            "carrier": carrier,
        });

        // Send to wallet service
        let res = self
            .client
            .post(format!("{}/wallet/create-message", self.base_url))
            .json(&wallet_request)
            .send()
            .await?;

        if !res.status().is_success() {
            let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            tracing::error!("Wallet error: {}", error_text);
            return Err(AppError::internal(format!("Wallet error: {}", error_text)));
        }

        let response: CreateTxResponse = res.json().await?;
        Ok(response)
    }

    /// Create a proof transaction with anchor reference (for revocation)
    pub async fn create_proof_with_anchor(
        &self,
        spec: &ProofSpec,
        anchor: &AnchorRef,
        carrier: u8,
    ) -> Result<CreateTxResponse> {
        // Validate the spec
        spec.validate().map_err(|e| AppError::Spec(e.to_string()))?;

        // Encode payload using anchor-specs
        let body_hex = hex::encode(spec.to_bytes());

        // Create the wallet request with anchor
        let wallet_request = serde_json::json!({
            "kind": ProofSpec::KIND_ID,
            "body": body_hex,
            "body_is_hex": true,
            "carrier": carrier,
            "anchors": [{
                "txid_prefix": hex::encode(&anchor.txid_prefix),
                "vout": anchor.vout,
            }],
        });

        // Send to wallet service
        let res = self
            .client
            .post(format!("{}/wallet/create-message", self.base_url))
            .json(&wallet_request)
            .send()
            .await?;

        if !res.status().is_success() {
            let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            tracing::error!("Wallet error: {}", error_text);
            return Err(AppError::internal(format!("Wallet error: {}", error_text)));
        }

        let response: CreateTxResponse = res.json().await?;
        Ok(response)
    }

    /// Get all addresses from the wallet
    pub async fn get_wallet_addresses(&self) -> Result<Vec<String>> {
        let res = self
            .client
            .get(format!("{}/wallet/addresses", self.base_url))
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to connect to wallet service: {}", e);
                AppError::internal(format!("Wallet service unavailable: {}", e))
            })?;

        if !res.status().is_success() {
            tracing::error!("Wallet service returned error: {}", res.status());
            return Err(AppError::internal("Wallet service error".to_string()));
        }

        let wallet_data: WalletAddressesResponse = res.json().await.map_err(|e| {
            tracing::error!("Failed to parse wallet response: {}", e);
            AppError::internal(format!("Failed to parse wallet response: {}", e))
        })?;

        tracing::info!("Fetched {} addresses from wallet", wallet_data.addresses.len());
        Ok(wallet_data.addresses)
    }
}

