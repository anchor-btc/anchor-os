//! ANCHOR message creation handler

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use utoipa::ToSchema;

use crate::locked::LockReason;
use crate::AppState;

/// Anchor reference for additional message references
#[derive(Debug, Deserialize, ToSchema)]
pub struct AnchorRef {
    /// Transaction ID (hex)
    pub txid: String,
    /// Output index
    pub vout: u8,
}

/// Output specification for custom transaction outputs
#[derive(Debug, Deserialize, ToSchema)]
pub struct OutputSpec {
    /// Recipient Bitcoin address
    pub address: String,
    /// Amount in satoshis
    pub value: u64,
}

/// Request body for creating an ANCHOR message
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateMessageRequest {
    /// Message kind (0=generic, 1=text, etc.)
    #[serde(default = "default_kind")]
    pub kind: u8,
    /// Message body (text for kind=1, or hex-encoded binary)
    pub body: String,
    /// Whether body is hex-encoded (default: false, treated as UTF-8 text)
    #[serde(default)]
    pub body_is_hex: bool,
    /// Parent transaction ID (for replies)
    pub parent_txid: Option<String>,
    /// Parent output index (for replies)
    pub parent_vout: Option<u8>,
    /// Additional anchor references [(txid, vout), ...]
    #[serde(default)]
    pub additional_anchors: Vec<AnchorRef>,
    /// Carrier type (0=op_return, 1=inscription, 2=stamps, 3=annex, 4=witness)
    /// Default: 0 (OP_RETURN)
    pub carrier: Option<u8>,
    /// Fee rate in sat/vbyte (default: 1)
    #[serde(default = "default_fee_rate")]
    pub fee_rate: u64,
    /// Required inputs - UTXOs that MUST be spent as inputs (for token transfers)
    #[serde(default)]
    pub required_inputs: Vec<AnchorRef>,
    /// Custom outputs to create (for token transfers)
    #[serde(default)]
    pub outputs: Vec<OutputSpec>,
    /// Unlock domain UTXOs for this transaction (for DNS updates)
    /// When true, locked domain UTXOs in required_inputs will be temporarily unlocked
    #[serde(default)]
    pub unlock_for_dns: bool,
    /// Lock the created UTXO for DNS (for new domain registrations)
    /// When true, the anchor output will be locked as a domain UTXO
    #[serde(default)]
    pub lock_for_dns: bool,
    /// Domain name for DNS operations (used with unlock_for_dns or lock_for_dns)
    pub domain_name: Option<String>,
    /// Lock the created UTXO for Token operations
    /// When true, the anchor output will be locked as a token UTXO
    #[serde(default)]
    pub lock_for_token: bool,
    /// Token ticker for token operations (used with lock_for_token)
    pub token_ticker: Option<String>,
}

fn default_fee_rate() -> u64 {
    50 // 50 sat/vbyte - higher for regtest compatibility
}

fn default_kind() -> u8 {
    1 // Text
}

/// Response for created message
#[derive(Serialize, ToSchema)]
pub struct CreateMessageResponse {
    pub txid: String,
    pub vout: u32,
    pub hex: String,
    pub carrier: u8,
    pub carrier_name: String,
}

