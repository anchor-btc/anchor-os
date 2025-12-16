//! Configuration for the PixelMap backend

use std::env;

/// Canvas dimensions (4580 x 4580 = ~21 million pixels)
pub const CANVAS_WIDTH: u32 = 4580;
pub const CANVAS_HEIGHT: u32 = 4580;

/// Maximum pixels per transaction (based on OP_RETURN size limit)
/// 80 bytes - 6 bytes protocol overhead = 74 bytes / 7 bytes per pixel = 10 pixels
pub const MAX_PIXELS_PER_TX: usize = 10;

/// Tile size for rendering (256x256 is standard for map tiles)
pub const TILE_SIZE: u32 = 256;

/// Application configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Database connection URL
    pub database_url: String,
    /// Bitcoin Core RPC URL
    pub bitcoin_rpc_url: String,
    /// Bitcoin Core RPC username
    pub bitcoin_rpc_user: String,
    /// Bitcoin Core RPC password
    pub bitcoin_rpc_password: String,
    /// Wallet API URL for creating transactions
    pub wallet_url: String,
    /// Server host
    pub host: String,
    /// Server port
    pub port: u16,
    /// Indexer poll interval in seconds
    pub poll_interval_secs: u64,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/pixelmap".to_string()),
            bitcoin_rpc_url: env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:18443".to_string()),
            bitcoin_rpc_user: env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "user".to_string()),
            bitcoin_rpc_password: env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "pass".to_string()),
            wallet_url: env::var("WALLET_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3003),
            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5),
        }
    }
}


