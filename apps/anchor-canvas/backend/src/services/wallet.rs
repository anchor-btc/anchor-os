//! Wallet service client
//!
//! This module provides a client for communicating with the anchor-wallet service
//! to create pixel transactions using the State kind.

use anchor_specs::state::{PixelData, StateSpec};
use anchor_specs::KindSpec;
use serde::{Deserialize, Serialize};
use tracing::{debug, warn};

use crate::error::{AppError, AppResult};

/// Response from creating a transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTxResponse {
    pub txid: String,
    pub hex: String,
    pub fee: u64,
}

/// Parameters for creating a pixel message
#[derive(Debug, Clone)]
pub struct CreatePixelParams {
    pub pixels: Vec<PixelData>,
    pub carrier: Option<u8>,
}

/// Wallet service client
#[derive(Debug, Clone)]
pub struct WalletClient {
    base_url: String,
    client: reqwest::Client,
}

impl WalletClient {
    /// Create a new wallet client
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// Create a pixel message transaction
    pub async fn create_pixel_message(&self, params: CreatePixelParams) -> AppResult<CreateTxResponse> {
        // Create StateSpec from pixels
        let spec = StateSpec::new(params.pixels);
        
        // Validate the spec
        spec.validate().map_err(|e| {
            AppError::BadRequest(format!("Invalid pixel data: {}", e))
        })?;

        let body_bytes = spec.to_bytes();
        let body_hex = hex::encode(&body_bytes);

        debug!(
            "Creating pixel message with {} pixels, body size: {} bytes",
            spec.pixels.len(),
            body_bytes.len()
        );

        // Build the request
        let mut request = serde_json::json!({
            "kind": StateSpec::KIND_ID,
            "body": body_hex,
        });

        // Add carrier if specified
        if let Some(carrier) = params.carrier {
            request["carrier"] = serde_json::json!(carrier);
        }

        // Send to wallet service
        let response = self
            .client
            .post(format!("{}/api/message", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                warn!("Wallet request failed: {}", e);
                AppError::Internal(format!("Wallet service error: {}", e))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            warn!("Wallet returned error: {} - {}", status, body);
            return Err(AppError::Internal(format!(
                "Wallet service returned {}: {}",
                status, body
            )));
        }

        let tx_response: CreateTxResponse = response.json().await.map_err(|e| {
            AppError::Internal(format!("Failed to parse wallet response: {}", e))
        })?;

        debug!("Created pixel transaction: {}", tx_response.txid);
        Ok(tx_response)
    }

    /// Broadcast a signed transaction
    pub async fn broadcast(&self, tx_hex: &str) -> AppResult<String> {
        let response = self
            .client
            .post(format!("{}/api/broadcast", self.base_url))
            .json(&serde_json::json!({
                "hex": tx_hex,
            }))
            .send()
            .await
            .map_err(|e| {
                AppError::Internal(format!("Broadcast failed: {}", e))
            })?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!("Broadcast failed: {}", body)));
        }

        #[derive(Deserialize)]
        struct BroadcastResponse {
            txid: String,
        }

        let result: BroadcastResponse = response.json().await.map_err(|e| {
            AppError::Internal(format!("Failed to parse broadcast response: {}", e))
        })?;

        Ok(result.txid)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pixel_params() {
        let pixels = vec![
            PixelData::new(100, 200, 255, 0, 0),
            PixelData::new(101, 200, 0, 255, 0),
        ];
        
        let params = CreatePixelParams {
            pixels: pixels.clone(),
            carrier: Some(0),
        };

        assert_eq!(params.pixels.len(), 2);
        assert_eq!(params.carrier, Some(0));
    }

    #[test]
    fn test_state_spec_encoding() {
        let pixels = vec![
            PixelData::new(100, 200, 255, 0, 0),
        ];
        
        let spec = StateSpec::new(pixels);
        let bytes = spec.to_bytes();
        
        // Should be 4 bytes for count + 7 bytes per pixel
        assert_eq!(bytes.len(), 4 + 7);
    }
}

