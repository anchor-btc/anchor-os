//! HTTP request handlers for the Anchor Domains API

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use utoipa::ToSchema;

use crate::models::{
    CreateTxResponse, DnsOperation, DnsPayload, DnsRecord, HealthResponse,
    ListParams, PaginatedResponse, RegisterDomainRequest, UpdateDomainRequest,
    is_valid_domain_name, is_txid_prefix, SUPPORTED_TLDS,
};
use crate::AppState;

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/health",
    tag = "System",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    )
)]
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "anchor-domains-backend".to_string(),
    })
}

/// Get Anchor Domains statistics
#[utoipa::path(
    get,
    path = "/stats",
    tag = "Statistics",
    responses(
        (status = 200, description = "DNS statistics", body = crate::models::DnsStats),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_stats(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.db.get_stats().await {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            error!("Failed to get stats: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Resolve a domain by name
#[utoipa::path(
    get,
    path = "/resolve/{name}",
    tag = "Resolution",
    params(
        ("name" = String, Path, description = "Domain name (e.g., mysite.btc, mysite.sat)")
    ),
    responses(
        (status = 200, description = "Domain records", body = crate::models::ResolveResponse),
        (status = 404, description = "Domain not found"),
        (status = 400, description = "Invalid domain name")
    )
)]
pub async fn resolve_domain(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Check if it's a txid prefix lookup (16 hex chars, optionally with TLD suffix)
    let clean_name = SUPPORTED_TLDS.iter()
        .find(|tld| name.ends_with(*tld))
        .map(|tld| &name[..name.len() - tld.len()])
        .unwrap_or(&name);
    
    if is_txid_prefix(clean_name) {
        // Resolve by txid prefix
        match state.db.resolve_by_txid_prefix(clean_name).await {
            Ok(Some(response)) => Ok(Json(response)),
            Ok(None) => Err((StatusCode::NOT_FOUND, "Domain not found".to_string())),
            Err(e) => {
                error!("Failed to resolve by txid prefix: {}", e);
                Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    } else {
        // Validate domain name - must already include a supported TLD
        if !is_valid_domain_name(&name) {
            return Err((StatusCode::BAD_REQUEST, format!(
                "Invalid domain name. Supported TLDs: {}",
                SUPPORTED_TLDS.join(", ")
            )));
        }

        match state.db.resolve_by_name(&name).await {
            Ok(Some(response)) => Ok(Json(response)),
            Ok(None) => Err((StatusCode::NOT_FOUND, "Domain not found".to_string())),
            Err(e) => {
                error!("Failed to resolve domain: {}", e);
                Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Resolve a domain by txid prefix
#[utoipa::path(
    get,
    path = "/resolve/txid/{prefix}",
    tag = "Resolution",
    params(
        ("prefix" = String, Path, description = "TxID prefix (16 hex chars)")
    ),
    responses(
        (status = 200, description = "Domain records", body = crate::models::ResolveResponse),
        (status = 404, description = "Domain not found"),
        (status = 400, description = "Invalid txid prefix")
    )
)]
pub async fn resolve_by_txid(
    State(state): State<Arc<AppState>>,
    Path(prefix): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !is_txid_prefix(&prefix) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid txid prefix (must be 16 hex characters)".to_string(),
        ));
    }

    match state.db.resolve_by_txid_prefix(&prefix).await {
        Ok(Some(response)) => Ok(Json(response)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Domain not found".to_string())),
        Err(e) => {
            error!("Failed to resolve by txid: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// List all domains
#[utoipa::path(
    get,
    path = "/domains",
    tag = "Domains",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default: 50)"),
        ("search" = Option<String>, Query, description = "Search query")
    ),
    responses(
        (status = 200, description = "List of domains", body = PaginatedResponse<crate::models::DomainListItem>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_domains(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state
        .db
        .list_domains(params.page, params.per_page, params.search.as_deref())
        .await
    {
        Ok((domains, total)) => {
            let total_pages = ((total as f64) / (params.per_page as f64)).ceil() as i32;
            Ok(Json(PaginatedResponse {
                data: domains,
                total,
                page: params.page,
                per_page: params.per_page,
                total_pages,
            }))
        }
        Err(e) => {
            error!("Failed to list domains: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get domain details
#[utoipa::path(
    get,
    path = "/domains/{name}",
    tag = "Domains",
    params(
        ("name" = String, Path, description = "Domain name")
    ),
    responses(
        (status = 200, description = "Domain details", body = crate::models::Domain),
        (status = 404, description = "Domain not found")
    )
)]
pub async fn get_domain(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Domain must include a supported TLD
    if !is_valid_domain_name(&name) {
        return Err((StatusCode::BAD_REQUEST, format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }

    match state.db.get_domain(&name).await {
        Ok(Some(domain)) => Ok(Json(domain)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Domain not found".to_string())),
        Err(e) => {
            error!("Failed to get domain: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Domain history entry
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HistoryEntry {
    pub txid: String,
    pub vout: i32,
    pub operation: String,
    pub block_height: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Get domain history
#[utoipa::path(
    get,
    path = "/domains/{name}/history",
    tag = "Domains",
    params(
        ("name" = String, Path, description = "Domain name")
    ),
    responses(
        (status = 200, description = "Domain history", body = Vec<HistoryEntry>),
        (status = 404, description = "Domain not found")
    )
)]
pub async fn get_domain_history(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Domain must include a supported TLD
    if !is_valid_domain_name(&name) {
        return Err((StatusCode::BAD_REQUEST, format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }

    match state.db.get_domain_history(&name).await {
        Ok(history) => {
            let entries: Vec<HistoryEntry> = history
                .into_iter()
                .map(|(txid, vout, op, height, created_at)| {
                    let operation = match op {
                        1 => "register".to_string(),
                        2 => "update".to_string(),
                        3 => "transfer".to_string(),
                        _ => format!("unknown({})", op),
                    };
                    HistoryEntry {
                        txid: hex::encode(&txid),
                        vout,
                        operation,
                        block_height: height,
                        created_at,
                    }
                })
                .collect();

            if entries.is_empty() {
                Err((StatusCode::NOT_FOUND, "Domain not found".to_string()))
            } else {
                Ok(Json(entries))
            }
        }
        Err(e) => {
            error!("Failed to get domain history: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Check if domain is available
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AvailabilityResponse {
    pub name: String,
    pub available: bool,
}

#[utoipa::path(
    get,
    path = "/available/{name}",
    tag = "Domains",
    params(
        ("name" = String, Path, description = "Domain name to check")
    ),
    responses(
        (status = 200, description = "Availability status", body = AvailabilityResponse),
        (status = 400, description = "Invalid domain name")
    )
)]
pub async fn check_availability(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Domain must include a supported TLD
    if !is_valid_domain_name(&name) {
        return Err((StatusCode::BAD_REQUEST, format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }

    match state.db.is_domain_available(&name).await {
        Ok(available) => Ok(Json(AvailabilityResponse {
            name: name.clone(),
            available,
        })),
        Err(e) => {
            error!("Failed to check availability: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Request body for getting domains by owner txids
#[derive(Debug, Deserialize, ToSchema)]
pub struct GetDomainsByOwnerRequest {
    /// List of transaction IDs (hex-encoded) that may own domains
    pub txids: Vec<String>,
}

/// Query parameters for my-domains endpoint
#[derive(Debug, Deserialize)]
pub struct MyDomainsQuery {
    /// Comma-separated list of transaction IDs (hex-encoded)
    pub owner_txids: String,
}

/// Response for my-domains endpoint
#[derive(Debug, Serialize, ToSchema)]
pub struct MyDomainsResponse {
    pub data: Vec<crate::models::DomainListItem>,
}

/// Get domains owned by a list of transaction IDs (GET with query params)
/// 
/// This endpoint is used for the "My Domains" feature. It accepts a comma-separated
/// list of transaction IDs in the query string and returns all domains where the owner_txid matches.
#[utoipa::path(
    get,
    path = "/my-domains",
    tag = "Domains",
    params(
        ("owner_txids" = String, Query, description = "Comma-separated list of owner transaction IDs (hex-encoded)")
    ),
    responses(
        (status = 200, description = "List of owned domains", body = MyDomainsResponse),
        (status = 400, description = "Invalid txid format"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_my_domains(
    State(state): State<Arc<AppState>>,
    Query(query): Query<MyDomainsQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Parse comma-separated txids
    let txid_strings: Vec<&str> = query.owner_txids.split(',').collect();
    
    // Convert hex txids to bytes
    let txids: Result<Vec<Vec<u8>>, _> = txid_strings
        .iter()
        .filter(|s| !s.is_empty())
        .map(|txid| hex::decode(txid.trim()))
        .collect();

    let txids = match txids {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Invalid txid hex format: {}", e),
            ));
        }
    };

    if txids.is_empty() {
        return Ok(Json(MyDomainsResponse { data: vec![] }));
    }

    match state.db.get_domains_by_owner_txids(&txids).await {
        Ok(domains) => Ok(Json(MyDomainsResponse { data: domains })),
        Err(e) => {
            error!("Failed to get domains by owner: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get domains owned by a list of transaction IDs
/// 
/// This endpoint is used for the "My Domains" feature. It accepts a list of
/// transaction IDs and returns all domains where the owner_txid matches.
#[utoipa::path(
    post,
    path = "/domains/by-owner",
    tag = "Domains",
    request_body = GetDomainsByOwnerRequest,
    responses(
        (status = 200, description = "List of owned domains", body = Vec<crate::models::DomainListItem>),
        (status = 400, description = "Invalid txid format"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_domains_by_owner(
    State(state): State<Arc<AppState>>,
    Json(request): Json<GetDomainsByOwnerRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Convert hex txids to bytes
    let txids: Result<Vec<Vec<u8>>, _> = request
        .txids
        .iter()
        .map(|txid| hex::decode(txid))
        .collect();

    let txids = match txids {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Invalid txid hex format: {}", e),
            ));
        }
    };

    match state.db.get_domains_by_owner_txids(&txids).await {
        Ok(domains) => Ok(Json(domains)),
        Err(e) => {
            error!("Failed to get domains by owner: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

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
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Domain must include a supported TLD
    if !is_valid_domain_name(&req.name) {
        return Err((StatusCode::BAD_REQUEST, format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }

    // Check availability
    match state.db.is_domain_available(&req.name).await {
        Ok(true) => {}
        Ok(false) => {
            return Err((
                StatusCode::BAD_REQUEST,
                "Domain is already registered".to_string(),
            ))
        }
        Err(e) => {
            error!("Failed to check availability: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    }

    // Convert records
    let records: Vec<DnsRecord> = req
        .records
        .iter()
        .filter_map(|r| r.to_dns_record())
        .collect();

    if records.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "At least one valid record is required".to_string(),
        ));
    }

    // Create DNS payload
    let payload = DnsPayload {
        operation: DnsOperation::Register,
        name: req.name.clone(),
        records,
    };

    let body_bytes = payload.to_bytes();
    let body_hex = hex::encode(&body_bytes);

    // Call wallet service
    let carrier = req.carrier.unwrap_or(0);
    let wallet_url = format!("{}/wallet/create-message", state.config.wallet_url);

    let client = reqwest::Client::new();
    let response = client
        .post(&wallet_url)
        .json(&serde_json::json!({
            "kind": 10,  // DNS kind
            "body": body_hex,
            "body_is_hex": true,
            "carrier": carrier,
            "domain_name": req.name,
            "lock_for_dns": true
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to call wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        error!("Wallet service error: {}", error_text);
        return Err((StatusCode::BAD_GATEWAY, error_text));
    }

    let wallet_response: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse wallet response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(CreateTxResponse {
        txid: wallet_response["txid"].as_str().unwrap_or("").to_string(),
        vout: wallet_response["vout"].as_i64().unwrap_or(0) as i32,
        hex: wallet_response["hex"].as_str().unwrap_or("").to_string(),
        carrier: wallet_response["carrier"].as_i64().unwrap_or(0) as i32,
        carrier_name: wallet_response["carrier_name"]
            .as_str()
            .unwrap_or("op_return")
            .to_string(),
    }))
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
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Domain must include a supported TLD
    if !is_valid_domain_name(&name) {
        return Err((StatusCode::BAD_REQUEST, format!(
            "Invalid domain name. Supported TLDs: {}",
            SUPPORTED_TLDS.join(", ")
        )));
    }

    // Get domain owner for anchor
    let owner = match state.db.get_domain_owner(&name).await {
        Ok(Some(o)) => o,
        Ok(None) => return Err((StatusCode::NOT_FOUND, "Domain not found".to_string())),
        Err(e) => {
            error!("Failed to get domain owner: {}", e);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
        }
    };

    // Convert records
    let records: Vec<DnsRecord> = req
        .records
        .iter()
        .filter_map(|r| r.to_dns_record())
        .collect();

    if records.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "At least one valid record is required".to_string(),
        ));
    }

    // Create DNS payload
    let payload = DnsPayload {
        operation: DnsOperation::Update,
        name: name.clone(),
        records,
    };

    let body_bytes = payload.to_bytes();
    let body_hex = hex::encode(&body_bytes);
    let owner_txid_hex = hex::encode(&owner.0);

    // Call wallet service with anchor to owner and required input
    let carrier = req.carrier.unwrap_or(0);
    let wallet_url = format!("{}/wallet/create-message", state.config.wallet_url);

    let client = reqwest::Client::new();
    let response = client
        .post(&wallet_url)
        .json(&serde_json::json!({
            "kind": 10,  // DNS kind
            "body": body_hex,
            "body_is_hex": true,
            "carrier": carrier,
            "additional_anchors": [{
                "txid": owner_txid_hex,
                "vout": owner.1
            }],
            "required_inputs": [{
                "txid": owner_txid_hex,
                "vout": owner.1
            }],
            "unlock_for_dns": true,
            "domain_name": name,
            "lock_for_dns": true
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to call wallet service: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        error!("Wallet service error: {}", error_text);
        return Err((StatusCode::BAD_GATEWAY, error_text));
    }

    let wallet_response: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse wallet response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let new_txid = wallet_response["txid"].as_str().unwrap_or("");
    let new_vout = wallet_response["vout"].as_i64().unwrap_or(0) as i32;

    // Optimistically update owner_txid immediately after broadcast
    // This prevents double-spend issues when multiple updates are requested quickly
    if !new_txid.is_empty() {
        if let Ok(txid_bytes) = hex::decode(new_txid) {
            match state.db.update_domain_owner_optimistic(&name, &txid_bytes, new_vout).await {
                Ok(updated) => {
                    if updated {
                        info!(
                            "Optimistically updated owner for '{}' to {}:{} (pending confirmation)",
                            name, new_txid, new_vout
                        );
                    }
                }
                Err(e) => {
                    // Log but don't fail - the indexer will update it when confirmed
                    error!("Failed to optimistically update domain owner: {}", e);
                }
            }
        }
    }

    Ok(Json(CreateTxResponse {
        txid: new_txid.to_string(),
        vout: new_vout,
        hex: wallet_response["hex"].as_str().unwrap_or("").to_string(),
        carrier: wallet_response["carrier"].as_i64().unwrap_or(0) as i32,
        carrier_name: wallet_response["carrier_name"]
            .as_str()
            .unwrap_or("op_return")
            .to_string(),
    }))
}
