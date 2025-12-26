//! Identity DNS handlers for Selfie Records support
//!
//! Implements DNS-based identity publishing according to the Selfie Records spec:
//! https://selfie-records.com/spec
//!
//! Allows publishing Nostr (npub) and Pubky (pk:) identities to domain DNS TXT records.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;

use crate::AppState;

/// Identity type for DNS publishing
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum IdentityType {
    Nostr,
    Pubky,
}

impl IdentityType {
    /// Get the DNS record prefix (without the underscore)
    pub fn dns_prefix(&self) -> &'static str {
        match self {
            IdentityType::Nostr => "nostr",
            IdentityType::Pubky => "pubky",
        }
    }
    
    /// Convert to string for database storage
    pub fn as_str(&self) -> &'static str {
        match self {
            IdentityType::Nostr => "nostr",
            IdentityType::Pubky => "pubky",
        }
    }
}

/// Published identity record
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PublishedIdentity {
    /// Identity type (nostr or pubky)
    pub identity_type: String,
    /// User subdomain (e.g., "hello" for hello.user._nostr.domain.com)
    pub subdomain: Option<String>,
    /// Public key (npub1... or pk:...)
    pub public_key: String,
    /// Full DNS record name
    pub record_name: String,
    /// When published
    pub published_at: String,
}

/// Request to publish an identity to DNS
#[derive(Debug, Deserialize, ToSchema)]
pub struct PublishIdentityRequest {
    /// Identity type
    pub identity_type: IdentityType,
    /// Public key (hex encoded or formatted npub/pk:)
    pub public_key: String,
    /// Subdomain (optional)
    pub subdomain: Option<String>,
}

/// Response after publishing identity
#[derive(Debug, Serialize, ToSchema)]
pub struct PublishIdentityResponse {
    pub success: bool,
    pub record_name: String,
    pub record_value: String,
    pub message: String,
}

/// List of published identities for a domain
#[derive(Debug, Serialize, ToSchema)]
pub struct DomainIdentitiesResponse {
    pub domain: String,
    pub identities: Vec<PublishedIdentity>,
}

/// Build the DNS record name according to Selfie Records spec
/// Format: [subdomain.]user._[type].domain.tld
fn build_record_name(domain: &str, identity_type: &IdentityType, subdomain: Option<&str>) -> String {
    let prefix = identity_type.dns_prefix();
    match subdomain {
        Some(sub) => format!("{}.user._{}.{}", sub, prefix, domain),
        None => format!("user._{}.{}", prefix, domain),
    }
}

/// Format public key for DNS TXT record based on identity type
fn format_public_key(identity_type: &IdentityType, public_key: &str) -> String {
    match identity_type {
        IdentityType::Nostr => {
            // If already npub format, use as-is
            if public_key.starts_with("npub1") {
                public_key.to_string()
            } else {
                // Assume hex, format as npub (simplified)
                format!("npub1{}", &public_key[..if public_key.len() > 59 { 59 } else { public_key.len() }])
            }
        }
        IdentityType::Pubky => {
            // If already pk: format, use as-is
            if public_key.starts_with("pk:") {
                public_key.to_string()
            } else {
                // Format as pk:
                format!("pk:{}", public_key)
            }
        }
    }
}

/// List identities published to a domain
#[utoipa::path(
    get,
    path = "/api/domains/{domain}/identities",
    params(
        ("domain" = String, Path, description = "Domain name")
    ),
    responses(
        (status = 200, description = "List of published identities", body = DomainIdentitiesResponse),
        (status = 404, description = "Domain not found")
    ),
    tag = "Identity"
)]
pub async fn list_domain_identities(
    State(state): State<Arc<AppState>>,
    Path(domain): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Verify domain exists and get its ID
    let domain_data = state.db.get_domain(&domain).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Domain not found".to_string()))?;

    // Query identities from database
    let identity_rows = state.db.get_domain_identities(domain_data.id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Convert to response format
    let identities: Vec<PublishedIdentity> = identity_rows
        .into_iter()
        .map(|row| PublishedIdentity {
            identity_type: row.identity_type,
            subdomain: row.subdomain,
            public_key: row.public_key,
            record_name: row.record_name,
            published_at: row.published_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(DomainIdentitiesResponse {
        domain,
        identities,
    }))
}

/// Publish an identity to a domain's DNS
///
/// This creates a TXT record according to the Selfie Records spec:
/// - Nostr: hello.user._nostr.domain.com TXT "npub1..."
/// - Pubky: hello.user._pubky.domain.com TXT "pk:..."
#[utoipa::path(
    post,
    path = "/api/domains/{domain}/identities",
    params(
        ("domain" = String, Path, description = "Domain name")
    ),
    request_body = PublishIdentityRequest,
    responses(
        (status = 200, description = "Identity published", body = PublishIdentityResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Domain not found"),
        (status = 501, description = "DNS provider not configured")
    ),
    tag = "Identity"
)]
pub async fn publish_domain_identity(
    State(state): State<Arc<AppState>>,
    Path(domain): Path<String>,
    Json(req): Json<PublishIdentityRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Verify domain exists and get its ID
    let domain_data = state.db.get_domain(&domain).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Domain not found".to_string()))?;

    // Build the DNS record
    let record_name = build_record_name(&domain, &req.identity_type, req.subdomain.as_deref());
    let record_value = format_public_key(&req.identity_type, &req.public_key);

    // Store in database (also creates TXT record)
    state.db.insert_domain_identity(
        domain_data.id,
        req.identity_type.as_str(),
        &req.public_key,
        req.subdomain.as_deref(),
        &record_name,
        &record_value,
    ).await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PublishIdentityResponse {
        success: true,
        record_name: record_name.clone(),
        record_value: record_value.clone(),
        message: format!(
            "Identity published successfully!\n\
             DNS Record: {}\n\
             Value: {}\n\n\
             Verify with: dig @1.1.1.1 txt {}",
            record_name, record_value, record_name
        ),
    }))
}

