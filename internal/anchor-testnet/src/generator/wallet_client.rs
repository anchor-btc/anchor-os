//! Wallet API client for the message generator

use anyhow::{Context, Result};

use super::types::{BalanceResponse, CreateMessageRequest, CreateMessageResponse, MineResponse};
use crate::config::SharedStats;

/// Wallet API client
pub struct WalletClient {
    client: reqwest::Client,
    wallet_url: String,
    stats: SharedStats,
}

impl WalletClient {
    /// Create a new wallet client
    pub fn new(wallet_url: &str, stats: SharedStats) -> Self {
        Self {
            client: reqwest::Client::new(),
            wallet_url: wallet_url.to_string(),
            stats,
        }
    }

    /// Check if wallet service is healthy
    pub async fn health_check(&self) -> Result<()> {
        let url = format!("{}/health", self.wallet_url);
        self.client
            .get(&url)
            .send()
            .await
            .context("Failed to connect to wallet")?
            .error_for_status()
            .context("Wallet health check failed")?;
        Ok(())
    }

    /// Get wallet balance
    pub async fn get_balance(&self) -> Result<f64> {
        let url = format!("{}/wallet/balance", self.wallet_url);
        let response: BalanceResponse = self
            .client
            .get(&url)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(response.total)
    }

    /// Mine blocks
    pub async fn mine_blocks(&self, count: u32) -> Result<Vec<String>> {
        let url = format!("{}/wallet/mine", self.wallet_url);
        let response: MineResponse = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "count": count }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.increment_blocks(response.blocks.len() as u64);
        }

        Ok(response.blocks)
    }

    /// Send create message request to wallet
    pub async fn send_create_message(
        &self,
        request: &CreateMessageRequest,
    ) -> Result<CreateMessageResponse> {
        let url = format!("{}/wallet/create-message", self.wallet_url);
        let response = self
            .client
            .post(&url)
            .json(request)
            .send()
            .await?
            .error_for_status()
            .context("Failed to create message")?
            .json()
            .await?;
        Ok(response)
    }
}