/// Create and broadcast an ANCHOR message
#[utoipa::path(
    post,
    path = "/wallet/create-message",
    tag = "ANCHOR",
    request_body = CreateMessageRequest,
    responses(
        (status = 200, description = "Message created and broadcast", body = CreateMessageResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_message(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateMessageRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Parse body
    let body = if req.body_is_hex {
        hex::decode(&req.body)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid hex body: {}", e)))?
    } else {
        req.body.as_bytes().to_vec()
    };

    // Convert additional anchors
    let additional_anchors: Vec<(String, u8)> = req
        .additional_anchors
        .into_iter()
        .map(|a| (a.txid, a.vout))
        .collect();

    // Convert required inputs
    let required_inputs: Vec<(String, u32)> = req
        .required_inputs
        .iter()
        .map(|a| (a.txid.clone(), a.vout as u32))
        .collect();

    // Convert custom outputs
    let custom_outputs: Vec<(String, u64)> = req
        .outputs
        .into_iter()
        .map(|o| (o.address, o.value))
        .collect();

    // Track DNS unlock info for lock transfer after successful TX
    let dns_unlock_info: Option<(String, String, u32)> = if req.unlock_for_dns {
        if let (Some(domain_name), Some(first_input)) =
            (&req.domain_name, req.required_inputs.first())
        {
            info!(
                "DNS unlock requested for domain '{}': spending UTXO {}:{}",
                domain_name, first_input.txid, first_input.vout
            );
            Some((
                domain_name.clone(),
                first_input.txid.clone(),
                first_input.vout as u32,
            ))
        } else {
            None
        }
    } else {
        None
    };

    info!(
        "Creating ANCHOR message: kind={}, body_len={}, parent={:?}, carrier={:?}, fee_rate={}, required_inputs={}, outputs={}, dns_unlock={}",
        req.kind,
        body.len(),
        req.parent_txid,
        req.carrier,
        req.fee_rate,
        required_inputs.len(),
        custom_outputs.len(),
        req.unlock_for_dns
    );

    // Get locked set but exclude DNS UTXOs if unlocking for DNS
    let locked_set = if req.unlock_for_dns {
        // For DNS updates, exclude the domain UTXO from the locked set
        // so it can be spent as a required input
        let mut set = state.lock_manager.get_locked_set();
        for input in &required_inputs {
            set.remove(&(input.0.clone(), input.1));
        }
        Some(set)
    } else {
        Some(state.lock_manager.get_locked_set())
    };

    match state.wallet.create_anchor_transaction_advanced_with_locks(
        req.kind,
        body,
        req.parent_txid,
        req.parent_vout,
        additional_anchors,
        req.carrier,
        req.fee_rate,
        required_inputs,
        custom_outputs,
        locked_set.as_ref(),
    ) {
        Ok(result) => {
            info!(
                "Created transaction: {} with carrier {}",
                result.txid, result.carrier_name
            );

            // Handle domain lock transfer after successful DNS update
            if let Some((domain_name, old_txid, old_vout)) = dns_unlock_info {
                // Transfer the domain lock from the old UTXO to the new transaction output
                // The new ownership UTXO is at output 0 of the new transaction (standard change output)
                // We use vout 0 as the new ownership output
                let new_vout = 0u32;

                match state.lock_manager.transfer_domain_lock(
                    &domain_name,
                    &old_txid,
                    old_vout,
                    result.txid.clone(),
                    new_vout,
                ) {
                    Ok(true) => {
                        info!(
                            "Transferred domain lock for '{}' from {}:{} to {}:{}",
                            domain_name, old_txid, old_vout, result.txid, new_vout
                        );
                    }
                    Ok(false) => {
                        // No existing lock found, create new lock
                        if let Err(e) = state.lock_manager.lock(
                            result.txid.clone(),
                            new_vout,
                            LockReason::Domain {
                                name: domain_name.clone(),
                            },
                        ) {
                            warn!("Failed to lock new domain UTXO: {}", e);
                        } else {
                            info!(
                                "Created new domain lock for '{}' at {}:{}",
                                domain_name, result.txid, new_vout
                            );
                        }
                    }
                    Err(e) => {
                        warn!("Failed to transfer domain lock: {}", e);
                    }
                }
            }

            // Handle domain lock for new registrations
            if req.lock_for_dns {
                if let Some(domain_name) = &req.domain_name {
                    // For inscription/witness carriers, the anchor output is spendable
                    // Lock it to prevent accidental spending
                    let lock_vout = result.anchor_vout;
                    if let Err(e) = state.lock_manager.lock(
                        result.txid.clone(),
                        lock_vout,
                        LockReason::Domain {
                            name: domain_name.clone(),
                        },
                    ) {
                        warn!(
                            "Failed to lock new domain UTXO {}:{}: {}",
                            result.txid, lock_vout, e
                        );
                    } else {
                        info!(
                            "Locked domain '{}' UTXO at {}:{}",
                            domain_name, result.txid, lock_vout
                        );
                    }
                }
            }

            // Handle token lock for mints and deploys
            if req.lock_for_token {
                if let Some(ticker) = &req.token_ticker {
                    // Lock the anchor output as a token UTXO
                    let lock_vout = result.anchor_vout;
                    if let Err(e) = state.lock_manager.lock(
                        result.txid.clone(),
                        lock_vout,
                        LockReason::Token {
                            ticker: ticker.clone(),
                            amount: "0".to_string(),
                        },
                    ) {
                        warn!(
                            "Failed to lock token UTXO {}:{}: {}",
                            result.txid, lock_vout, e
                        );
                    } else {
                        info!(
                            "Locked token '{}' UTXO at {}:{}",
                            ticker, result.txid, lock_vout
                        );
                    }
                }
            }

            Ok(Json(CreateMessageResponse {
                txid: result.txid,
                vout: result.anchor_vout,
                hex: result.hex,
                carrier: result.carrier,
                carrier_name: result.carrier_name,
            }))
        }
        Err(e) => {
            error!("Failed to create message: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
