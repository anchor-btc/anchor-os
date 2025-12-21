//! Registration handlers: domain registration and updates

use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;
use tracing::{info, warn};

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateTxResponse, DnsOperation, RegisterDomainRequest, UpdateDomainRequest,
};
use crate::services::validation::{validate_domain_name, validate_records};
use crate::services::wallet::{CreateDnsParams, WalletClient};
use crate::AppState;

/// Register a new domain (creates transaction via wallet service)
#[utoipa::path(
    post,
    path = "/register",
    tag = "Registration",
    request_body = RegisterDomainRequest,
    responses(
        (status = 200, description = "Transaction created", body = CreateTxResponse),
        (status = 400, description = "Invalid request or domain unavailable"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn register_domain(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterDomainRequest>,
) -> AppResult<Json<CreateTxResponse>> {
    // Validate domain name
    validate_domain_name(&req.name)?;

    // Check availability
    let is_available = state.db.is_domain_available(&req.name).await?;
    if !is_available {
        return Err(AppError::bad_request("Domain is already registered"));
    }

    // Convert and validate records
    let records = validate_records(&req.records)?;

    // Create wallet client and send request
    let wallet = WalletClient::new(&state.config.wallet_url);
    let response = wallet.create_dns_message(CreateDnsParams {
        operation: DnsOperation::Register,
        name: req.name.clone(),
        records,
        carrier: req.carrier,
        owner_anchor: None,
    }).await?;

    // Save pending transaction for UI feedback
    if !response.txid.is_empty() {
        if let Ok(txid_bytes) = hex::decode(&response.txid) {
            let carrier = req.carrier.unwrap_or(1);
            if let Err(e) = state.db.create_pending_transaction(
                &txid_bytes,
                &req.name,
                1, // register operation
                Some(&req.records),
                Some(carrier as i16),
            ).await {
                warn!("Failed to save pending transaction: {}", e);
            } else {
                info!("Saved pending transaction for domain: {}", req.name);
            }
        }
    }

    Ok(Json(response))
}

/// Update domain records (creates transaction via wallet service)
#[utoipa::path(
    post,
    path = "/update/{name}",
    tag = "Registration",
    params(
        ("name" = String, Path, description = "Domain name to update")
    ),
    request_body = UpdateDomainRequest,
    responses(
        (status = 200, description = "Transaction created", body = CreateTxResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Domain not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_domain(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
    Json(req): Json<UpdateDomainRequest>,
) -> AppResult<Json<CreateTxResponse>> {
    // Validate domain name
    validate_domain_name(&name)?;

    // Get domain owner for anchor
    let owner = state.db.get_domain_owner(&name).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Convert and validate records
    let records = validate_records(&req.records)?;

    let owner_txid_hex = hex::encode(&owner.0);

    // Create wallet client and send request
    let wallet = WalletClient::new(&state.config.wallet_url);
    let response = wallet.create_dns_message(CreateDnsParams {
        operation: DnsOperation::Update,
        name: name.clone(),
        records,
        carrier: req.carrier,
        owner_anchor: Some((owner_txid_hex, owner.1)),
    }).await?;

    // Save pending transaction for UI feedback
    if !response.txid.is_empty() {
        if let Ok(txid_bytes) = hex::decode(&response.txid) {
            let carrier = req.carrier.unwrap_or(1);
            if let Err(e) = state.db.create_pending_transaction(
                &txid_bytes,
                &name,
                2, // update operation
                Some(&req.records),
                Some(carrier as i16),
            ).await {
                warn!("Failed to save pending transaction: {}", e);
            } else {
                info!("Saved pending transaction for domain update: {}", name);
            }
        }
    }

    info!(
        "Domain '{}' update transaction broadcast: {}:{} (awaiting confirmation)",
        name, response.txid, response.vout
    );

    Ok(Json(response))
}

