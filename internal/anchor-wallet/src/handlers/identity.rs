//! Identity management HTTP handlers
//!
//! These handlers manage decentralized identities (Nostr, Pubky, etc.)

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;

use crate::identity::{
    DnsPublishInfo, Identity, IdentityMetadata, IdentityType,
    NostrMetadata, PubkyMetadata, NOSTR_DEFAULT_RELAYS, PUBKY_HOMESERVERS,
};
use crate::AppState;

// ============================================================================
// Request/Response Types
// ============================================================================

/// Create identity request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateIdentityRequest {
    /// Identity type: "nostr" or "pubky"
    pub identity_type: String,
    /// User-friendly label
    pub label: String,
    /// Public key (hex encoded, 32 bytes)
    pub public_key: String,
    /// Encrypted private key (hex encoded)
    pub private_key_encrypted: String,
    /// Protocol-specific metadata (optional)
    pub metadata: Option<CreateIdentityMetadata>,
}

/// Metadata for creating identity
#[derive(Debug, Deserialize, ToSchema)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CreateIdentityMetadata {
    Nostr {
        relays: Option<Vec<String>>,
        nip05: Option<String>,
        name: Option<String>,
    },
    Pubky {
        homeserver: Option<String>,
    },
}

/// Update identity request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateIdentityRequest {
    /// New label (optional)
    pub label: Option<String>,
    /// Updated metadata (optional)
    pub metadata: Option<CreateIdentityMetadata>,
}

/// Identity response
#[derive(Debug, Serialize, ToSchema)]
pub struct IdentityResponse {
    pub id: String,
    pub identity_type: String,
    pub label: String,
    pub public_key: String,
    pub formatted_public_key: String,
    pub is_primary: bool,
    pub metadata: serde_json::Value,
    pub dns_published: Option<DnsPublishedResponse>,
    pub created_at: String,
    pub updated_at: String,
}

/// DNS published info response
#[derive(Debug, Serialize, ToSchema)]
pub struct DnsPublishedResponse {
    pub domain: String,
    pub subdomain: Option<String>,
    pub record_name: String,
    pub published_at: String,
}

/// Set DNS published request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SetDnsPublishedRequest {
    /// Domain where identity is published
    pub domain: String,
    /// Subdomain (optional)
    pub subdomain: Option<String>,
}

/// List identities response
#[derive(Debug, Serialize, ToSchema)]
pub struct ListIdentitiesResponse {
    pub identities: Vec<IdentityResponse>,
    pub total: usize,
}