/// Remove an identity from a domain's DNS
#[utoipa::path(
    delete,
    path = "/api/domains/{domain}/identities/{identity_type}",
    params(
        ("domain" = String, Path, description = "Domain name"),
        ("identity_type" = String, Path, description = "Identity type (nostr or pubky)")
    ),
    responses(
        (status = 204, description = "Identity removed"),
        (status = 404, description = "Domain or identity not found"),
        (status = 501, description = "DNS provider not configured")
    ),
    tag = "Identity"
)]
pub async fn remove_domain_identity(
    State(state): State<Arc<AppState>>,
    Path((domain, identity_type)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Verify domain exists and get its ID
    let domain_data = state.db.get_domain(&domain).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Domain not found".to_string()))?;

    let identity_type_str = match identity_type.as_str() {
        "nostr" => "nostr",
        "pubky" => "pubky",
        _ => return Err((StatusCode::BAD_REQUEST, "Invalid identity type".to_string())),
    };

    // Delete from database
    let deleted = state.db.delete_domain_identity(domain_data.id, identity_type_str, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err((StatusCode::NOT_FOUND, "Identity not found".to_string()))
    }
}

/// Resolve an identity from DNS
///
/// Queries DNS for identity records according to Selfie Records spec.
#[utoipa::path(
    get,
    path = "/api/identities/resolve",
    params(
        ("address" = String, Query, description = "Address in format user@domain.com or subdomain.user@domain.com"),
        ("type" = String, Query, description = "Identity type (nostr or pubky)")
    ),
    responses(
        (status = 200, description = "Identity resolved"),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identity"
)]
pub async fn resolve_identity(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<ResolveIdentityParams>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let identity_type = match params.identity_type.as_str() {
        "nostr" => IdentityType::Nostr,
        "pubky" => IdentityType::Pubky,
        _ => return Err((StatusCode::BAD_REQUEST, "Invalid identity type".to_string())),
    };

    // Parse address format: [subdomain.]user@domain.com
    let parts: Vec<&str> = params.address.split('@').collect();
    if parts.len() != 2 {
        return Err((StatusCode::BAD_REQUEST, "Invalid address format. Use user@domain.com".to_string()));
    }

    let user_part = parts[0];
    let domain = parts[1];

    // Check if there's a subdomain in user part
    let subdomain = if user_part.contains('.') {
        let user_parts: Vec<&str> = user_part.split('.').collect();
        Some(user_parts[0].to_string())
    } else {
        None
    };

    let record_name = build_record_name(domain, &identity_type, subdomain.as_deref());

    // Try to find in database first
    if let Ok(Some(domain_data)) = state.db.get_domain(domain).await {
        if let Ok(identities) = state.db.get_domain_identities(domain_data.id).await {
            for id in identities {
                if id.identity_type == identity_type.as_str() && id.subdomain == subdomain {
                    return Ok(Json(serde_json::json!({
                        "address": params.address,
                        "identity_type": identity_type.as_str(),
                        "record_name": record_name,
                        "public_key": id.public_key,
                        "resolved": true,
                        "source": "database"
                    })));
                }
            }
        }
    }

    // Not found in database
    Ok(Json(serde_json::json!({
        "address": params.address,
        "identity_type": identity_type.as_str(),
        "record_name": record_name,
        "public_key": null,
        "resolved": false,
        "message": format!("Identity not found. Try: dig @1.1.1.1 txt {}", record_name)
    })))
}

#[derive(Debug, Deserialize)]
pub struct ResolveIdentityParams {
    pub address: String,
    #[serde(rename = "type")]
    pub identity_type: String,
}
