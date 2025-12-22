//! Wallet service client for Anchor Places
//!
//! Handles communication with the anchor-wallet service using anchor-specs
//! for proper payload encoding.

use anchor_specs::geomarker::GeoMarkerSpec;
use anchor_specs::KindSpec;

use crate::error::{AppError, Result};
use crate::models::CreateMarkerResponse;

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

    /// Create a GeoMarker transaction
    pub async fn create_geomarker(
        &self,
        category: u8,
        latitude: f32,
        longitude: f32,
        message: &str,
        carrier: u8,
    ) -> Result<CreateMarkerResponse> {
        // Create and validate the spec
        let spec = GeoMarkerSpec::new(category, latitude, longitude, message);
        spec.validate().map_err(|e| AppError::Spec(e.to_string()))?;

        // Encode payload using anchor-specs
        let body_hex = hex::encode(spec.to_bytes());

        // Create the wallet request
        let wallet_request = serde_json::json!({
            "kind": GeoMarkerSpec::KIND_ID,
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
            return Err(AppError::internal(format!("Wallet error: {}", error_text)));
        }

        let response: CreateMarkerResponse = res.json().await?;
        Ok(response)
    }

    /// Create a reply to a marker
    pub async fn create_reply(
        &self,
        parent_txid: &str,
        parent_vout: i32,
        message: &str,
    ) -> Result<CreateMarkerResponse> {
        // Create the wallet request with anchor to parent
        // Note: parent_vout must be u8 for the wallet API
        let wallet_request = serde_json::json!({
            "kind": 1,  // Text for replies
            "body": message,
            "body_is_hex": false,
            "parent_txid": parent_txid,
            "parent_vout": parent_vout as u8,
            "carrier": 0,  // OP_RETURN
        });

        tracing::debug!("Creating reply with request: {:?}", wallet_request);

        // Send to wallet service
        let res = self
            .client
            .post(format!("{}/wallet/create-message", self.base_url))
            .json(&wallet_request)
            .send()
            .await?;

        if !res.status().is_success() {
            let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            tracing::error!("Wallet reply error: {}", error_text);
            return Err(AppError::internal(format!("Wallet error: {}", error_text)));
        }

        let response: CreateMarkerResponse = res.json().await?;
        Ok(response)
    }
}

