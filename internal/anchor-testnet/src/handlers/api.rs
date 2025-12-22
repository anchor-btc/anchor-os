//! HTTP API handlers for the testnet service

use crate::config::{SharedConfig, SharedStats};
use axum::{
    extract::State,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use tracing::info;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub config: SharedConfig,
    pub stats: SharedStats,
}

/// Request body for updating config
#[derive(Debug, Deserialize)]
pub struct UpdateConfigRequest {
    #[serde(default)]
    pub min_interval_secs: Option<u64>,
    #[serde(default)]
    pub max_interval_secs: Option<u64>,
    #[serde(default)]
    pub blocks_per_cycle: Option<u32>,
    #[serde(default)]
    pub enable_text: Option<bool>,
    #[serde(default)]
    pub enable_pixel: Option<bool>,
    #[serde(default)]
    pub enable_image: Option<bool>,
    #[serde(default)]
    pub enable_map: Option<bool>,
    #[serde(default)]
    pub enable_dns: Option<bool>,
    #[serde(default)]
    pub enable_proof: Option<bool>,
    #[serde(default)]
    pub weight_op_return: Option<u8>,
    #[serde(default)]
    pub weight_stamps: Option<u8>,
    #[serde(default)]
    pub weight_inscription: Option<u8>,
    #[serde(default)]
    pub weight_taproot_annex: Option<u8>,
    #[serde(default)]
    pub weight_witness_data: Option<u8>,
}

/// Health check endpoint
pub async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

/// Get current configuration
pub async fn get_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().await;
    Json(config.clone())
}

/// Update configuration
pub async fn update_config_handler(
    State(state): State<AppState>,
    Json(req): Json<UpdateConfigRequest>,
) -> impl IntoResponse {
    let mut config = state.config.write().await;

    // Update only provided fields
    if let Some(v) = req.min_interval_secs {
        config.min_interval_secs = v.max(1);
    }
    if let Some(v) = req.max_interval_secs {
        config.max_interval_secs = v.max(config.min_interval_secs);
    }
    if let Some(v) = req.blocks_per_cycle {
        config.blocks_per_cycle = v.clamp(1, 10);
    }
    if let Some(v) = req.enable_text {
        config.enable_text = v;
    }
    if let Some(v) = req.enable_pixel {
        config.enable_pixel = v;
    }
    if let Some(v) = req.enable_image {
        config.enable_image = v;
    }
    if let Some(v) = req.enable_map {
        config.enable_map = v;
    }
    if let Some(v) = req.enable_dns {
        config.enable_dns = v;
    }
    if let Some(v) = req.enable_proof {
        config.enable_proof = v;
    }
    if let Some(v) = req.weight_op_return {
        config.weight_op_return = v.min(100);
    }
    if let Some(v) = req.weight_stamps {
        config.weight_stamps = v.min(100);
    }
    if let Some(v) = req.weight_inscription {
        config.weight_inscription = v.min(100);
    }
    if let Some(v) = req.weight_taproot_annex {
        config.weight_taproot_annex = v.min(100);
    }
    if let Some(v) = req.weight_witness_data {
        config.weight_witness_data = v.min(100);
    }

    info!("Configuration updated");
    Json(config.clone())
}

/// Get generation statistics
pub async fn get_stats_handler(State(state): State<AppState>) -> impl IntoResponse {
    let stats = state.stats.read().await;
    Json(stats.clone())
}

/// Pause generation
pub async fn pause_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut config = state.config.write().await;
    config.paused = true;
    info!("Generator paused via API");
    Json(serde_json::json!({ "paused": true }))
}

/// Resume generation
pub async fn resume_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut config = state.config.write().await;
    config.paused = false;
    info!("Generator resumed via API");
    Json(serde_json::json!({ "paused": false }))
}

