//! Installation and setup wizard handlers

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Sse},
    Json,
};
use axum::response::sse::{Event, KeepAlive};
use bollard::container::ListContainersOptions;
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tracing::info;
use utoipa::ToSchema;

use crate::AppState;

/// Installation presets
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum InstallationPreset {
    Minimum,
    Default,
    Full,
    Custom,
}

impl std::fmt::Display for InstallationPreset {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InstallationPreset::Minimum => write!(f, "minimum"),
            InstallationPreset::Default => write!(f, "default"),
            InstallationPreset::Full => write!(f, "full"),
            InstallationPreset::Custom => write!(f, "custom"),
        }
    }
}

/// Service installation status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ServiceInstallStatus {
    NotInstalled,
    Installed,
    Installing,
    Failed,
}

/// Service category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ServiceCategory {
    Core,
    Explorer,
    Networking,
    Monitoring,
    App,
    Dashboard,
}

/// Service definition
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ServiceDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: ServiceCategory,
    pub docker_profiles: Vec<String>,
    pub containers: Vec<String>,
    pub install_status: ServiceInstallStatus,
    pub enabled: bool,
    pub required: bool,
    pub incompatible_with: Vec<String>,
    pub depends_on: Vec<String>,
}

/// Installation status response
#[derive(Debug, Serialize, ToSchema)]
pub struct InstallationStatus {
    pub setup_completed: bool,
    pub preset: InstallationPreset,
    pub installed_services: Vec<String>,
    pub active_profiles: Vec<String>,
}

/// Services list response
#[derive(Debug, Serialize, ToSchema)]
pub struct ServicesListResponse {
    pub services: Vec<ServiceDefinition>,
    pub presets: Vec<PresetInfo>,
}

/// Preset info
#[derive(Debug, Serialize, ToSchema)]
pub struct PresetInfo {
    pub id: InstallationPreset,
    pub name: String,
    pub description: String,
    pub services: Vec<String>,
    pub warning: Option<String>,
}

/// Apply preset request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ApplyPresetRequest {
    pub preset: InstallationPreset,
}

/// Custom installation request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CustomInstallRequest {
    pub services: Vec<String>,
}

/// Installation action response
#[derive(Debug, Serialize, ToSchema)]
pub struct InstallationActionResponse {
    pub success: bool,
    pub message: String,
    pub installed_services: Vec<String>,
}

/// Service action request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ServiceActionRequest {
    pub service_id: String,
}

/// Service uninstall request with optional container removal
#[derive(Debug, Deserialize, ToSchema)]
pub struct ServiceUninstallRequest {
    pub service_id: String,
    #[serde(default)]
    pub remove_containers: bool,
}

