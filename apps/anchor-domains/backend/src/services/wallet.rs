//! Wallet service client
//!
//! This module provides a client for communicating with the anchor-wallet service
//! to create DNS transactions.

use tracing::warn;

use crate::error::{AppError, AppResult};
use crate::models::{CreateTxResponse, DnsOperation, DnsPayload, DnsRecord};

use anchor_specs::KindSpec;

/// Parameters for creating a DNS message
#[derive(Debug, Clone)]
pub struct CreateDnsParams {
    pub operation: DnsOperation,
    pub name: String,
    pub records: Vec<DnsRecord>,
    pub carrier: Option<u8>,
    /// For updates: the owner's txid and vout
    pub owner_anchor: Option<(String, i32)>,
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

    /// Create a DNS message transaction
    pub async fn create_dns_message(&self, params: CreateDnsParams) -> AppResult<CreateTxResponse> {
        // Create DNS payload based on operation
        let payload = match params.operation {
            DnsOperation::Register => DnsPayload::register(params.name.clone(), params.records),
            DnsOperation::Update => DnsPayload::update(params.name.clone(), params.records),
            DnsOperation::Transfer => DnsPayload::transfer(params.name.clone()),
        };

        let body_bytes = payload.to_bytes();
        let body_hex = hex::encode(&body_bytes);

        // Determine carrier type - force Inscription for DNS to ensure UTXO ownership works
        let carrier = self.normalize_carrier(params.carrier, &params.operation);

        // Build request
        let url = format!("{}/wallet/create-message", self.base_url);
        
        let request_body = match &params.owner_anchor {
            Some((owner_txid, owner_vout)) => {
                // Update operation - needs anchor to owner
                serde_json::json!({
                    "kind": 10,  // DNS kind
                    "body": body_hex,
                    "body_is_hex": true,
                    "carrier": carrier,
                    "additional_anchors": [{
                        "txid": owner_txid,
                        "vout": owner_vout
                    }],
                    "required_inputs": [{
                        "txid": owner_txid,
                        "vout": owner_vout
                    }],
                    "unlock_for_dns": true,
                    "domain_name": params.name,
                    "lock_for_dns": true
                })
            }
            None => {
                // Register operation
                serde_json::json!({
                    "kind": 10,  // DNS kind
                    "body": body_hex,
                    "body_is_hex": true,
                    "carrier": carrier,
                    "domain_name": params.name,
                    "lock_for_dns": true
                })
            }
        };

        let response = self.client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| AppError::wallet_error(format!("Failed to call wallet service: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::wallet_error(error_text));
        }

        let wallet_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::wallet_error(format!("Failed to parse wallet response: {}", e)))?;

        Ok(CreateTxResponse {
            txid: wallet_response["txid"].as_str().unwrap_or("").to_string(),
            vout: wallet_response["vout"].as_i64().unwrap_or(0) as i32,
            hex: wallet_response["hex"].as_str().unwrap_or("").to_string(),
            carrier: wallet_response["carrier"].as_i64().unwrap_or(0) as i32,
            carrier_name: wallet_response["carrier_name"]
                .as_str()
                .unwrap_or("op_return")
                .to_string(),
        })
    }

    /// Normalize carrier type for DNS operations
    /// 
    /// DNS operations MUST use a carrier that creates spendable UTXOs for ownership tracking.
    /// OP_RETURN (0) doesn't create spendable outputs, so we force Inscription (1) for DNS.
    fn normalize_carrier(&self, carrier: Option<u8>, operation: &DnsOperation) -> u8 {
        match carrier {
            Some(0) => {
                warn!(
                    "DNS {:?} requested with OP_RETURN carrier, switching to Inscription for UTXO ownership",
                    operation
                );
                1 // Force Inscription instead of OP_RETURN
            }
            Some(c) => c,
            None => 1, // Default to Inscription for DNS
        }
    }
}