/// Identity defaults response (for wizards)
#[derive(Debug, Serialize, ToSchema)]
pub struct IdentityDefaultsResponse {
    pub nostr: NostrDefaults,
    pub pubky: PubkyDefaults,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NostrDefaults {
    pub relays: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PubkyDefaults {
    pub homeservers: Vec<HomeserverInfo>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HomeserverInfo {
    pub name: String,
    pub url: String,
    pub requires_invite: bool,
}

/// Sign message request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SignMessageRequest {
    /// Message to sign (hex encoded)
    pub message: String,
}

/// Sign message response
#[derive(Debug, Serialize, ToSchema)]
pub struct SignMessageResponse {
    /// Signature (hex encoded, 64 bytes)
    pub signature: String,
    /// Public key that signed (hex encoded)
    pub public_key: String,
}

/// Verify signature request
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifySignatureRequest {
    /// Message that was signed (hex encoded)
    pub message: String,
    /// Signature to verify (hex encoded, 64 bytes)
    pub signature: String,
    /// Public key to verify against (hex encoded)
    pub public_key: String,
}

/// Verify signature response
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifySignatureResponse {
    /// Whether signature is valid
    pub valid: bool,
}

/// Generate keypair request
#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateKeypairRequest {
    /// Identity type: "nostr" or "pubky"
    pub identity_type: String,
}

/// Generate keypair response
#[derive(Debug, Serialize, ToSchema)]
pub struct GenerateKeypairResponse {
    /// Public key (hex encoded, 32 bytes)
    pub public_key: String,
    /// Private key (hex encoded) - should be encrypted by client before storing
    pub private_key: String,
    /// Formatted public key (npub or pk:)
    pub formatted: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn identity_to_response(identity: &Identity) -> IdentityResponse {
    let metadata = match &identity.metadata {
        IdentityMetadata::Nostr(m) => serde_json::json!({
            "type": "nostr",
            "relays": m.relays,
            "nip05": m.nip05,
            "name": m.name,
            "about": m.about,
            "picture": m.picture,
        }),
        IdentityMetadata::Pubky(m) => serde_json::json!({
            "type": "pubky",
            "homeserver": m.homeserver,
            "registered": m.registered,
            "profile_url": m.profile_url,
        }),
    };

    let dns_published = identity.dns_published.as_ref().map(|d| DnsPublishedResponse {
        domain: d.domain.clone(),
        subdomain: d.subdomain.clone(),
        record_name: d.record_name.clone(),
        published_at: d.published_at.to_rfc3339(),
    });

    IdentityResponse {
        id: identity.id.clone(),
        identity_type: match identity.identity_type {
            IdentityType::Nostr => "nostr".to_string(),
            IdentityType::Pubky => "pubky".to_string(),
        },
        label: identity.label.clone(),
        public_key: identity.public_key.clone(),
        formatted_public_key: identity.formatted_public_key(),
        is_primary: identity.is_primary,
        metadata,
        dns_published,
        created_at: identity.created_at.to_rfc3339(),
        updated_at: identity.updated_at.to_rfc3339(),
    }
}

fn parse_identity_type(s: &str) -> Result<IdentityType, (StatusCode, String)> {
    match s.to_lowercase().as_str() {
        "nostr" => Ok(IdentityType::Nostr),
        "pubky" => Ok(IdentityType::Pubky),
        _ => Err((StatusCode::BAD_REQUEST, format!("Invalid identity type: {}", s))),
    }
}

// ============================================================================
// Handlers
// ============================================================================

/// List all identities
#[utoipa::path(
    get,
    path = "/wallet/identities",
    responses(
        (status = 200, description = "List of identities", body = ListIdentitiesResponse)
    ),
    tag = "Identities"
)]
pub async fn list_identities(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let identities = state.identity_manager.list();
    let response: Vec<IdentityResponse> = identities.iter().map(identity_to_response).collect();
    let total = response.len();

    Json(ListIdentitiesResponse {
        identities: response,
        total,
    })
}

