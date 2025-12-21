//! Domain handlers: listing, details, history, availability

use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::sync::Arc;

use crate::error::{AppError, AppResult};
use crate::models::{
    AvailabilityResponse, Domain, DomainListItem, GetDomainsByOwnerRequest,
    HistoryEntry, ListParams, MyDomainsQuery, MyDomainsResponse, PaginatedResponse,
};
use crate::services::validation::{parse_txid_list, parse_txids, validate_domain_name};
use crate::AppState;

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
        (status = 200, description = "List of domains", body = PaginatedResponse<DomainListItem>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_domains(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<PaginatedResponse<DomainListItem>>> {
    let (domains, total) = state
        .db
        .list_domains(params.page, params.per_page, params.search.as_deref())
        .await?;
    
    Ok(Json(PaginatedResponse::new(
        domains,
        total,
        params.page,
        params.per_page,
    )))
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
        (status = 200, description = "Domain details", body = Domain),
        (status = 404, description = "Domain not found")
    )
)]
pub async fn get_domain(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
) -> AppResult<Json<Domain>> {
    validate_domain_name(&name)?;

    let domain = state.db.get_domain(&name).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;
    
    Ok(Json(domain))
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
) -> AppResult<Json<Vec<HistoryEntry>>> {
    validate_domain_name(&name)?;

    let history = state.db.get_domain_history(&name).await?;

    let entries: Vec<HistoryEntry> = history
        .into_iter()
        .map(|(txid, vout, op, height, created_at)| {
            HistoryEntry::from_db_row(txid, vout, op, height, created_at)
        })
        .collect();

    if entries.is_empty() {
        return Err(AppError::not_found("Domain not found"));
    }

    Ok(Json(entries))
}

/// Check if domain is available
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
) -> AppResult<Json<AvailabilityResponse>> {
    validate_domain_name(&name)?;

    let available = state.db.is_domain_available(&name).await?;
    
    Ok(Json(AvailabilityResponse {
        name: name.clone(),
        available,
    }))
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
) -> AppResult<Json<MyDomainsResponse>> {
    let txids = parse_txid_list(&query.owner_txids)?;

    if txids.is_empty() {
        return Ok(Json(MyDomainsResponse { data: vec![] }));
    }

    let domains = state.db.get_domains_by_owner_txids(&txids).await?;
    Ok(Json(MyDomainsResponse { data: domains }))
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
        (status = 200, description = "List of owned domains", body = Vec<DomainListItem>),
        (status = 400, description = "Invalid txid format"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_domains_by_owner(
    State(state): State<Arc<AppState>>,
    Json(request): Json<GetDomainsByOwnerRequest>,
) -> AppResult<Json<Vec<DomainListItem>>> {
    let txids = parse_txids(&request.txids)?;
    let domains = state.db.get_domains_by_owner_txids(&txids).await?;
    Ok(Json(domains))
}

