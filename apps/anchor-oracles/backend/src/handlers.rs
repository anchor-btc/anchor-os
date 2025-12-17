//! API handlers for Anchor Oracles

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::db::Database;
use crate::models::{
    Attestation, CategoryInfo, CreateEventRequest, Dispute, EventRequest,
    Oracle, OracleStats, RegisterOracleRequest, SubmitAttestationRequest,
};

pub type AppState = Arc<Database>;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StatusFilter {
    pub status: Option<String>,
}

/// Health check endpoint
pub async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "service": "anchor-oracles" }))
}

/// Get oracle network stats
#[utoipa::path(
    get,
    path = "/api/stats",
    responses(
        (status = 200, description = "Oracle network statistics", body = OracleStats)
    ),
    tag = "stats"
)]
pub async fn get_stats(State(db): State<AppState>) -> impl IntoResponse {
    match db.get_stats().await {
        Ok(stats) => Json(stats).into_response(),
        Err(e) => {
            tracing::error!("Failed to get stats: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// List all oracles
#[utoipa::path(
    get,
    path = "/api/oracles",
    params(
        ("limit" = Option<i64>, Query, description = "Max results"),
        ("offset" = Option<i64>, Query, description = "Offset")
    ),
    responses(
        (status = 200, description = "List of oracles", body = Vec<Oracle>)
    ),
    tag = "oracles"
)]
pub async fn list_oracles(
    State(db): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);

    match db.get_oracles(limit, offset).await {
        Ok(oracles) => Json(oracles).into_response(),
        Err(e) => {
            tracing::error!("Failed to list oracles: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Get oracle by pubkey
#[utoipa::path(
    get,
    path = "/api/oracles/{pubkey}",
    params(
        ("pubkey" = String, Path, description = "Oracle public key (hex)")
    ),
    responses(
        (status = 200, description = "Oracle details", body = Oracle),
        (status = 404, description = "Oracle not found")
    ),
    tag = "oracles"
)]
pub async fn get_oracle(
    State(db): State<AppState>,
    Path(pubkey): Path<String>,
) -> impl IntoResponse {
    let pubkey_bytes = match hex::decode(&pubkey) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid pubkey hex").into_response(),
    };

    match db.get_oracle_by_pubkey(&pubkey_bytes).await {
        Ok(Some(oracle)) => Json(oracle).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Oracle not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to get oracle: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Get oracle's attestation history
#[utoipa::path(
    get,
    path = "/api/oracles/{pubkey}/attestations",
    params(
        ("pubkey" = String, Path, description = "Oracle public key (hex)"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "Oracle's attestations", body = Vec<Attestation>)
    ),
    tag = "oracles"
)]
pub async fn get_oracle_attestations(
    State(db): State<AppState>,
    Path(pubkey): Path<String>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let pubkey_bytes = match hex::decode(&pubkey) {
        Ok(b) => b,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid pubkey hex").into_response(),
    };

    let oracle = match db.get_oracle_by_pubkey(&pubkey_bytes).await {
        Ok(Some(o)) => o,
        Ok(None) => return (StatusCode::NOT_FOUND, "Oracle not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let limit = params.limit.unwrap_or(50).min(100);
    match db.get_attestations_by_oracle(oracle.id, limit).await {
        Ok(attestations) => Json(attestations).into_response(),
        Err(e) => {
            tracing::error!("Failed to get oracle attestations: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Register a new oracle (returns message to sign)
#[utoipa::path(
    post,
    path = "/api/oracles/register",
    request_body = RegisterOracleRequest,
    responses(
        (status = 200, description = "Registration request created")
    ),
    tag = "oracles"
)]
pub async fn register_oracle(
    State(_db): State<AppState>,
    Json(req): Json<RegisterOracleRequest>,
) -> impl IntoResponse {
    // In production, this would create an unsigned transaction
    // The client would sign it with the oracle's key
    Json(serde_json::json!({
        "status": "pending",
        "message": "Sign the registration message with your oracle key",
        "pubkey": req.pubkey,
        "name": req.name,
        "categories": req.categories,
    }))
}

/// List recent attestations
#[utoipa::path(
    get,
    path = "/api/attestations",
    params(
        ("limit" = Option<i64>, Query, description = "Max results"),
        ("offset" = Option<i64>, Query, description = "Offset")
    ),
    responses(
        (status = 200, description = "List of attestations", body = Vec<Attestation>)
    ),
    tag = "attestations"
)]
pub async fn list_attestations(
    State(db): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0);

    match db.get_attestations(limit, offset).await {
        Ok(attestations) => Json(attestations).into_response(),
        Err(e) => {
            tracing::error!("Failed to list attestations: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Submit an attestation request
#[utoipa::path(
    post,
    path = "/api/attestations/submit",
    request_body = SubmitAttestationRequest,
    responses(
        (status = 200, description = "Attestation submission request created")
    ),
    tag = "attestations"
)]
pub async fn submit_attestation(
    State(_db): State<AppState>,
    Json(req): Json<SubmitAttestationRequest>,
) -> impl IntoResponse {
    // In production, this would create an unsigned transaction
    Json(serde_json::json!({
        "status": "pending",
        "message": "Sign the attestation with your oracle key",
        "oracle_pubkey": req.oracle_pubkey,
        "event_id": req.event_id,
        "category": req.category,
    }))
}

/// List pending event requests
#[utoipa::path(
    get,
    path = "/api/events",
    params(
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "List of event requests", body = Vec<EventRequest>)
    ),
    tag = "events"
)]
pub async fn list_events(
    State(db): State<AppState>,
    Query(params): Query<PaginationParams>,
    Query(filter): Query<StatusFilter>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);

    match db.get_event_requests(filter.status.as_deref(), limit).await {
        Ok(events) => Json(events).into_response(),
        Err(e) => {
            tracing::error!("Failed to list events: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Create an event request
#[utoipa::path(
    post,
    path = "/api/events/request",
    request_body = CreateEventRequest,
    responses(
        (status = 200, description = "Event request created")
    ),
    tag = "events"
)]
pub async fn create_event_request(
    State(_db): State<AppState>,
    Json(req): Json<CreateEventRequest>,
) -> impl IntoResponse {
    // In production, this would create the event request
    Json(serde_json::json!({
        "status": "created",
        "category": req.category,
        "description": req.description,
        "resolution_block": req.resolution_block,
    }))
}

/// List disputes
#[utoipa::path(
    get,
    path = "/api/disputes",
    params(
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("limit" = Option<i64>, Query, description = "Max results")
    ),
    responses(
        (status = 200, description = "List of disputes", body = Vec<Dispute>)
    ),
    tag = "disputes"
)]
pub async fn list_disputes(
    State(db): State<AppState>,
    Query(params): Query<PaginationParams>,
    Query(filter): Query<StatusFilter>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(100);

    match db.get_disputes(filter.status.as_deref(), limit).await {
        Ok(disputes) => Json(disputes).into_response(),
        Err(e) => {
            tracing::error!("Failed to list disputes: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// List oracle categories
#[utoipa::path(
    get,
    path = "/api/categories",
    responses(
        (status = 200, description = "List of categories", body = Vec<CategoryInfo>)
    ),
    tag = "categories"
)]
pub async fn list_categories(State(db): State<AppState>) -> impl IntoResponse {
    match db.get_categories().await {
        Ok(categories) => Json(categories).into_response(),
        Err(e) => {
            tracing::error!("Failed to list categories: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