/// Get identity by ID
#[utoipa::path(
    get,
    path = "/wallet/identities/{id}",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    responses(
        (status = 200, description = "Identity details", body = IdentityResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn get_identity(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.identity_manager.get(&id) {
        Some(identity) => Ok(Json(identity_to_response(&identity))),
        None => Err((StatusCode::NOT_FOUND, "Identity not found".to_string())),
    }
}

/// Create new identity
#[utoipa::path(
    post,
    path = "/wallet/identities",
    request_body = CreateIdentityRequest,
    responses(
        (status = 201, description = "Identity created", body = IdentityResponse),
        (status = 400, description = "Invalid request")
    ),
    tag = "Identities"
)]
pub async fn create_identity(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateIdentityRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let identity_type = parse_identity_type(&req.identity_type)?;

    // Validate public key
    if req.public_key.len() != 64 {
        return Err((StatusCode::BAD_REQUEST, "Public key must be 64 hex characters (32 bytes)".to_string()));
    }
    if hex::decode(&req.public_key).is_err() {
        return Err((StatusCode::BAD_REQUEST, "Invalid hex in public key".to_string()));
    }

    // Build metadata
    let metadata = match identity_type {
        IdentityType::Nostr => {
            let mut nostr_meta = NostrMetadata::default();
            // Use default relays if not provided
            nostr_meta.relays = NOSTR_DEFAULT_RELAYS.iter().map(|s| s.to_string()).collect();

            if let Some(CreateIdentityMetadata::Nostr { relays, nip05, name }) = req.metadata {
                if let Some(r) = relays {
                    nostr_meta.relays = r;
                }
                nostr_meta.nip05 = nip05;
                nostr_meta.name = name;
            }
            IdentityMetadata::Nostr(nostr_meta)
        }
        IdentityType::Pubky => {
            let mut pubky_meta = PubkyMetadata::default();
            if let Some(CreateIdentityMetadata::Pubky { homeserver }) = req.metadata {
                pubky_meta.homeserver = homeserver;
            }
            IdentityMetadata::Pubky(pubky_meta)
        }
    };

    let identity = Identity::new(
        identity_type,
        req.label,
        req.public_key,
        req.private_key_encrypted,
        metadata,
    );

    match state.identity_manager.create(identity) {
        Ok(created) => Ok((StatusCode::CREATED, Json(identity_to_response(&created)))),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

/// Update identity
#[utoipa::path(
    put,
    path = "/wallet/identities/{id}",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    request_body = UpdateIdentityRequest,
    responses(
        (status = 200, description = "Identity updated", body = IdentityResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn update_identity(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateIdentityRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get current identity to determine type
    let current = state.identity_manager.get(&id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Identity not found".to_string()))?;

    let new_metadata = req.metadata.map(|m| match current.identity_type {
        IdentityType::Nostr => {
            if let CreateIdentityMetadata::Nostr { relays, nip05, name } = m {
                let mut meta = match current.metadata {
                    IdentityMetadata::Nostr(ref n) => n.clone(),
                    _ => NostrMetadata::default(),
                };
                if let Some(r) = relays { meta.relays = r; }
                if nip05.is_some() { meta.nip05 = nip05; }
                if name.is_some() { meta.name = name; }
                IdentityMetadata::Nostr(meta)
            } else {
                current.metadata.clone()
            }
        }
        IdentityType::Pubky => {
            if let CreateIdentityMetadata::Pubky { homeserver } = m {
                let mut meta = match current.metadata {
                    IdentityMetadata::Pubky(ref p) => p.clone(),
                    _ => PubkyMetadata::default(),
                };
                if homeserver.is_some() { meta.homeserver = homeserver; }
                IdentityMetadata::Pubky(meta)
            } else {
                current.metadata.clone()
            }
        }
    });

    match state.identity_manager.update(&id, req.label, new_metadata) {
        Ok(updated) => Ok(Json(identity_to_response(&updated))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

/// Delete identity
#[utoipa::path(
    delete,
    path = "/wallet/identities/{id}",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    responses(
        (status = 204, description = "Identity deleted"),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn delete_identity(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.identity_manager.delete(&id) {
        Ok(true) => Ok(StatusCode::NO_CONTENT),
        Ok(false) => Err((StatusCode::NOT_FOUND, "Identity not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

/// Set identity as primary
#[utoipa::path(
    post,
    path = "/wallet/identities/{id}/primary",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    responses(
        (status = 200, description = "Identity set as primary", body = IdentityResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn set_identity_primary(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.identity_manager.set_primary(&id) {
        Ok(updated) => Ok(Json(identity_to_response(&updated))),
        Err(e) => Err((StatusCode::NOT_FOUND, e.to_string())),
    }
}

/// Set DNS published status
#[utoipa::path(
    post,
    path = "/wallet/identities/{id}/dns",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    request_body = SetDnsPublishedRequest,
    responses(
        (status = 200, description = "DNS status updated", body = IdentityResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn set_identity_dns(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<SetDnsPublishedRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Get identity to build record name
    let identity = state.identity_manager.get(&id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Identity not found".to_string()))?;

    let dns_prefix = identity.identity_type.dns_prefix();
    let record_name = if let Some(ref subdomain) = req.subdomain {
        format!("{}.user.{}.{}", subdomain, dns_prefix, req.domain)
    } else {
        format!("user.{}.{}", dns_prefix, req.domain)
    };

    let info = DnsPublishInfo {
        domain: req.domain,
        subdomain: req.subdomain,
        published_at: chrono::Utc::now(),
        record_name,
    };

    match state.identity_manager.set_dns_published(&id, Some(info)) {
        Ok(updated) => Ok(Json(identity_to_response(&updated))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

/// Remove DNS published status
#[utoipa::path(
    delete,
    path = "/wallet/identities/{id}/dns",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    responses(
        (status = 200, description = "DNS status removed", body = IdentityResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn remove_identity_dns(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.identity_manager.set_dns_published(&id, None) {
        Ok(updated) => Ok(Json(identity_to_response(&updated))),
        Err(e) => Err((StatusCode::NOT_FOUND, e.to_string())),
    }
}

/// Get identity defaults for wizards
#[utoipa::path(
    get,
    path = "/wallet/identities/defaults",
    responses(
        (status = 200, description = "Identity defaults", body = IdentityDefaultsResponse)
    ),
    tag = "Identities"
)]
pub async fn get_identity_defaults() -> impl IntoResponse {
    let nostr = NostrDefaults {
        relays: NOSTR_DEFAULT_RELAYS.iter().map(|s| s.to_string()).collect(),
    };

    let pubky = PubkyDefaults {
        homeservers: PUBKY_HOMESERVERS.iter().map(|h| HomeserverInfo {
            name: h.name.to_string(),
            url: h.url.to_string(),
            requires_invite: h.requires_invite,
        }).collect(),
    };

    Json(IdentityDefaultsResponse { nostr, pubky })
}

/// Generate new keypair
#[utoipa::path(
    post,
    path = "/wallet/identities/generate",
    request_body = GenerateKeypairRequest,
    responses(
        (status = 200, description = "Keypair generated", body = GenerateKeypairResponse),
        (status = 400, description = "Invalid identity type")
    ),
    tag = "Identities"
)]
pub async fn generate_keypair(
    Json(req): Json<GenerateKeypairRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let identity_type = parse_identity_type(&req.identity_type)?;

    match identity_type {
        IdentityType::Nostr => {
            // Generate secp256k1 keypair
            use rand::rngs::OsRng;
            use bitcoin::secp256k1::Secp256k1;

            let secp = Secp256k1::new();
            let (secret_key, public_key) = secp.generate_keypair(&mut OsRng);

            let private_key_hex = hex::encode(secret_key.secret_bytes());
            let public_key_bytes = public_key.x_only_public_key().0.serialize();
            let public_key_hex = hex::encode(public_key_bytes);
            let formatted = format!("npub1{}", &public_key_hex[..16]);

            Ok(Json(GenerateKeypairResponse {
                public_key: public_key_hex,
                private_key: private_key_hex,
                formatted,
            }))
        }
        IdentityType::Pubky => {
            // Generate Ed25519 keypair
            use ed25519_dalek::SigningKey;
            use rand::rngs::OsRng;

            let signing_key = SigningKey::generate(&mut OsRng);
            let verifying_key = signing_key.verifying_key();

            let private_key_hex = hex::encode(signing_key.to_bytes());
            let public_key_hex = hex::encode(verifying_key.to_bytes());
            let formatted = format!("pk:{}", &public_key_hex[..16]);

            Ok(Json(GenerateKeypairResponse {
                public_key: public_key_hex,
                private_key: private_key_hex,
                formatted,
            }))
        }
    }
}

/// Export private key for backup
/// 
/// Returns the private key in nsec format for Nostr identities.
/// WARNING: This exposes the raw private key - use with caution!
#[utoipa::path(
    get,
    path = "/wallet/identities/{id}/export",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    responses(
        (status = 200, description = "Private key exported", body = ExportKeyResponse),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn export_private_key(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<ExportKeyResponse>, (StatusCode, String)> {
    let identity = state.identity_manager.get(&id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Identity not found".to_string()))?;

    // Get the private key (currently stored as hex)
    let private_key_hex = identity.private_key_encrypted.clone();
    
    // Format as nsec for Nostr (bech32 encoding)
    let formatted_key = if identity.identity_type == crate::identity::IdentityType::Nostr {
        // For now, just return hex - proper nsec encoding would require bech32
        format!("hex:{}", private_key_hex)
    } else {
        format!("hex:{}", private_key_hex)
    };

    Ok(Json(ExportKeyResponse {
        id: identity.id,
        label: identity.label,
        identity_type: identity.identity_type.to_string(),
        public_key: identity.public_key,
        private_key_hex,
        private_key_formatted: formatted_key,
        warning: "DANGER: Never share this private key! Anyone with this key has full control of your identity.".to_string(),
    }))
}

/// Export key response
#[derive(Debug, Serialize, ToSchema)]
pub struct ExportKeyResponse {
    pub id: String,
    pub label: String,
    pub identity_type: String,
    pub public_key: String,
    pub private_key_hex: String,
    pub private_key_formatted: String,
    pub warning: String,
}

/// Sign message with identity (placeholder - needs private key decryption)
#[utoipa::path(
    post,
    path = "/wallet/identities/{id}/sign",
    params(
        ("id" = String, Path, description = "Identity ID")
    ),
    request_body = SignMessageRequest,
    responses(
        (status = 200, description = "Message signed", body = SignMessageResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Identity not found")
    ),
    tag = "Identities"
)]
pub async fn sign_message(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(_req): Json<SignMessageRequest>,
) -> Result<Json<SignMessageResponse>, (StatusCode, String)> {
    let _identity = state.identity_manager.get(&id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Identity not found".to_string()))?;

    // TODO: Decrypt private key and sign message
    // For now, return error
    Err((StatusCode::NOT_IMPLEMENTED, "Signing requires private key decryption (not yet implemented)".to_string()))
}

/// Sync identities from DNS records
/// 
/// This syncs DNS publication status by checking published identity records
/// in the anchor-domains backend for all domains owned by the user.
#[utoipa::path(
    post,
    path = "/wallet/identities/sync-dns",
    responses(
        (status = 200, description = "Sync completed", body = SyncDnsResponse),
        (status = 500, description = "Sync failed")
    ),
    tag = "Identities"
)]
pub async fn sync_identities_from_dns(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let domains_api_url = std::env::var("DOMAINS_API_URL")
        .unwrap_or_else(|_| "http://anchor-app-domains-backend:3401".to_string());
    
    let client = reqwest::Client::new();
    
    // Step 1: Get all domains from anchor-domains
    let domains_response = client
        .get(format!("{}/domains", domains_api_url))
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch domains: {}", e)))?;
    
    if !domains_response.status().is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch domains".to_string()));
    }
    
    let domains: DomainsListResponse = domains_response
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse domains: {}", e)))?;
    
    let mut synced_count = 0;
    let mut checked_domains = 0;
    
    // Step 2: For each domain, check for identity records
    for domain in domains.data {
        checked_domains += 1;
        
        // Get identities published to this domain
        let identities_response = client
            .get(format!("{}/domains/{}/identities", domains_api_url, domain.name))
            .send()
            .await;
        
        if let Ok(response) = identities_response {
            if response.status().is_success() {
                if let Ok(published_identities) = response.json::<DomainIdentitiesResponse>().await {
                    // Step 3: Match with local identities
                    for pub_identity in published_identities.identities {
                        // Find local identity by public key
                        let local_identities = state.identity_manager.list();
                        
                        for local in local_identities {
                            // Check if public keys match
                            let matches = if pub_identity.identity_type == "nostr" {
                                // For Nostr, the public key might be in npub format
                                let pub_key = pub_identity.public_key.trim_start_matches("npub1");
                                local.identity_type == crate::identity::IdentityType::Nostr 
                                    && (local.public_key == pub_identity.public_key || local.formatted_public_key().contains(pub_key))
                            } else {
                                // For Pubky, check pk: format
                                let pub_key = pub_identity.public_key.trim_start_matches("pk:");
                                local.identity_type == crate::identity::IdentityType::Pubky 
                                    && (local.public_key == pub_identity.public_key || local.public_key == pub_key)
                            };
                            
                            if matches {
                                // Check if already synced
                                let already_synced = local.dns_published.as_ref()
                                    .map(|d| d.domain == domain.name)
                                    .unwrap_or(false);
                                
                                if !already_synced {
                                    // Update local identity with DNS info
                                    let dns_prefix = local.identity_type.dns_prefix();
                                    let record_name = if let Some(ref subdomain) = pub_identity.subdomain {
                                        format!("{}.user.{}.{}", subdomain, dns_prefix, domain.name)
                                    } else {
                                        format!("user.{}.{}", dns_prefix, domain.name)
                                    };
                                    
                                    let info = crate::identity::DnsPublishInfo {
                                        domain: domain.name.clone(),
                                        subdomain: pub_identity.subdomain.clone(),
                                        published_at: chrono::Utc::now(),
                                        record_name,
                                    };
                                    
                                    if state.identity_manager.set_dns_published(&local.id, Some(info)).is_ok() {
                                        synced_count += 1;
                                        tracing::info!(
                                            "Synced identity {} with DNS record on {}",
                                            local.label,
                                            domain.name
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(Json(SyncDnsResponse {
        synced_count,
        checked_domains,
    }))
}

/// Response for sync DNS operation
#[derive(Debug, Serialize, ToSchema)]
pub struct SyncDnsResponse {
    pub synced_count: usize,
    pub checked_domains: usize,
}

/// Domain from anchor-domains API
#[derive(Debug, Deserialize)]
struct DomainsListResponse {
    data: Vec<DomainInfo>,
}

#[derive(Debug, Deserialize)]
struct DomainInfo {
    name: String,
}

/// Published identities from anchor-domains API
#[derive(Debug, Deserialize)]
struct DomainIdentitiesResponse {
    identities: Vec<PublishedIdentityInfo>,
}

#[derive(Debug, Deserialize)]
struct PublishedIdentityInfo {
    identity_type: String,
    public_key: String,
    subdomain: Option<String>,
}

/// Verify signature
#[utoipa::path(
    post,
    path = "/wallet/identities/verify",
    request_body = VerifySignatureRequest,
    responses(
        (status = 200, description = "Verification result", body = VerifySignatureResponse),
        (status = 400, description = "Invalid request")
    ),
    tag = "Identities"
)]
pub async fn verify_signature(
    Json(req): Json<VerifySignatureRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Parse inputs
    let message = hex::decode(&req.message)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid hex in message".to_string()))?;
    let signature = hex::decode(&req.signature)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid hex in signature".to_string()))?;
    let public_key = hex::decode(&req.public_key)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid hex in public key".to_string()))?;

    if signature.len() != 64 {
        return Err((StatusCode::BAD_REQUEST, "Signature must be 64 bytes".to_string()));
    }
    if public_key.len() != 32 {
        return Err((StatusCode::BAD_REQUEST, "Public key must be 32 bytes".to_string()));
    }

    // Try Ed25519 first (Pubky)
    let ed25519_valid = {
        use ed25519_dalek::{Signature, VerifyingKey, Verifier};
        let pk_bytes: [u8; 32] = public_key.clone().try_into().unwrap();
        let sig_bytes: [u8; 64] = signature.clone().try_into().unwrap();
        
        if let Ok(verifying_key) = VerifyingKey::from_bytes(&pk_bytes) {
            let sig = Signature::from_bytes(&sig_bytes);
            verifying_key.verify(&message, &sig).is_ok()
        } else {
            false
        }
    };

    // Try secp256k1 Schnorr (Nostr)
    let schnorr_valid = {
        use bitcoin::secp256k1::{Secp256k1, Message, schnorr::Signature, XOnlyPublicKey};
        
        if message.len() == 32 {
            let secp = Secp256k1::verification_only();
            let pk_bytes: [u8; 32] = public_key.clone().try_into().unwrap();
            let sig_bytes: [u8; 64] = signature.clone().try_into().unwrap();
            let msg_bytes: [u8; 32] = message.clone().try_into().unwrap();
            
            let msg = Message::from_digest(msg_bytes);
            if let (Ok(xonly), Ok(sig)) = (
                XOnlyPublicKey::from_slice(&pk_bytes),
                Signature::from_slice(&sig_bytes),
            ) {
                secp.verify_schnorr(&sig, &msg, &xonly).is_ok()
            } else {
                false
            }
        } else {
            false
        }
    };

    Ok(Json(VerifySignatureResponse {
        valid: ed25519_valid || schnorr_valid,
    }))
}

