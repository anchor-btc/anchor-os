//! Background monitoring tasks for generating notifications
//!
//! This module contains background tasks that monitor:
//! - Container status changes (start/stop events)
//! - Wallet transactions (new incoming/outgoing transactions)

use bollard::container::ListContainersOptions;
use bollard::Docker;
use reqwest::Client;
use sqlx::PgPool;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

/// Shared state for monitors
pub struct MonitorState {
    /// Docker client
    pub docker: Docker,
    /// HTTP client for API calls
    pub http_client: Client,
    /// Database pool
    pub db_pool: PgPool,
    /// Bitcoin RPC URL
    pub bitcoin_rpc_url: String,
    /// Bitcoin RPC user
    pub bitcoin_rpc_user: String,
    /// Bitcoin RPC password
    pub bitcoin_rpc_password: String,
}

/// Create a notification in the database
async fn create_notification(
    pool: &PgPool,
    notification_type: &str,
    title: &str,
    message: Option<&str>,
    severity: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity) VALUES ($1, $2, $3, $4)",
    )
    .bind(notification_type)
    .bind(title)
    .bind(message)
    .bind(severity)
    .execute(pool)
    .await?;
    Ok(())
}

/// Check if a notification setting is enabled
async fn is_notification_enabled(pool: &PgPool, setting_key: &str) -> bool {
    // Try to get the notification settings
    let result = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT value FROM system_settings WHERE key = 'notifications'"
    )
    .fetch_optional(pool)
    .await;

    match result {
        Ok(Some(value)) => {
            // Check if enabled and specific alert type
            let enabled = value.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
            if !enabled {
                return false;
            }
            value.get(setting_key).and_then(|v| v.as_bool()).unwrap_or(true)
        }
        _ => true, // Default to enabled if settings not found
    }
}

/// Container status monitor
/// Tracks running containers and creates notifications when they start/stop
pub async fn container_monitor(state: Arc<MonitorState>) {
    info!("Starting container status monitor");
    
    // Track known container states
    let known_states: Arc<RwLock<HashMap<String, String>>> = Arc::new(RwLock::new(HashMap::new()));
    
    // Initial population of container states
    {
        let mut filters = HashMap::new();
        filters.insert("name", vec!["anchor-"]);
        
        let options = Some(ListContainersOptions {
            all: true,
            filters,
            ..Default::default()
        });
        
        if let Ok(containers) = state.docker.list_containers(options).await {
            let mut states = known_states.write().await;
            for container in containers {
                if let (Some(id), Some(container_state)) = (container.id, container.state) {
                    let name = container.names
                        .and_then(|n| n.first().map(|s| s.trim_start_matches('/').to_string()))
                        .unwrap_or_else(|| id.clone());
                    states.insert(name, container_state);
                }
            }
            info!("Container monitor initialized with {} containers", states.len());
        }
    }
    
    let mut check_interval = interval(Duration::from_secs(30));
    
    loop {
        check_interval.tick().await;
        
        // Check if service alerts are enabled
        if !is_notification_enabled(&state.db_pool, "service_alerts").await {
            continue;
        }
        
        let mut filters = HashMap::new();
        filters.insert("name", vec!["anchor-"]);
        
        let options = Some(ListContainersOptions {
            all: true,
            filters,
            ..Default::default()
        });
        
        match state.docker.list_containers(options).await {
            Ok(containers) => {
                let mut current_states: HashMap<String, String> = HashMap::new();
                
                for container in containers {
                    if let (Some(id), Some(container_state)) = (container.id.clone(), container.state.clone()) {
                        let name = container.names
                            .and_then(|n| n.first().map(|s| s.trim_start_matches('/').to_string()))
                            .unwrap_or(id);
                        current_states.insert(name, container_state);
                    }
                }
                
                // Compare with known states
                let known = known_states.read().await;
                
                for (name, new_state) in &current_states {
                    if let Some(old_state) = known.get(name) {
                        if old_state != new_state {
                            // State changed!
                            let (title, severity) = match new_state.as_str() {
                                "running" => (
                                    format!("Service Started: {}", pretty_name(name)),
                                    "success"
                                ),
                                "exited" | "dead" => (
                                    format!("Service Stopped: {}", pretty_name(name)),
                                    "warning"
                                ),
                                "restarting" => (
                                    format!("Service Restarting: {}", pretty_name(name)),
                                    "info"
                                ),
                                _ => continue,
                            };
                            
                            let message = format!(
                                "Container {} changed from {} to {}",
                                name, old_state, new_state
                            );
                            
                            if let Err(e) = create_notification(
                                &state.db_pool,
                                "service",
                                &title,
                                Some(&message),
                                severity,
                            ).await {
                                error!("Failed to create notification: {}", e);
                            } else {
                                info!("Created service notification: {}", title);
                            }
                        }
                    }
                }
                
                // Check for new containers that weren't tracked before
                for (name, new_state) in &current_states {
                    if !known.contains_key(name) && new_state == "running" {
                        let title = format!("New Service Started: {}", pretty_name(name));
                        let _ = create_notification(
                            &state.db_pool,
                            "service",
                            &title,
                            Some(&format!("Container {} is now running", name)),
                            "success",
                        ).await;
                    }
                }
                
                drop(known);
                
                // Update known states
                let mut known = known_states.write().await;
                *known = current_states;
            }
            Err(e) => {
                warn!("Failed to list containers: {}", e);
            }
        }
    }
}

