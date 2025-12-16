//! Bitcoin node information handlers

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;

use crate::AppState;

/// Blockchain info response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct BlockchainInfo {
    pub chain: String,
    pub blocks: u64,
    pub headers: u64,
    pub bestblockhash: String,
    pub difficulty: f64,
    pub mediantime: u64,
    pub verificationprogress: f64,
    pub pruned: bool,
    pub size_on_disk: u64,
}

/// Mempool info response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MempoolInfo {
    pub loaded: bool,
    pub size: u64,
    pub bytes: u64,
    pub usage: u64,
    pub total_fee: f64,
    pub maxmempool: u64,
    pub mempoolminfee: f64,
    pub minrelaytxfee: f64,
}

/// Network info response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct NetworkInfo {
    pub version: u64,
    pub subversion: String,
    pub protocolversion: u64,
    pub connections: u64,
    pub connections_in: u64,
    pub connections_out: u64,
    pub networkactive: bool,
    pub localaddresses: Vec<LocalAddress>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LocalAddress {
    pub address: String,
    pub port: u16,
    pub score: u64,
}

/// Combined node status
#[derive(Debug, Serialize, ToSchema)]
pub struct NodeStatus {
    pub blockchain: BlockchainInfo,
    pub mempool: MempoolInfo,
    pub network: NetworkInfo,
}

/// Get blockchain info
#[utoipa::path(
    get,
    path = "/bitcoin/info",
    tag = "Bitcoin",
    responses(
        (status = 200, description = "Blockchain information", body = BlockchainInfo),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_blockchain_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}", state.config.bitcoin_rpc_url);

    let response = state
        .http_client
        .post(&url)
        .basic_auth(
            &state.config.bitcoin_rpc_user,
            Some(&state.config.bitcoin_rpc_password),
        )
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "dashboard",
            "method": "getblockchaininfo",
            "params": []
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Bitcoin RPC: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse Bitcoin RPC response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    if let Some(error) = result.get("error").filter(|e| !e.is_null()) {
        error!("Bitcoin RPC error: {:?}", error);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("RPC error: {:?}", error),
        ));
    }

    let info: BlockchainInfo = serde_json::from_value(result["result"].clone()).map_err(|e| {
        error!("Failed to deserialize blockchain info: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(info))
}

/// Get mempool info
#[utoipa::path(
    get,
    path = "/bitcoin/mempool",
    tag = "Bitcoin",
    responses(
        (status = 200, description = "Mempool information", body = MempoolInfo),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_mempool_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}", state.config.bitcoin_rpc_url);

    let response = state
        .http_client
        .post(&url)
        .basic_auth(
            &state.config.bitcoin_rpc_user,
            Some(&state.config.bitcoin_rpc_password),
        )
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "dashboard",
            "method": "getmempoolinfo",
            "params": []
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Bitcoin RPC: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse Bitcoin RPC response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    if let Some(error) = result.get("error").filter(|e| !e.is_null()) {
        error!("Bitcoin RPC error: {:?}", error);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("RPC error: {:?}", error),
        ));
    }

    let info: MempoolInfo = serde_json::from_value(result["result"].clone()).map_err(|e| {
        error!("Failed to deserialize mempool info: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(info))
}

/// Get network info
#[utoipa::path(
    get,
    path = "/bitcoin/network",
    tag = "Bitcoin",
    responses(
        (status = 200, description = "Network information", body = NetworkInfo),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_network_info(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}", state.config.bitcoin_rpc_url);

    let response = state
        .http_client
        .post(&url)
        .basic_auth(
            &state.config.bitcoin_rpc_user,
            Some(&state.config.bitcoin_rpc_password),
        )
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "dashboard",
            "method": "getnetworkinfo",
            "params": []
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Bitcoin RPC: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let result: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse Bitcoin RPC response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    if let Some(error) = result.get("error").filter(|e| !e.is_null()) {
        error!("Bitcoin RPC error: {:?}", error);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("RPC error: {:?}", error),
        ));
    }

    let info: NetworkInfo = serde_json::from_value(result["result"].clone()).map_err(|e| {
        error!("Failed to deserialize network info: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(info))
}

/// Get complete node status
#[utoipa::path(
    get,
    path = "/bitcoin/status",
    tag = "Bitcoin",
    responses(
        (status = 200, description = "Complete node status", body = NodeStatus),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_node_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let url = format!("{}", state.config.bitcoin_rpc_url);

    // Fetch all info in parallel using batch RPC
    let batch_request = vec![
        serde_json::json!({
            "jsonrpc": "1.0",
            "id": "blockchain",
            "method": "getblockchaininfo",
            "params": []
        }),
        serde_json::json!({
            "jsonrpc": "1.0",
            "id": "mempool",
            "method": "getmempoolinfo",
            "params": []
        }),
        serde_json::json!({
            "jsonrpc": "1.0",
            "id": "network",
            "method": "getnetworkinfo",
            "params": []
        }),
    ];

    let response = state
        .http_client
        .post(&url)
        .basic_auth(
            &state.config.bitcoin_rpc_user,
            Some(&state.config.bitcoin_rpc_password),
        )
        .json(&batch_request)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Bitcoin RPC: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let results: Vec<serde_json::Value> = response.json().await.map_err(|e| {
        error!("Failed to parse Bitcoin RPC response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let blockchain: BlockchainInfo =
        serde_json::from_value(results[0]["result"].clone()).map_err(|e| {
            error!("Failed to deserialize blockchain info: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let mempool: MempoolInfo =
        serde_json::from_value(results[1]["result"].clone()).map_err(|e| {
            error!("Failed to deserialize mempool info: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let network: NetworkInfo =
        serde_json::from_value(results[2]["result"].clone()).map_err(|e| {
            error!("Failed to deserialize network info: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    Ok(Json(NodeStatus {
        blockchain,
        mempool,
        network,
    }))
}

