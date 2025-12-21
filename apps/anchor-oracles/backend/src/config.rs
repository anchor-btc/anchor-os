//! Configuration for the Anchor Oracles backend

use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub bitcoin_rpc_url: String,
    pub bitcoin_rpc_user: String,
    pub bitcoin_rpc_password: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3701".to_string())
                .parse()
                .expect("PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://anchor:anchor@localhost:5432/anchor_oracles".to_string()),
            bitcoin_rpc_url: env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:18443".to_string()),
            bitcoin_rpc_user: env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "bitcoin".to_string()),
            bitcoin_rpc_password: env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "bitcoin".to_string()),
        }
    }
}

