//! HTTP request handlers for the BitDNS API

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::models::{
    CreateTxResponse, DnsOperation, DnsPayload, DnsRecord, HealthResponse,
    ListParams, PaginatedResponse, RegisterDomainRequest, UpdateDomainRequest,
    is_valid_domain_name, is_txid_prefix,
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
        service: "bitdns-backend".to_string(),
    })
}

/// Get BitDNS statistics
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
        ("name" = String, Path, description = "Domain name (e.g., mysite.bit)")
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
    // Check if it's a txid prefix lookup (16 hex chars ending in .bit)
    let clean_name = name.trim_end_matches(".bit");
    
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
        // Validate domain name
        let full_name = if name.ends_with(".bit") {
            name.clone()
        } else {
            format!("{}.bit", name)
        };

        if !is_valid_domain_name(&full_name) {
            return Err((StatusCode::BAD_REQUEST, "Invalid domain name".to_string()));
        }

        match state.db.resolve_by_name(&full_name).await {
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
    let full_name = if name.ends_with(".bit") {
        name
    } else {
        format!("{}.bit", name)
    };

    match state.db.get_domain(&full_name).await {
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
    let full_name = if name.ends_with(".bit") {
        name
    } else {
        format!("{}.bit", name)
    };

    match state.db.get_domain_history(&full_name).await {
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
    let full_name = if name.ends_with(".bit") {
        name.clone()
    } else {
        format!("{}.bit", name)
    };

    if !is_valid_domain_name(&full_name) {
        return Err((StatusCode::BAD_REQUEST, "Invalid domain name".to_string()));
    }

    match state.db.is_domain_available(&full_name).await {
        Ok(available) => Ok(Json(AvailabilityResponse {
            name: full_name,
            available,
        })),
        Err(e) => {
            error!("Failed to check availability: {}", e);
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
    let full_name = if req.name.ends_with(".bit") {
        req.name.clone()
    } else {
        format!("{}.bit", req.name)
    };

    // Validate domain name
    if !is_valid_domain_name(&full_name) {
        return Err((StatusCode::BAD_REQUEST, "Invalid domain name".to_string()));
    }

    // Check availability
    match state.db.is_domain_available(&full_name).await {
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
        name: full_name.clone(),
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
            "carrier": carrier
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
    let full_name = if name.ends_with(".bit") {
        name.clone()
    } else {
        format!("{}.bit", name)
    };

    // Get domain owner for anchor
    let owner = match state.db.get_domain_owner(&full_name).await {
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
        name: full_name.clone(),
        records,
    };

    let body_bytes = payload.to_bytes();
    let body_hex = hex::encode(&body_bytes);
    let owner_txid_hex = hex::encode(&owner.0);

    // Call wallet service with anchor to owner
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
            "anchors": [{
                "txid": owner_txid_hex,
                "vout": owner.1
            }]
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