// Define all available services
fn get_all_services() -> Vec<ServiceDefinition> {
    vec![
        // Core services
        ServiceDefinition {
            id: "core-bitcoin".to_string(),
            name: "Bitcoin Node".to_string(),
            description: "Bitcoin Core full node".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-bitcoin".to_string()],
            containers: vec!["anchor-core-bitcoin".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: true,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        ServiceDefinition {
            id: "core-postgres".to_string(),
            name: "Database".to_string(),
            description: "PostgreSQL database for storing data".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-postgres".to_string()],
            containers: vec!["anchor-core-postgres".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: true,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        ServiceDefinition {
            id: "core-electrs".to_string(),
            name: "Electrs".to_string(),
            description: "Electrum server - lightweight and efficient".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["default".to_string(), "full".to_string(), "core-electrs".to_string()],
            containers: vec!["anchor-core-electrs".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec!["core-fulcrum".to_string()],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "core-fulcrum".to_string(),
            name: "Fulcrum".to_string(),
            description: "High-performance Electrum server".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "core-fulcrum".to_string()],
            containers: vec!["anchor-core-fulcrum".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec!["core-electrs".to_string()],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "core-indexer".to_string(),
            name: "Anchor Indexer".to_string(),
            description: "Indexes ANCHOR messages from the blockchain".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-indexer".to_string()],
            containers: vec!["anchor-core-indexer".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string(), "core-postgres".to_string()],
        },
        ServiceDefinition {
            id: "core-wallet".to_string(),
            name: "Anchor Wallet".to_string(),
            description: "REST API for creating and broadcasting transactions".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-wallet".to_string()],
            containers: vec!["anchor-core-wallet".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "core-testnet".to_string(),
            name: "Anchor Testnet".to_string(),
            description: "Automatically generates test transactions and mines blocks".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-testnet".to_string()],
            containers: vec!["anchor-core-testnet".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-wallet".to_string(), "core-indexer".to_string()],
        },
        ServiceDefinition {
            id: "core-backup".to_string(),
            name: "Backup".to_string(),
            description: "Backup and restore Docker volumes and databases".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "core-backup".to_string()],
            containers: vec!["anchor-core-backup".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string()],
        },
        ServiceDefinition {
            id: "anchor-docs".to_string(),
            name: "Anchor Docs".to_string(),
            description: "Protocol documentation - kinds, SDK, examples, and API reference".to_string(),
            category: ServiceCategory::Core,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "anchor-docs".to_string()],
            containers: vec!["anchor-docs".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        // Explorers
        ServiceDefinition {
            id: "explorer-mempool".to_string(),
            name: "Mempool Space".to_string(),
            description: "Full Bitcoin block explorer powered by mempool.space".to_string(),
            category: ServiceCategory::Explorer,
            docker_profiles: vec!["default".to_string(), "full".to_string(), "explorer-mempool".to_string()],
            containers: vec!["anchor-explorer-mempool-web".to_string(), "anchor-explorer-mempool-api".to_string(), "anchor-explorer-mempool-db".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string(), "core-electrs".to_string()],
        },
        ServiceDefinition {
            id: "explorer-btc-rpc".to_string(),
            name: "BTC RPC Explorer".to_string(),
            description: "Simple and lightweight Bitcoin block explorer".to_string(),
            category: ServiceCategory::Explorer,
            docker_profiles: vec!["minimum".to_string(), "full".to_string(), "explorer-btc-rpc".to_string()],
            containers: vec!["anchor-explorer-btc-rpc".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "explorer-esplora".to_string(),
            name: "Esplora".to_string(),
            description: "Blockstream's full-featured Bitcoin block explorer".to_string(),
            category: ServiceCategory::Explorer,
            docker_profiles: vec!["full".to_string(), "explorer-esplora".to_string()],
            containers: vec!["anchor-explorer-esplora".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "explorer-bitfeed".to_string(),
            name: "Bitfeed".to_string(),
            description: "Real-time Bitcoin transaction visualizer".to_string(),
            category: ServiceCategory::Explorer,
            docker_profiles: vec!["full".to_string(), "explorer-bitfeed".to_string()],
            containers: vec!["anchor-explorer-bitfeed-web".to_string(), "anchor-explorer-bitfeed-api".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        // Networking
        ServiceDefinition {
            id: "networking-tailscale".to_string(),
            name: "Tailscale VPN".to_string(),
            description: "Connect your Anchor stack to your Tailscale network".to_string(),
            category: ServiceCategory::Networking,
            docker_profiles: vec!["full".to_string(), "networking-tailscale".to_string()],
            containers: vec!["anchor-networking-tailscale".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        ServiceDefinition {
            id: "networking-cloudflare".to_string(),
            name: "Cloudflare Tunnel".to_string(),
            description: "Expose Anchor services to the internet via Cloudflare".to_string(),
            category: ServiceCategory::Networking,
            docker_profiles: vec!["full".to_string(), "networking-cloudflare".to_string()],
            containers: vec!["anchor-networking-cloudflare".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        ServiceDefinition {
            id: "networking-tor".to_string(),
            name: "Tor Network".to_string(),
            description: "Privacy network for anonymous Bitcoin connections".to_string(),
            category: ServiceCategory::Networking,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "networking-tor".to_string()],
            containers: vec!["anchor-networking-tor".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        // Monitoring
        ServiceDefinition {
            id: "monitoring-netdata".to_string(),
            name: "Netdata".to_string(),
            description: "Real-time system and container monitoring dashboard".to_string(),
            category: ServiceCategory::Monitoring,
            docker_profiles: vec!["full".to_string(), "monitoring-netdata".to_string()],
            containers: vec!["anchor-monitoring-netdata".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec![],
        },
        // Dashboard (always required)
        ServiceDefinition {
            id: "anchor-dashboard".to_string(),
            name: "Anchor Dashboard".to_string(),
            description: "Main control panel for managing Anchor OS".to_string(),
            category: ServiceCategory::Dashboard,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "anchor-dashboard".to_string()],
            containers: vec!["anchor-dashboard-backend".to_string(), "anchor-dashboard-frontend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: true,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string(), "core-postgres".to_string()],
        },
        // Apps
        ServiceDefinition {
            id: "app-threads".to_string(),
            name: "Anchor Threads".to_string(),
            description: "Social messaging on Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["minimum".to_string(), "default".to_string(), "full".to_string(), "app-threads".to_string()],
            containers: vec!["anchor-app-threads-frontend".to_string(), "anchor-app-threads-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-canvas".to_string(),
            name: "Anchor Canvas".to_string(),
            description: "Collaborative pixel canvas powered by Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-canvas".to_string()],
            containers: vec!["anchor-app-canvas-frontend".to_string(), "anchor-app-canvas-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-bitcoin".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-places".to_string(),
            name: "Anchor Map".to_string(),
            description: "Place permanent markers on a map using Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-places".to_string()],
            containers: vec!["anchor-app-places-frontend".to_string(), "anchor-app-places-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-bitcoin".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-domains".to_string(),
            name: "Anchor Domains".to_string(),
            description: "Decentralized DNS on Bitcoin - .btc, .sat, .anchor, .anc, .bit domains".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-domains".to_string()],
            containers: vec!["anchor-app-domains-frontend".to_string(), "anchor-app-domains-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-bitcoin".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-proof".to_string(),
            name: "Anchor Proofs".to_string(),
            description: "Proof of Existence - timestamp files on Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-proof".to_string()],
            containers: vec!["anchor-app-proof-frontend".to_string(), "anchor-app-proof-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-bitcoin".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-tokens".to_string(),
            name: "Anchor Tokens".to_string(),
            description: "UTXO-based tokens on Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-tokens".to_string()],
            containers: vec!["anchor-app-tokens-frontend".to_string(), "anchor-app-tokens-backend".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-postgres".to_string(), "core-bitcoin".to_string(), "core-wallet".to_string()],
        },
        ServiceDefinition {
            id: "app-oracles".to_string(),
            name: "Anchor Oracles".to_string(),
            description: "Decentralized oracle network for Bitcoin".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-oracles".to_string()],
            containers: vec!["anchor-app-oracles-frontend".to_string(), "anchor-app-oracles-backend".to_string(), "anchor-app-oracles-postgres".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string()],
        },
        ServiceDefinition {
            id: "app-predictions".to_string(),
            name: "Anchor Lottery".to_string(),
            description: "Trustless lottery with DLC-based payouts".to_string(),
            category: ServiceCategory::App,
            docker_profiles: vec!["full".to_string(), "app-predictions".to_string()],
            containers: vec!["anchor-app-predictions-frontend".to_string(), "anchor-app-predictions-backend".to_string(), "anchor-app-predictions-postgres".to_string()],
            install_status: ServiceInstallStatus::NotInstalled,
            enabled: false,
            required: false,
            incompatible_with: vec![],
            depends_on: vec!["core-bitcoin".to_string(), "app-oracles".to_string()],
        },
    ]
}

fn get_preset_services(preset: InstallationPreset) -> Vec<String> {
    match preset {
        InstallationPreset::Minimum => vec![
            "core-bitcoin".to_string(),
            "core-postgres".to_string(),
            "core-fulcrum".to_string(),
            "core-indexer".to_string(),
            "core-wallet".to_string(),
            "core-testnet".to_string(),
            "core-backup".to_string(),
            "networking-tor".to_string(),
            "explorer-btc-rpc".to_string(),
            "app-threads".to_string(),
            "anchor-dashboard".to_string(),
        ],
        InstallationPreset::Default => vec![
            "core-bitcoin".to_string(),
            "core-postgres".to_string(),
            "core-electrs".to_string(),
            "core-indexer".to_string(),
            "core-wallet".to_string(),
            "core-testnet".to_string(),
            "core-backup".to_string(),
            "networking-tor".to_string(),
            "explorer-mempool".to_string(),
            "app-threads".to_string(),
            "anchor-dashboard".to_string(),
        ],
        InstallationPreset::Full => {
            get_all_services()
                .iter()
                .filter(|s| s.id != "core-fulcrum") // Exclude fulcrum in full (electrs is default)
                .map(|s| s.id.clone())
                .collect()
        },
        InstallationPreset::Custom => vec![],
    }
}

fn get_presets_info() -> Vec<PresetInfo> {
    vec![
        PresetInfo {
            id: InstallationPreset::Minimum,
            name: "Minimum".to_string(),
            description: "Essential Anchor services - Bitcoin, Fulcrum, Wallet, Indexer, Testnet, Backup, Tor, BTC Explorer, and Threads".to_string(),
            services: get_preset_services(InstallationPreset::Minimum),
            warning: None,
        },
        PresetInfo {
            id: InstallationPreset::Default,
            name: "Default".to_string(),
            description: "Recommended setup with core services and Mempool explorer".to_string(),
            services: get_preset_services(InstallationPreset::Default),
            warning: None,
        },
        PresetInfo {
            id: InstallationPreset::Full,
            name: "Full".to_string(),
            description: "All services including apps, networking, and monitoring".to_string(),
            services: get_preset_services(InstallationPreset::Full),
            warning: Some("This configuration requires significant resources (RAM, CPU, disk space). Recommended for powerful machines only.".to_string()),
        },
        PresetInfo {
            id: InstallationPreset::Custom,
            name: "Custom".to_string(),
            description: "Choose which services to install manually".to_string(),
            services: vec![],
            warning: None,
        },
    ]
}

/// Get installation status
#[utoipa::path(
    get,
    path = "/installation/status",
    tag = "Installation",
    responses(
        (status = 200, description = "Installation status", body = InstallationStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_installation_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationStatus {
                setup_completed: false,
                preset: InstallationPreset::Default,
                installed_services: vec![],
                active_profiles: vec![],
            }));
        }
    };

    // Get installation config from database
    let row = sqlx::query(
        "SELECT preset, services, setup_completed FROM installation_config LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match row {
        Some(row) => {
            let preset_str: String = row.get("preset");
            let preset = match preset_str.as_str() {
                "minimum" => InstallationPreset::Minimum,
                "full" => InstallationPreset::Full,
                "custom" => InstallationPreset::Custom,
                _ => InstallationPreset::Default,
            };
            let services: serde_json::Value = row.get("services");
            let setup_completed: bool = row.get("setup_completed");

            let installed_services: Vec<String> = services
                .as_object()
                .map(|obj| {
                    obj.iter()
                        .filter(|(_, v)| v.as_bool().unwrap_or(false))
                        .map(|(k, _)| k.clone())
                        .collect()
                })
                .unwrap_or_default();

            Ok(Json(InstallationStatus {
                setup_completed,
                preset,
                installed_services,
                active_profiles: vec![preset.to_string()],
            }))
        }
        None => {
            Ok(Json(InstallationStatus {
                setup_completed: false,
                preset: InstallationPreset::Default,
                installed_services: vec![],
                active_profiles: vec![],
            }))
        }
    }
}

/// Get available services
#[utoipa::path(
    get,
    path = "/installation/services",
    tag = "Installation",
    responses(
        (status = 200, description = "Available services", body = ServicesListResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_services(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut services = get_all_services();

    // Get actual container statuses
    let mut filters = HashMap::new();
    filters.insert("name", vec!["anchor-"]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    if let Ok(containers) = state.docker.list_containers(options).await {
        for service in &mut services {
            let all_running = service.containers.iter().all(|container_name| {
                containers.iter().any(|c| {
                    c.names.as_ref().is_some_and(|names| {
                        names.iter().any(|n| n.trim_start_matches('/') == container_name)
                    }) && c.state.as_deref() == Some("running")
                })
            });

            let any_exists = service.containers.iter().any(|container_name| {
                containers.iter().any(|c| {
                    c.names.as_ref().is_some_and(|names| {
                        names.iter().any(|n| n.trim_start_matches('/') == container_name)
                    })
                })
            });

            if all_running {
                service.install_status = ServiceInstallStatus::Installed;
                service.enabled = true;
            } else if any_exists {
                service.install_status = ServiceInstallStatus::Installed;
                service.enabled = false;
            }
        }
    }

    Ok(Json(ServicesListResponse {
        services,
        presets: get_presets_info(),
    }))
}

/// Apply installation preset
#[utoipa::path(
    post,
    path = "/installation/preset",
    tag = "Installation",
    request_body = ApplyPresetRequest,
    responses(
        (status = 200, description = "Preset applied", body = InstallationActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn apply_preset(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ApplyPresetRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    let services = get_preset_services(req.preset);
    let services_json: HashMap<String, bool> = services.iter().map(|s| (s.clone(), true)).collect();
    let services_value = serde_json::to_value(&services_json).unwrap_or_default();

    // Update or insert installation config
    sqlx::query(
        "INSERT INTO installation_config (id, preset, services, setup_completed, updated_at)
         VALUES (1, $1, $2, FALSE, NOW())
         ON CONFLICT (id) DO UPDATE SET preset = $1, services = $2, updated_at = NOW()"
    )
    .bind(req.preset.to_string())
    .bind(&services_value)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Applied preset: {:?} with services: {:?}", req.preset, services);

    Ok(Json(InstallationActionResponse {
        success: true,
        message: format!("Preset '{}' applied successfully", req.preset),
        installed_services: services,
    }))
}

/// Apply custom installation
#[utoipa::path(
    post,
    path = "/installation/custom",
    tag = "Installation",
    request_body = CustomInstallRequest,
    responses(
        (status = 200, description = "Custom installation saved", body = InstallationActionResponse),
        (status = 400, description = "Invalid service selection"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn apply_custom(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CustomInstallRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    // Validate incompatibilities
    let all_services = get_all_services();
    for service_id in &req.services {
        if let Some(service) = all_services.iter().find(|s| &s.id == service_id) {
            for incompatible in &service.incompatible_with {
                if req.services.contains(incompatible) {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        format!("Service '{}' is incompatible with '{}'", service_id, incompatible),
                    ));
                }
            }
        }
    }

    // Add required services
    let mut final_services = req.services.clone();
    for service in &all_services {
        if service.required && !final_services.contains(&service.id) {
            final_services.push(service.id.clone());
        }
    }

    // Add dependencies
    let mut added_deps = true;
    while added_deps {
        added_deps = false;
        for service in &all_services {
            if final_services.contains(&service.id) {
                for dep in &service.depends_on {
                    if !final_services.contains(dep) {
                        final_services.push(dep.clone());
                        added_deps = true;
                    }
                }
            }
        }
    }

    let services_json: HashMap<String, bool> = final_services.iter().map(|s| (s.clone(), true)).collect();
    let services_value = serde_json::to_value(&services_json).unwrap_or_default();

    sqlx::query(
        "INSERT INTO installation_config (id, preset, services, setup_completed, updated_at)
         VALUES (1, 'custom', $1, FALSE, NOW())
         ON CONFLICT (id) DO UPDATE SET preset = 'custom', services = $1, updated_at = NOW()"
    )
    .bind(&services_value)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Applied custom installation with services: {:?}", final_services);

    Ok(Json(InstallationActionResponse {
        success: true,
        message: "Custom installation saved successfully".to_string(),
        installed_services: final_services,
    }))
}

/// Complete setup
#[utoipa::path(
    post,
    path = "/installation/complete",
    tag = "Installation",
    responses(
        (status = 200, description = "Setup completed", body = InstallationActionResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn complete_setup(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    // Get the selected services from the installation config
    let row = sqlx::query("SELECT preset, services FROM installation_config WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (preset, services_value): (String, serde_json::Value) = match row {
        Some(r) => (r.get("preset"), r.get("services")),
        None => ("default".to_string(), serde_json::json!({})),
    };

    // Determine which profiles to use
    let mut profiles: Vec<String> = vec![];
    
    if preset == "custom" {
        // For custom, use individual service profiles
        if let Some(services_map) = services_value.as_object() {
            for (service_id, enabled) in services_map {
                if enabled.as_bool().unwrap_or(false) {
                    profiles.push(service_id.clone());
                }
            }
        }
    } else {
        // For preset (minimum, default, full), use the preset profile
        profiles.push(preset.clone());
    }

    info!("Preparing installation with profiles: {:?}", profiles);

    // NOTE: We do NOT run docker compose here!
    // The SSE stream at /installation/stream will handle the actual docker compose execution.
    // This endpoint only prepares the configuration.

    // Mark setup as starting (the SSE stream will complete the installation)
    sqlx::query("UPDATE installation_config SET setup_completed = TRUE, updated_at = NOW() WHERE id = 1")
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Setup completed");

    Ok(Json(InstallationActionResponse {
        success: true,
        message: "Setup completed. Containers are being built and started in the background.".to_string(),
        installed_services: profiles,
    }))
}

/// Install a single service
#[utoipa::path(
    post,
    path = "/installation/service/install",
    tag = "Installation",
    request_body = ServiceActionRequest,
    responses(
        (status = 200, description = "Service installed", body = InstallationActionResponse),
        (status = 400, description = "Invalid service or incompatibility"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn install_service(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ServiceActionRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let all_services = get_all_services();
    let service = all_services.iter().find(|s| s.id == req.service_id)
        .ok_or((StatusCode::BAD_REQUEST, format!("Unknown service: {}", req.service_id)))?;

    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    // Get current services
    let row = sqlx::query("SELECT services FROM installation_config WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut services: HashMap<String, bool> = match row {
        Some(row) => {
            let value: serde_json::Value = row.get("services");
            serde_json::from_value(value).unwrap_or_default()
        }
        None => HashMap::new(),
    };

    // Check for incompatibilities
    for incompatible in &service.incompatible_with {
        if services.get(incompatible).copied().unwrap_or(false) {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Cannot install '{}' - incompatible with installed service '{}'", req.service_id, incompatible),
            ));
        }
    }

    // Add service and its dependencies
    services.insert(req.service_id.clone(), true);
    for dep in &service.depends_on {
        services.insert(dep.clone(), true);
    }

    let services_value = serde_json::to_value(&services).unwrap_or_default();

    sqlx::query("UPDATE installation_config SET services = $1, preset = 'custom', updated_at = NOW() WHERE id = 1")
        .bind(&services_value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Installing service: {} - starting containers...", req.service_id);

    // Run docker compose to start the service containers with all required profiles
    let service_id_clone = req.service_id.clone();
    let required_profiles = get_service_profiles(&service_id_clone);
    
    info!("Installing {} with profiles: {:?}", service_id_clone, required_profiles);
    
    tokio::spawn(async move {
        let mut cmd = std::process::Command::new("docker");
        cmd.current_dir("/anchor-project");
        cmd.arg("compose");
        
        // Add all required profiles
        for profile in &required_profiles {
            cmd.arg("--profile");
            cmd.arg(profile);
        }
        
        cmd.args(["up", "-d", "--remove-orphans"]);

        match cmd.output() {
            Ok(output) => {
                if output.status.success() {
                    info!("Successfully started containers for service: {}", service_id_clone);
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    info!("Failed to start containers for {}: {}", service_id_clone, stderr);
                }
            }
            Err(e) => {
                info!("Failed to run docker compose for {}: {}", service_id_clone, e);
            }
        }
    });

    Ok(Json(InstallationActionResponse {
        success: true,
        message: format!("Service '{}' is being installed. Containers starting...", req.service_id),
        installed_services: services.keys().cloned().collect(),
    }))
}

/// Uninstall a single service
#[utoipa::path(
    post,
    path = "/installation/service/uninstall",
    tag = "Installation",
    request_body = ServiceUninstallRequest,
    responses(
        (status = 200, description = "Service uninstalled", body = InstallationActionResponse),
        (status = 400, description = "Cannot uninstall required service"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn uninstall_service(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ServiceUninstallRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let all_services = get_all_services();
    let service = all_services.iter().find(|s| s.id == req.service_id)
        .ok_or((StatusCode::BAD_REQUEST, format!("Unknown service: {}", req.service_id)))?;

    if service.required {
        return Err((StatusCode::BAD_REQUEST, "Cannot uninstall required service".to_string()));
    }

    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    // Get current services
    let row = sqlx::query("SELECT services FROM installation_config WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut services: HashMap<String, bool> = match row {
        Some(row) => {
            let value: serde_json::Value = row.get("services");
            serde_json::from_value(value).unwrap_or_default()
        }
        None => HashMap::new(),
    };

    // Check if other services depend on this one
    for other_service in &all_services {
        if services.get(&other_service.id).copied().unwrap_or(false)
            && other_service.depends_on.contains(&req.service_id)
        {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Cannot uninstall '{}' - service '{}' depends on it", req.service_id, other_service.id),
            ));
        }
    }

    services.remove(&req.service_id);

    let services_value = serde_json::to_value(&services).unwrap_or_default();

    sqlx::query("UPDATE installation_config SET services = $1, preset = 'custom', updated_at = NOW() WHERE id = 1")
        .bind(&services_value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Uninstalled service: {}", req.service_id);

    // Remove containers if requested
    if req.remove_containers {
        info!("Removing containers for service: {}", req.service_id);
        
        let service_id_clone = req.service_id.clone();
        let containers_to_remove = service.containers.clone();
        
        // Remove containers in background
        tokio::spawn(async move {
            for container_name in containers_to_remove {
                info!("Stopping and removing container: {}", container_name);
                let _ = std::process::Command::new("docker")
                    .args(["stop", &container_name])
                    .output();
                let _ = std::process::Command::new("docker")
                    .args(["rm", "-f", &container_name])
                    .output();
            }
            info!("Containers removed for service: {}", service_id_clone);
        });
    }

    Ok(Json(InstallationActionResponse {
        success: true,
        message: if req.remove_containers {
            format!("Service '{}' uninstalled and containers removed", req.service_id)
        } else {
            format!("Service '{}' uninstalled successfully", req.service_id)
        },
        installed_services: services.keys().cloned().collect(),
    }))
}

/// Reset installation to start fresh (keeps backup data)
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ResetInstallationRequest {
    /// Confirmation phrase - must be "RESET" to proceed
    pub confirmation: String,
    /// Whether to also reset auth/password
    #[serde(default = "default_true")]
    pub reset_auth: bool,
    /// Whether to reset service statuses
    #[serde(default = "default_true")]
    pub reset_services: bool,
}

fn default_true() -> bool {
    true
}

#[utoipa::path(
    post,
    path = "/installation/reset",
    tag = "Installation",
    request_body = ResetInstallationRequest,
    responses(
        (status = 200, description = "Installation reset successfully", body = InstallationActionResponse),
        (status = 400, description = "Invalid confirmation"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn reset_installation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ResetInstallationRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Require explicit confirmation
    if req.confirmation != "RESET" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid confirmation. Must send 'RESET' to confirm.".to_string(),
        ));
    }

    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(InstallationActionResponse {
                success: false,
                message: "Database not available".to_string(),
                installed_services: vec![],
            }));
        }
    };

    info!("Starting installation reset...");

    // Essential containers that must stay running for the setup wizard to work
    let essential_containers = [
        "anchor-core-postgres",
        "anchor-core-bitcoin",
        "anchor-dashboard-backend",
        "anchor-dashboard-frontend",
    ];

    // Stop and remove non-essential containers using shell command (more reliable)
    if req.reset_services {
        info!("Stopping and removing non-essential containers via shell...");
        
        // Use shell command to forcefully remove all non-essential containers
        // This is more reliable than using bollard API
        let essential_pattern = essential_containers.join("|");
        let script = format!(
            r#"
            for container in $(docker ps -aq --filter "name=anchor"); do
                name=$(docker inspect --format '{{{{.Name}}}}' $container | sed 's/^\///')
                if ! echo "$name" | grep -qE '{}'; then
                    echo "Removing: $name"
                    docker rm -f $container 2>/dev/null || true
                fi
            done
            "#,
            essential_pattern
        );
        
        let output = std::process::Command::new("sh")
            .arg("-c")
            .arg(&script)
            .output();
        
        match output {
            Ok(out) => {
                if !out.stdout.is_empty() {
                    info!("Container removal output: {}", String::from_utf8_lossy(&out.stdout));
                }
                if !out.stderr.is_empty() {
                    info!("Container removal stderr: {}", String::from_utf8_lossy(&out.stderr));
                }
            }
            Err(e) => {
                info!("Failed to run container removal script: {}", e);
            }
        }
        
        info!("Non-essential containers removed");
    }

    // Reset installation_config to initial state
    sqlx::query(
        r#"
        UPDATE installation_config
        SET preset = 'default',
            services = '{}',
            setup_completed = FALSE,
            updated_at = NOW()
        WHERE id = 1
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    info!("Reset installation_config table");

    // Reset service statuses if requested
    if req.reset_services {
        sqlx::query("DELETE FROM service_status")
            .execute(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        info!("Reset service_status table");
    }

    // Reset auth (password protection) - stored in system_settings with key 'auth'
    if req.reset_auth {
        let _ = sqlx::query(
            r#"UPDATE system_settings
               SET value = '{"enabled": false, "password_hash": null, "inactivity_timeout": 300}'::jsonb
               WHERE key = 'auth'"#
        )
            .execute(pool)
            .await;
        info!("Reset auth settings to default (no password)");
    }
    
    // Reset language to English (default)
    let _ = sqlx::query(
        r#"UPDATE system_settings
           SET value = '{"current": "en"}'::jsonb
           WHERE key = 'language'"#
    )
        .execute(pool)
        .await;
    info!("Reset language to English (default)");

    // Reset user profile (name, avatar)
    let _ = sqlx::query("UPDATE user_profile SET name = 'Bitcoiner', avatar_url = NULL, updated_at = NOW() WHERE id = 1")
        .execute(pool)
        .await;
    info!("Reset user profile");

    // Reset ALL system settings (but NOT backup settings)
    // Note: We don't delete, just reset specific keys to preserve other settings
    info!("System settings reset (auth, language). Backup and electrum settings preserved.");

    Ok(Json(InstallationActionResponse {
        success: true,
        message: "Installation reset successfully. Non-essential containers removed. Backup data preserved.".to_string(),
        installed_services: vec![],
    }))
}

/// Get active Docker profiles from installation config
#[utoipa::path(
    get,
    path = "/installation/profiles",
    tag = "Installation",
    responses(
        (status = 200, description = "Active profiles", body = Vec<String>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_profiles(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => return Ok(Json(vec!["default".to_string()])),
    };

    let row = sqlx::query("SELECT preset, services FROM installation_config WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match row {
        Some(row) => {
            let preset_str: String = row.get("preset");
            let services_value: serde_json::Value = row.get("services");
            
            let mut profiles = vec![preset_str.clone()];
            
            // For custom preset, add individual service profiles
            if preset_str == "custom" {
                if let Some(services) = services_value.as_object() {
                    for (service_id, enabled) in services {
                        if enabled.as_bool().unwrap_or(false) {
                            profiles.push(service_id.clone());
                        }
                    }
                }
            }
            
            Ok(Json(profiles))
        }
        None => Ok(Json(vec!["default".to_string()])),
    }
}

/// Stream installation logs via Server-Sent Events
pub async fn stream_installation(
    State(state): State<Arc<AppState>>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "Database not available".to_string()));
        }
    };

    // Get the selected services from the installation config
    let row = sqlx::query("SELECT preset, services FROM installation_config WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (preset, services_value): (String, serde_json::Value) = match row {
        Some(r) => (r.get("preset"), r.get("services")),
        None => ("default".to_string(), serde_json::json!({})),
    };

    // Determine which profiles to use
    let mut profiles: Vec<String> = vec![];
    
    if preset == "custom" {
        if let Some(services_map) = services_value.as_object() {
            for (service_id, enabled) in services_map {
                if enabled.as_bool().unwrap_or(false) {
                    profiles.push(service_id.clone());
                }
            }
        }
    } else {
        profiles.push(preset.clone());
    }

    info!("Starting SSE stream for installation with profiles: {:?}", profiles);

    // Create the stream
    let stream = async_stream::stream! {
        // Send initial message
        yield Ok(Event::default().data(format!("[INFO] Starting installation with profiles: {:?}", profiles)));

        if profiles.is_empty() {
            yield Ok(Event::default().data("[WARN] No profiles selected, using default"));
            return;
        }

        yield Ok(Event::default().data("[INFO] Removing conflicting containers...")); 

        // Remove ALL non-essential anchor containers (running or stopped)
        // This ensures no naming conflicts during installation
        // Keep: anchor-core-bitcoin, anchor-core-postgres, anchor-dashboard-backend, anchor-dashboard-frontend
        let cleanup_script = r#"
            for name in $(docker ps -a --filter 'name=anchor-' --format '{{.Names}}'); do
                case "$name" in
                    anchor-core-bitcoin|anchor-core-postgres|anchor-dashboard-backend|anchor-dashboard-frontend)
                        echo "Keeping: $name"
                        ;;
                    *)
                        echo "Removing: $name"
                        docker rm -f "$name" 2>/dev/null || true
                        ;;
                esac
            done
        "#;
        
        let cleanup_result = Command::new("sh")
            .arg("-c")
            .arg(cleanup_script)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output()
            .await;
        
        if let Ok(output) = cleanup_result {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if !line.trim().is_empty() {
                    yield Ok(Event::default().data(format!("[CLEANUP] {}", line.trim())));
                }
            }
        }
        
        // First, remove any containers stuck in "Created" state (but not running ones)
        // This prevents conflicts while preserving the running dashboard-backend
        yield Ok(Event::default().data("[INFO] Cleaning up stuck containers..."));
        
        let cleanup_created = Command::new("sh")
            .arg("-c")
            .arg("docker rm -f $(docker ps -aq --filter 'status=created' --filter 'name=anchor-') 2>/dev/null || true")
            .output()
            .await;
        
        if let Ok(output) = cleanup_created {
            let removed = String::from_utf8_lossy(&output.stdout);
            if !removed.trim().is_empty() {
                yield Ok(Event::default().data("[CLEANUP] Removed stuck containers"));
            }
        }
        
        yield Ok(Event::default().data("[INFO] Building and starting containers...")); 

        // Build the docker compose up command
        let mut cmd = Command::new("docker");
        cmd.current_dir("/anchor-project");
        cmd.arg("compose");
        
        for profile in &profiles {
            cmd.arg("--profile");
            cmd.arg(profile);
        }
        
        // Use --no-recreate to avoid recreating the dashboard-backend which is running this code!
        // Also use --remove-orphans to clean up old containers
        cmd.args(["up", "-d", "--no-recreate", "--remove-orphans"]);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        yield Ok(Event::default().data(format!("[CMD] docker compose {} up -d", 
            profiles.iter().map(|p| format!("--profile {}", p)).collect::<Vec<_>>().join(" "))));

        match cmd.spawn() {
            Ok(mut child) => {
                // Stream stderr (docker compose outputs to stderr)
                if let Some(stderr) = child.stderr.take() {
                    let reader = BufReader::new(stderr);
                    let mut lines = reader.lines();
                    
                    while let Ok(Some(line)) = lines.next_line().await {
                        // Clean up ANSI codes for cleaner display
                        let clean_line = strip_ansi_codes(&line);
                        if !clean_line.trim().is_empty() {
                            yield Ok(Event::default().data(format!("[BUILD] {}", clean_line)));
                        }
                    }
                }

                // Also stream stdout
                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    let mut lines = reader.lines();
                    
                    while let Ok(Some(line)) = lines.next_line().await {
                        let clean_line = strip_ansi_codes(&line);
                        if !clean_line.trim().is_empty() {
                            yield Ok(Event::default().data(format!("[OUT] {}", clean_line)));
                        }
                    }
                }

                // Wait for the process to complete
                let exit_status = child.wait().await;
                
                // Give containers a moment to start
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                
                // Check how many containers are actually running (don't rely on exit code)
                yield Ok(Event::default().data("[INFO] Verifying container status..."));
                
                let check_result = Command::new("sh")
                    .arg("-c")
                    .arg("docker ps --filter 'name=anchor-' --format '{{.Names}}' | wc -l")
                    .output()
                    .await;
                
                let running_count: i32 = match check_result {
                    Ok(output) => {
                        String::from_utf8_lossy(&output.stdout)
                            .trim()
                            .parse()
                            .unwrap_or(0)
                    }
                    Err(_) => 0,
                };
                
                // Consider success if we have more than just the 4 essential containers
                // (bitcoin, postgres, backend, frontend)
                if running_count > 4 {
                    yield Ok(Event::default().data(format!("[SUCCESS] Installation completed! {} containers running.", running_count)));
                    yield Ok(Event::default().event("complete").data("success"));
                } else if let Ok(status) = exit_status {
                    if status.success() {
                        yield Ok(Event::default().data("[SUCCESS] Installation completed successfully!"));
                        yield Ok(Event::default().event("complete").data("success"));
                    } else {
                        yield Ok(Event::default().data(format!("[ERROR] Installation may have issues. Only {} containers running.", running_count)));
                        yield Ok(Event::default().event("complete").data("error"));
                    }
                } else {
                    yield Ok(Event::default().data("[ERROR] Failed to wait for docker compose process"));
                    yield Ok(Event::default().event("complete").data("error"));
                }
            }
            Err(e) => {
                yield Ok(Event::default().data(format!("[ERROR] Failed to start docker compose: {}", e)));
                yield Ok(Event::default().event("complete").data("error"));
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

/// Helper function to strip ANSI escape codes
fn strip_ansi_codes(s: &str) -> String {
    let re = regex::Regex::new(r"\x1b\[[0-9;]*m").unwrap_or_else(|_| regex::Regex::new("").unwrap());
    re.replace_all(s, "").to_string()
}

/// Get all required profiles for a service (including dependencies)
fn get_service_profiles(service: &str) -> Vec<String> {
    // Base profiles that are always needed for most services
    let mut all_profiles = vec![
        "core-bitcoin".to_string(),
        "core-postgres".to_string(),
    ];

    // Service-specific dependencies (including ALL required deps)
    let service_deps: Vec<String> = match service {
        // Apps that need wallet
        "app-threads" => vec!["core-wallet".to_string(), "app-threads".to_string()],
        "app-canvas" | "app-places" | "app-domains" | "app-proof" | "app-tokens" => {
            vec!["core-wallet".to_string(), service.to_string()]
        },
        // Oracles has its own postgres
        "app-oracles" => vec!["core-wallet".to_string(), "app-oracles".to_string()],
        // Lottery depends on oracles
        "app-predictions" => vec![
            "core-wallet".to_string(),
            "app-oracles".to_string(),  // Lottery depends on oracles!
            "app-predictions".to_string(),
        ],
        // Core services
        "core-wallet" => vec!["core-wallet".to_string()],
        "core-indexer" => vec!["core-indexer".to_string()],
        "core-testnet" => vec!["core-wallet".to_string(), "core-indexer".to_string(), "core-testnet".to_string()],
        "core-backup" => vec!["core-backup".to_string()],
        "core-fulcrum" => vec!["core-fulcrum".to_string()],
        "core-electrs" => vec!["core-electrs".to_string()],
        // Explorers - mempool needs electrs!
        "explorer-btc-rpc" => vec!["explorer-btc-rpc".to_string()],
        "explorer-mempool" => vec![
            "core-electrs".to_string(),  // Mempool depends on electrs!
            "explorer-mempool".to_string(),
        ],
        "explorer-esplora" => vec!["explorer-esplora".to_string()],
        "explorer-bitfeed" => vec!["explorer-bitfeed".to_string()],
        // Networking
        "networking-tor" => vec!["networking-tor".to_string()],
        "networking-tailscale" => vec!["networking-tailscale".to_string()],
        "networking-cloudflare" => vec!["networking-cloudflare".to_string()],
        // Monitoring
        "monitoring-netdata" => vec!["monitoring-netdata".to_string()],
        // Default: just the service itself
        _ => vec![service.to_string()],
    };

    // Add service deps, removing duplicates
    for dep in service_deps {
        if !all_profiles.contains(&dep) {
            all_profiles.push(dep);
        }
    }

    all_profiles
}
