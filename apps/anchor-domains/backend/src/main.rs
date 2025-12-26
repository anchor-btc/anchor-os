//! Anchor Domains Backend
//! Decentralized DNS on Bitcoin using the Anchor Protocol

mod config;
mod db;
mod error;
mod handlers;
mod indexer;
mod models;
mod services;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::db::Database;
use crate::indexer::Indexer;

/// Application state shared across handlers
pub struct AppState {
    pub db: Database,
    pub config: Config,
}

/// OpenAPI documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::health,
        handlers::get_stats,
        handlers::resolve_domain,
        handlers::resolve_by_txid,
        handlers::list_domains,
        handlers::get_domain,
        handlers::get_domain_history,
        handlers::check_availability,
        handlers::get_domains_by_owner,
        handlers::get_my_domains,
        handlers::register_domain,
        handlers::update_domain,
        handlers::get_pending_status,
        handlers::list_pending_transactions,
    ),
    components(schemas(
        models::HealthResponse,
        models::DnsStats,
        models::ResolveResponse,
        models::Domain,
        models::DomainListItem,
        models::DnsRecordResponse,
        models::PaginatedResponse<models::DomainListItem>,
        models::RegisterDomainRequest,
        models::UpdateDomainRequest,
        models::DnsRecordInput,
        models::CreateTxResponse,
        models::PendingTransaction,
        models::PendingStatusResponse,
        models::HistoryEntry,
        models::AvailabilityResponse,
        models::GetDomainsByOwnerRequest,
        models::MyDomainsResponse,
    )),
    tags(
        (name = "System", description = "Health and status endpoints"),
        (name = "Statistics", description = "Protocol statistics"),
        (name = "Resolution", description = "DNS resolution endpoints"),
        (name = "Domains", description = "Domain management endpoints"),
        (name = "Registration", description = "Domain registration endpoints"),
        (name = "Pending", description = "Pending transaction endpoints"),
    ),
    info(
        title = "Anchor Domains API",
        version = "1.0.0",
        description = r#"# Anchor Domains - Decentralized DNS on Bitcoin

Anchor Domains enables decentralized domain name registration and management on Bitcoin using the Anchor Protocol.

## Supported TLDs

| TLD | Description |
|-----|-------------|
| `.btc` | Primary Bitcoin-focused TLD |
| `.sat` | Satoshi-inspired TLD |
| `.anchor` | Anchor Protocol branded TLD |
| `.anc` | Short form of Anchor |
| `.bit` | Classic Bitcoin domain TLD |

## Protocol Overview

Anchor Domains uses **Kind 10** of the Anchor Protocol. Each domain is registered with a Bitcoin transaction that contains the domain data embedded in the transaction.

### Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain (first-come-first-served) |
| UPDATE | `0x02` | Update domain records (must anchor to original registration) |
| TRANSFER | `0x03` | Transfer domain ownership to new address |

### Payload Format

```
[operation: u8][name_len: u8][name: utf8][records...]
```

Each record:
```
[type: u8][ttl: u16][data_len: u8][data: bytes]
```

## DNS Record Types

| Type | ID | Data Format | Example |
|------|----|-------------|---------|
| A | 1 | 4 bytes (IPv4) | `93.184.216.34` |
| AAAA | 2 | 16 bytes (IPv6) | `2001:db8::1` |
| CNAME | 3 | UTF-8 string | `www.example.com` |
| TXT | 4 | UTF-8 string | `v=spf1 include:...` |
| MX | 5 | u16 priority + domain | `mail.example.btc` |
| NS | 6 | UTF-8 string | `ns1.example.btc` |
| SRV | 7 | u16×3 + target | `server.example.btc` |

## Domain Ownership

When a domain is registered, the **first output (vout 0)** of the transaction becomes the ownership UTXO. Only the owner of this UTXO can update or transfer the domain.

### Update Chain
```
Registration TX → Update TX 1 → Update TX 2 → ...
```

Each update must anchor to the previous ownership UTXO.

## Resolution Methods

1. **By Name**: `/resolve/example.btc`
2. **By TXID Prefix**: `/resolve/txid/a1b2c3d4e5f67890` (first 16 hex chars of registration txid)

## Full Documentation

For complete protocol specification, encoding/decoding examples, and SDK usage, see the [Anchor Domains Documentation](http://localhost:3900/kinds/dns.html).
"#
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("anchor_domains_backend=info".parse()?)
                .add_directive("tower_http=debug".parse()?),
        )
        .init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting Anchor Domains Backend on port {}", config.port);

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    info!("Connected to database");

    // Create shared state
    let state = Arc::new(AppState {
        db: db.clone(),
        config: config.clone(),
    });

    // Spawn indexer in background
    let indexer_config = config.clone();
    let indexer_db = db.clone();
    tokio::spawn(async move {
        match Indexer::new(indexer_config, indexer_db).await {
            Ok(indexer) => {
                if let Err(e) = indexer.run().await {
                    tracing::error!("Indexer error: {}", e);
                }
            }
            Err(e) => {
                tracing::error!("Failed to start indexer: {}", e);
            }
        }
    });

    // Build router
    let app = build_router(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Listening on {}", addr);
    info!(
        "Swagger UI available at http://localhost:{}/swagger-ui/",
        config.port
    );

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Build the application router with all routes
fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        // System
        .route("/health", get(handlers::health))
        .route("/stats", get(handlers::get_stats))
        // Resolution
        .route("/resolve/:name", get(handlers::resolve_domain))
        .route("/resolve/txid/:prefix", get(handlers::resolve_by_txid))
        // Domains
        .route("/domains", get(handlers::list_domains))
        .route("/domains/by-owner", post(handlers::get_domains_by_owner))
        .route("/my-domains", get(handlers::get_my_domains))
        .route("/domains/:name", get(handlers::get_domain))
        .route("/domains/:name/history", get(handlers::get_domain_history))
        .route("/available/:name", get(handlers::check_availability))
        // Registration
        .route("/register", post(handlers::register_domain))
        .route("/update/:name", post(handlers::update_domain))
        // Pending transactions
        .route("/pending", get(handlers::list_pending_transactions))
        .route("/pending/:name", get(handlers::get_pending_status))
        // Identity DNS (Selfie Records)
        .route(
            "/domains/:name/identities",
            get(handlers::list_domain_identities),
        )
        .route(
            "/domains/:name/identities",
            post(handlers::publish_domain_identity),
        )
        .route(
            "/domains/:name/identities/:identity_type",
            axum::routing::delete(handlers::remove_domain_identity),
        )
        .route("/identities/resolve", get(handlers::resolve_identity))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // State and middleware
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
}