/// Transaction monitor
/// Watches for new wallet transactions and creates notifications
pub async fn transaction_monitor(state: Arc<MonitorState>) {
    info!("Starting transaction monitor");
    
    // Track known transaction IDs
    let known_txids: Arc<RwLock<HashSet<String>>> = Arc::new(RwLock::new(HashSet::new()));
    
    // Initial population of known transactions
    {
        if let Ok(txids) = fetch_transaction_ids(&state).await {
            let mut known = known_txids.write().await;
            for txid in txids {
                known.insert(txid);
            }
            info!("Transaction monitor initialized with {} known transactions", known.len());
        }
    }
    
    let mut check_interval = interval(Duration::from_secs(60));
    
    loop {
        check_interval.tick().await;
        
        // Check if transaction alerts are enabled
        if !is_notification_enabled(&state.db_pool, "transaction_alerts").await {
            continue;
        }
        
        // Check if wallet is available
        match fetch_transactions(&state).await {
            Ok(transactions) => {
                let known = known_txids.read().await;
                
                for tx in &transactions {
                    if !known.contains(&tx.txid) {
                        // Skip transactions with 0 amount (commit transactions, etc.)
                        if tx.amount.abs() < 0.00000001 {
                            continue;
                        }
                        
                        // New transaction!
                        let (title, severity) = if tx.amount > 0.0 {
                            (
                                format!("Incoming Transaction: {:.8} BTC", tx.amount),
                                "success"
                            )
                        } else {
                            (
                                format!("Outgoing Transaction: {:.8} BTC", tx.amount.abs()),
                                "info"
                            )
                        };
                        
                        let message = format!(
                            "Transaction {} with {} confirmations",
                            &tx.txid[..16],
                            tx.confirmations
                        );
                        
                        if let Err(e) = create_notification(
                            &state.db_pool,
                            "transaction",
                            &title,
                            Some(&message),
                            severity,
                        ).await {
                            error!("Failed to create transaction notification: {}", e);
                        } else {
                            info!("Created transaction notification: {}", title);
                        }
                    }
                }
                
                drop(known);
                
                // Update known transactions
                let mut known = known_txids.write().await;
                for tx in transactions {
                    known.insert(tx.txid);
                }
            }
            Err(e) => {
                // Wallet might not be running, just skip
                if !e.contains("connection refused") {
                    warn!("Failed to fetch transactions: {}", e);
                }
            }
        }
    }
}

/// Transaction info from Bitcoin RPC
#[derive(Debug, serde::Deserialize)]
struct TransactionInfo {
    txid: String,
    amount: f64,
    confirmations: i64,
    #[allow(dead_code)]
    category: String,
}

/// Fetch transactions from Bitcoin RPC
async fn fetch_transactions(state: &MonitorState) -> Result<Vec<TransactionInfo>, String> {
    let response = state.http_client
        .post(&state.bitcoin_rpc_url)
        .basic_auth(&state.bitcoin_rpc_user, Some(&state.bitcoin_rpc_password))
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "monitor",
            "method": "listtransactions",
            "params": ["*", 50, 0, true]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let result: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    if let Some(error) = result.get("error").filter(|e| !e.is_null()) {
        return Err(format!("RPC error: {:?}", error));
    }
    
    let transactions: Vec<TransactionInfo> = serde_json::from_value(
        result["result"].clone()
    ).unwrap_or_default();
    
    Ok(transactions)
}

/// Fetch just transaction IDs for initial state
async fn fetch_transaction_ids(state: &MonitorState) -> Result<Vec<String>, String> {
    let txs = fetch_transactions(state).await?;
    Ok(txs.into_iter().map(|t| t.txid).collect())
}

/// Convert container name to pretty display name
fn pretty_name(name: &str) -> String {
    name.trim_start_matches("anchor-")
        .replace('-', " ")
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().chain(chars).collect(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Start all background monitors
pub fn start_monitors(
    docker: Docker,
    http_client: Client,
    db_pool: PgPool,
    bitcoin_rpc_url: String,
    bitcoin_rpc_user: String,
    bitcoin_rpc_password: String,
) {
    let state = Arc::new(MonitorState {
        docker,
        http_client,
        db_pool,
        bitcoin_rpc_url,
        bitcoin_rpc_user,
        bitcoin_rpc_password,
    });
    
    // Spawn container monitor
    let container_state = state.clone();
    tokio::spawn(async move {
        container_monitor(container_state).await;
    });
    
    // Spawn transaction monitor
    let transaction_state = state.clone();
    tokio::spawn(async move {
        transaction_monitor(transaction_state).await;
    });
    
    info!("Background monitors started");
}
