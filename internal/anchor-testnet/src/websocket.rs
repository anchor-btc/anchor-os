//! WebSocket server for real-time logs and stats streaming

use axum::{
    extract::State,
    response::IntoResponse,
};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

use crate::config::{GeneratorStats, SharedStats};

/// Maximum number of logs to keep in the ring buffer
pub const MAX_LOG_BUFFER_SIZE: usize = 1000;

/// Log level for filtering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
        }
    }
}

/// A log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: u64,
    pub timestamp: i64,
    pub level: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carrier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub txid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cycle: Option<u64>,
}

impl LogEntry {
    pub fn new(level: LogLevel, message: impl Into<String>) -> Self {
        Self {
            id: 0,
            timestamp: chrono::Utc::now().timestamp(),
            level: level.as_str().to_string(),
            message: message.into(),
            message_type: None,
            carrier: None,
            txid: None,
            cycle: None,
        }
    }

    pub fn with_message_type(mut self, msg_type: &str) -> Self {
        self.message_type = Some(msg_type.to_string());
        self
    }

    pub fn with_carrier(mut self, carrier: &str) -> Self {
        self.carrier = Some(carrier.to_string());
        self
    }

    pub fn with_txid(mut self, txid: &str) -> Self {
        self.txid = Some(txid.to_string());
        self
    }

    pub fn with_cycle(mut self, cycle: u64) -> Self {
        self.cycle = Some(cycle);
        self
    }
}

/// Ring buffer for logs
pub struct LogRingBuffer {
    buffer: VecDeque<LogEntry>,
    next_id: u64,
    max_size: usize,
}

impl LogRingBuffer {
    pub fn new(max_size: usize) -> Self {
        Self {
            buffer: VecDeque::with_capacity(max_size),
            next_id: 1,
            max_size,
        }
    }

    /// Add a new log entry
    pub fn push(&mut self, mut entry: LogEntry) -> LogEntry {
        entry.id = self.next_id;
        self.next_id += 1;

        if self.buffer.len() >= self.max_size {
            self.buffer.pop_front();
        }
        
        let entry_clone = entry.clone();
        self.buffer.push_back(entry);
        entry_clone
    }

    /// Get all logs
    #[allow(dead_code)]
    pub fn all(&self) -> Vec<LogEntry> {
        self.buffer.iter().cloned().collect()
    }

    /// Get logs since a specific ID
    #[allow(dead_code)]
    pub fn since(&self, id: u64) -> Vec<LogEntry> {
        self.buffer
            .iter()
            .filter(|e| e.id > id)
            .cloned()
            .collect()
    }

    /// Get the last N logs
    #[allow(dead_code)]
    pub fn last_n(&self, n: usize) -> Vec<LogEntry> {
        let skip = self.buffer.len().saturating_sub(n);
        self.buffer.iter().skip(skip).cloned().collect()
    }

    /// Filter logs by level
    #[allow(dead_code)]
    pub fn filter_by_level(&self, level: &str) -> Vec<LogEntry> {
        self.buffer
            .iter()
            .filter(|e| e.level == level)
            .cloned()
            .collect()
    }

    /// Search logs by message content
    #[allow(dead_code)]
    pub fn search(&self, query: &str) -> Vec<LogEntry> {
        let query_lower = query.to_lowercase();
        self.buffer
            .iter()
            .filter(|e| e.message.to_lowercase().contains(&query_lower))
            .cloned()
            .collect()
    }

    /// Get current buffer size
    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    /// Check if buffer is empty
    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    /// Clear all logs
    #[allow(dead_code)]
    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

/// Shared log buffer
pub type SharedLogBuffer = Arc<RwLock<LogRingBuffer>>;

/// Create a new shared log buffer
pub fn create_log_buffer() -> SharedLogBuffer {
    Arc::new(RwLock::new(LogRingBuffer::new(MAX_LOG_BUFFER_SIZE)))
}

/// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsMessage {
    /// New log entry
    Log(LogEntry),
    /// Stats update
    Stats(GeneratorStats),
    /// Multiple log entries (for initial sync)
    LogBatch(Vec<LogEntry>),
    /// Ping/pong for connection health
    Ping,
    Pong,
    /// Subscribe to specific events
    Subscribe { logs: bool, stats: bool },
    /// Error message
    Error { message: String },
}

/// Broadcast channel for WebSocket messages
pub type WsBroadcast = broadcast::Sender<WsMessage>;

/// Create a new WebSocket broadcast channel
pub fn create_ws_broadcast() -> WsBroadcast {
    let (tx, _) = broadcast::channel(1000);
    tx
}

/// WebSocket state for handlers
#[derive(Clone)]
pub struct WsState {
    pub log_buffer: SharedLogBuffer,
    pub stats: SharedStats,
    pub broadcast: WsBroadcast,
}

/// WebSocket upgrade handler
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle a WebSocket connection
async fn handle_socket(socket: WebSocket, state: WsState) {
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast
    let mut broadcast_rx = state.broadcast.subscribe();

    // Send initial log batch
    let initial_logs = {
        let buffer = state.log_buffer.read().await;
        buffer.last_n(100)
    };

    let init_msg = WsMessage::LogBatch(initial_logs);
    if let Ok(json) = serde_json::to_string(&init_msg) {
        let _ = sender.send(Message::Text(json)).await;
    }

    // Send current stats
    let current_stats = state.stats.read().await.clone();
    let stats_msg = WsMessage::Stats(current_stats);
    if let Ok(json) = serde_json::to_string(&stats_msg) {
        let _ = sender.send(Message::Text(json)).await;
    }

    // Handle incoming messages and broadcast
    loop {
        tokio::select! {
            // Broadcast messages to this client
            Ok(msg) = broadcast_rx.recv() => {
                if let Ok(json) = serde_json::to_string(&msg) {
                    if sender.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
            }
            // Handle incoming messages from client
            Some(result) = receiver.next() => {
                match result {
                    Ok(Message::Text(text)) => {
                        if let Ok(msg) = serde_json::from_str::<WsMessage>(&text) {
                            match msg {
                                WsMessage::Ping => {
                                    let pong = serde_json::to_string(&WsMessage::Pong).unwrap();
                                    let _ = sender.send(Message::Text(pong)).await;
                                }
                                _ => {}
                            }
                        }
                    }
                    Ok(Message::Close(_)) | Err(_) => break,
                    _ => {}
                }
            }
            else => break,
        }
    }
}

/// Helper to broadcast a log entry
pub async fn broadcast_log(broadcast: &WsBroadcast, log_buffer: &SharedLogBuffer, entry: LogEntry) {
    // Add to buffer
    let entry = {
        let mut buffer = log_buffer.write().await;
        buffer.push(entry)
    };

    // Broadcast to all connected clients
    let _ = broadcast.send(WsMessage::Log(entry));
}

/// Helper to broadcast stats update
pub async fn broadcast_stats(broadcast: &WsBroadcast, stats: &GeneratorStats) {
    let _ = broadcast.send(WsMessage::Stats(stats.clone()));
}

