//! Database operations for Anchor Tokens

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::{FromRow, PgPool, Row};
use tracing::{debug, info};

use crate::models::{
    PaginatedResponse, Token, TokenBalance, TokenHolder, TokenOperationResponse, TokenStats,
    TokenUtxo,
};

/// Database connection pool
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

/// Raw token row from database
#[derive(Debug, FromRow)]
struct TokenRow {
    id: i32,
    ticker: String,
    deploy_txid: Vec<u8>,
    deploy_vout: i32,
    decimals: i16,
    max_supply: String,
    mint_limit: Option<String>,
    minted_supply: String,
    burned_supply: String,
    holder_count: i32,
    tx_count: i32,
    flags: i16,
    block_height: Option<i32>,
    created_at: DateTime<Utc>,
}

impl From<TokenRow> for Token {
    fn from(row: TokenRow) -> Self {
        let minted: i128 = row.minted_supply.parse().unwrap_or(0);
        let burned: i128 = row.burned_supply.parse().unwrap_or(0);
        let circulating = minted - burned;

        Token {
            id: row.id,
            ticker: row.ticker,
            deploy_txid: hex::encode(&row.deploy_txid),
            deploy_vout: row.deploy_vout,
            decimals: row.decimals,
            max_supply: row.max_supply,
            mint_limit: row.mint_limit,
            minted_supply: row.minted_supply,
            burned_supply: row.burned_supply,
            circulating_supply: circulating.to_string(),
            holder_count: row.holder_count,
            tx_count: row.tx_count,
            flags: row.flags,
            is_open_mint: row.flags & 0x01 != 0,
            is_burnable: row.flags & 0x04 != 0,
            block_height: row.block_height,
            created_at: row.created_at,
        }
    }
}

impl Database {
    /// Connect to the database
    pub async fn connect(url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(url)
            .await
            .context("Failed to connect to database")?;

        info!("Connected to database");
        Ok(Self { pool })
    }

    // ========================================================================
    // Indexer State
    // ========================================================================

    /// Get the last indexed block height
    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row = sqlx::query("SELECT last_block_height FROM token_indexer_state WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get("last_block_height"))
    }

    /// Update the last indexed block
    pub async fn update_last_block(&self, block_hash: &[u8], block_height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE token_indexer_state 
             SET last_block_hash = $1, last_block_height = $2, updated_at = NOW() 
             WHERE id = 1",
        )
        .bind(block_hash)
        .bind(block_height)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Handle blockchain reorganization
    pub async fn handle_reorg(&self, reorg_height: i32) -> Result<()> {
        debug!("Handling reorg at height {}", reorg_height);

        // Delete operations at or above reorg height
        sqlx::query("DELETE FROM token_operations WHERE block_height >= $1")
            .bind(reorg_height)
            .execute(&self.pool)
            .await?;

        // Mark spent UTXOs as unspent if spent at or above reorg height
        sqlx::query(
            "UPDATE token_utxos 
             SET spent_txid = NULL, spent_vout = NULL, spent_block_height = NULL, spent_at = NULL 
             WHERE spent_block_height >= $1",
        )
        .bind(reorg_height)
        .execute(&self.pool)
        .await?;

        // Delete UTXOs created at or above reorg height
        sqlx::query("DELETE FROM token_utxos WHERE block_height >= $1")
            .bind(reorg_height)
            .execute(&self.pool)
            .await?;

        // Reset indexer state
        sqlx::query("UPDATE token_indexer_state SET last_block_height = $1 - 1 WHERE id = 1")
            .bind(reorg_height)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // ========================================================================
    // Token Operations
    // ========================================================================

    /// Check if a ticker is available
    pub async fn is_ticker_available(&self, ticker: &str) -> Result<bool> {
        let row = sqlx::query("SELECT is_ticker_available($1) as available")
            .bind(ticker.to_uppercase())
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get("available"))
    }

    /// Register a new token (DEPLOY)
    pub async fn create_token(
        &self,
        ticker: &str,
        deploy_txid: &[u8],
        deploy_vout: i32,
        decimals: i16,
        max_supply: &str,
        mint_limit: Option<&str>,
        flags: i16,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row = sqlx::query(
            "INSERT INTO tokens (ticker, deploy_txid, deploy_vout, decimals, max_supply, mint_limit, flags, block_hash, block_height)
             VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, $7, $8, $9)
             RETURNING id"
        )
        .bind(ticker.to_uppercase())
        .bind(deploy_txid)
        .bind(deploy_vout)
        .bind(decimals)
        .bind(max_supply)
        .bind(mint_limit)
        .bind(flags)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        let token_id: i32 = row.get("id");

        // Record the deploy operation
        self.record_operation(
            token_id,
            1, // DEPLOY
            deploy_txid,
            deploy_vout,
            None,
            None,
            None,
            block_hash,
            block_height,
        )
        .await?;

        Ok(token_id)
    }

    /// Get token by ticker
    pub async fn get_token_by_ticker(&self, ticker: &str) -> Result<Option<Token>> {
        let row = sqlx::query_as::<_, TokenRow>(
            "SELECT id, ticker, deploy_txid, deploy_vout, decimals, max_supply::text, mint_limit::text,
                    minted_supply::text, burned_supply::text, holder_count, tx_count, flags, block_height, created_at
             FROM tokens WHERE UPPER(ticker) = UPPER($1)",
        )
        .bind(ticker)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(Token::from))
    }

    /// Get token by ID
    pub async fn get_token_by_id(&self, token_id: i32) -> Result<Option<Token>> {
        let row = sqlx::query_as::<_, TokenRow>(
            "SELECT id, ticker, deploy_txid, deploy_vout, decimals, max_supply::text, mint_limit::text,
                    minted_supply::text, burned_supply::text, holder_count, tx_count, flags, block_height, created_at
             FROM tokens WHERE id = $1",
        )
        .bind(token_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(Token::from))
    }

    /// List tokens with pagination
    pub async fn list_tokens(
        &self,
        page: i32,
        per_page: i32,
        search: Option<&str>,
    ) -> Result<PaginatedResponse<Token>> {
        let offset = (page - 1) * per_page;

        let (rows, total): (Vec<TokenRow>, i64) = if let Some(search) = search {
            let rows = sqlx::query_as::<_, TokenRow>(
                "SELECT id, ticker, deploy_txid, deploy_vout, decimals, max_supply::text, mint_limit::text,
                        minted_supply::text, burned_supply::text, holder_count, tx_count, flags, block_height, created_at
                 FROM tokens
                 WHERE ticker ILIKE $1
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3",
            )
            .bind(format!("%{}%", search))
            .bind(per_page)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tokens WHERE ticker ILIKE $1")
                .bind(format!("%{}%", search))
                .fetch_one(&self.pool)
                .await?;

            (rows, count.0)
        } else {
            let rows = sqlx::query_as::<_, TokenRow>(
                "SELECT id, ticker, deploy_txid, deploy_vout, decimals, max_supply::text, mint_limit::text,
                        minted_supply::text, burned_supply::text, holder_count, tx_count, flags, block_height, created_at
                 FROM tokens
                 ORDER BY created_at DESC
                 LIMIT $1 OFFSET $2",
            )
            .bind(per_page)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tokens")
                .fetch_one(&self.pool)
                .await?;

            (rows, count.0)
        };

        let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;

        Ok(PaginatedResponse {
            data: rows.into_iter().map(Token::from).collect(),
            total,
            page,
            per_page,
            total_pages,
        })
    }

    /// Update minted supply
    pub async fn update_minted_supply(&self, token_id: i32, amount: &str) -> Result<()> {
        sqlx::query(
            "UPDATE tokens SET minted_supply = minted_supply + $1::numeric, tx_count = tx_count + 1 WHERE id = $2",
        )
        .bind(amount)
        .bind(token_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Update burned supply
    pub async fn update_burned_supply(&self, token_id: i32, amount: &str) -> Result<()> {
        sqlx::query(
            "UPDATE tokens SET burned_supply = burned_supply + $1::numeric, tx_count = tx_count + 1 WHERE id = $2",
        )
        .bind(amount)
        .bind(token_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Increment transaction count
    pub async fn increment_tx_count(&self, token_id: i32) -> Result<()> {
        sqlx::query("UPDATE tokens SET tx_count = tx_count + 1 WHERE id = $1")
            .bind(token_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ========================================================================
    // UTXO Operations
    // ========================================================================

    /// Create a new token UTXO
    pub async fn create_utxo(
        &self,
        token_id: i32,
        txid: &[u8],
        vout: i32,
        amount: &str,
        owner_script: Option<&[u8]>,
        owner_address: Option<&str>,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row = sqlx::query(
            "INSERT INTO token_utxos (token_id, txid, vout, amount, owner_script, owner_address, block_hash, block_height)
             VALUES ($1, $2, $3, $4::numeric, $5, $6, $7, $8)
             ON CONFLICT (txid, vout, token_id) DO UPDATE SET
                amount = EXCLUDED.amount,
                owner_script = EXCLUDED.owner_script,
                owner_address = EXCLUDED.owner_address
             RETURNING id"
        )
        .bind(token_id)
        .bind(txid)
        .bind(vout)
        .bind(amount)
        .bind(owner_script)
        .bind(owner_address)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        // Update balance
        if let Some(addr) = owner_address {
            self.update_address_balance(token_id, addr).await?;
        }

        Ok(row.get("id"))
    }

    /// Spend a token UTXO
    pub async fn spend_utxo(
        &self,
        token_id: i32,
        txid: &[u8],
        vout: i32,
        spent_txid: &[u8],
        spent_vout: i32,
        spent_block_height: Option<i32>,
    ) -> Result<Option<String>> {
        let row = sqlx::query(
            "UPDATE token_utxos 
             SET spent_txid = $1, spent_vout = $2, spent_block_height = $3, spent_at = NOW()
             WHERE token_id = $4 AND txid = $5 AND vout = $6 AND spent_txid IS NULL
             RETURNING owner_address"
        )
        .bind(spent_txid)
        .bind(spent_vout)
        .bind(spent_block_height)
        .bind(token_id)
        .bind(txid)
        .bind(vout)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let owner: Option<String> = row.get("owner_address");
            if let Some(addr) = &owner {
                self.update_address_balance(token_id, addr).await?;
            }
            return Ok(owner);
        }

        Ok(None)
    }

    /// Find UTXO by txid prefix and vout
    pub async fn find_utxo_by_prefix(
        &self,
        token_id: i32,
        txid_prefix: &[u8],
        vout: i32,
    ) -> Result<Option<(Vec<u8>, String)>> {
        let row = sqlx::query(
            "SELECT txid, amount::text FROM token_utxos 
             WHERE token_id = $1 
               AND substring(txid from 1 for 8) = $2 
               AND vout = $3 
               AND spent_txid IS NULL"
        )
        .bind(token_id)
        .bind(txid_prefix)
        .bind(vout)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let txid: Vec<u8> = r.get("txid");
            let amount: String = r.get("amount");
            (txid, amount)
        }))
    }

    /// Get all unspent token UTXOs across all addresses
    pub async fn get_all_unspent_token_utxos(&self) -> Result<Vec<TokenUtxo>> {
        let rows = sqlx::query(
            "SELECT u.id, u.token_id, t.ticker, u.txid, u.vout, u.amount::text as amount, t.decimals,
                    u.owner_address, u.block_height, u.created_at, u.spent_txid IS NOT NULL as is_spent
             FROM token_utxos u
             JOIN tokens t ON t.id = u.token_id
             WHERE u.spent_txid IS NULL
             ORDER BY t.ticker, u.created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| TokenUtxo {
                id: row.get("id"),
                token_id: row.get("token_id"),
                ticker: row.get("ticker"),
                txid: hex::encode(row.get::<Vec<u8>, _>("txid")),
                vout: row.get("vout"),
                amount: row.get("amount"),
                decimals: row.get("decimals"),
                owner_address: row.get("owner_address"),
                block_height: row.get("block_height"),
                created_at: row.get("created_at"),
                is_spent: row.get("is_spent"),
            })
            .collect())
    }

    /// Get unspent UTXOs for an address
    pub async fn get_address_utxos(
        &self,
        address: &str,
        token_id: Option<i32>,
    ) -> Result<Vec<TokenUtxo>> {
        let rows = if let Some(tid) = token_id {
            sqlx::query(
                "SELECT u.id, u.token_id, t.ticker, u.txid, u.vout, u.amount::text as amount, t.decimals,
                        u.owner_address, u.block_height, u.created_at, u.spent_txid IS NOT NULL as is_spent
                 FROM token_utxos u
                 JOIN tokens t ON t.id = u.token_id
                 WHERE u.owner_address = $1 AND u.token_id = $2 AND u.spent_txid IS NULL
                 ORDER BY u.created_at DESC"
            )
            .bind(address)
            .bind(tid)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                "SELECT u.id, u.token_id, t.ticker, u.txid, u.vout, u.amount::text as amount, t.decimals,
                        u.owner_address, u.block_height, u.created_at, u.spent_txid IS NOT NULL as is_spent
                 FROM token_utxos u
                 JOIN tokens t ON t.id = u.token_id
                 WHERE u.owner_address = $1 AND u.spent_txid IS NULL
                 ORDER BY t.ticker, u.created_at DESC"
            )
            .bind(address)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows
            .into_iter()
            .map(|row| TokenUtxo {
                id: row.get("id"),
                token_id: row.get("token_id"),
                ticker: row.get("ticker"),
                txid: hex::encode(row.get::<Vec<u8>, _>("txid")),
                vout: row.get("vout"),
                amount: row.get("amount"),
                decimals: row.get("decimals"),
                owner_address: row.get("owner_address"),
                block_height: row.get("block_height"),
                created_at: row.get("created_at"),
                is_spent: row.get("is_spent"),
            })
            .collect())
    }

    // ========================================================================
    // Balance Operations
    // ========================================================================

    /// Update balance for an address (recalculates from UTXOs)
    pub async fn update_address_balance(&self, token_id: i32, address: &str) -> Result<()> {
        sqlx::query("SELECT update_address_balance($1, $2)")
            .bind(token_id)
            .bind(address)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Update holder count for a token
    pub async fn update_holder_count(&self, token_id: i32) -> Result<()> {
        sqlx::query("SELECT update_holder_count($1)")
            .bind(token_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Get balances for an address
    pub async fn get_address_balances(&self, address: &str) -> Result<Vec<TokenBalance>> {
        let rows = sqlx::query(
            "SELECT b.token_id, t.ticker, t.decimals, b.balance::text as balance, b.utxo_count
             FROM token_balances b
             JOIN tokens t ON t.id = b.token_id
             WHERE b.address = $1 AND b.balance > 0
             ORDER BY t.ticker"
        )
        .bind(address)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| TokenBalance {
                token_id: row.get("token_id"),
                ticker: row.get("ticker"),
                decimals: row.get("decimals"),
                balance: row.get("balance"),
                utxo_count: row.get("utxo_count"),
            })
            .collect())
    }

    /// Get token holders
    pub async fn get_token_holders(
        &self,
        token_id: i32,
        page: i32,
        per_page: i32,
    ) -> Result<PaginatedResponse<TokenHolder>> {
        let offset = (page - 1) * per_page;

        let rows = sqlx::query(
            "SELECT address, balance::text as balance, utxo_count, percentage::float8 as percentage 
             FROM get_token_holders($1, $2, $3)"
        )
        .bind(token_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM token_balances WHERE token_id = $1 AND balance > 0"
        )
        .bind(token_id)
        .fetch_one(&self.pool)
        .await?;

        let total_pages = ((total.0 as f64) / (per_page as f64)).ceil() as i32;

        Ok(PaginatedResponse {
            data: rows
                .into_iter()
                .map(|row| TokenHolder {
                    address: row.get("address"),
                    balance: row.get("balance"),
                    percentage: row.get::<f64, _>("percentage"),
                    utxo_count: row.get("utxo_count"),
                })
                .collect(),
            total: total.0,
            page,
            per_page,
            total_pages,
        })
    }

    // ========================================================================
    // Operation History
    // ========================================================================

    /// Record a token operation
    pub async fn record_operation(
        &self,
        token_id: i32,
        operation: i16,
        txid: &[u8],
        vout: i32,
        amount: Option<&str>,
        from_address: Option<&str>,
        to_address: Option<&str>,
        block_hash: Option<&[u8]>,
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row = sqlx::query(
            "INSERT INTO token_operations (token_id, operation, txid, vout, amount, from_address, to_address, block_hash, block_height)
             VALUES ($1, $2, $3, $4, $5::numeric, $6, $7, $8, $9)
             RETURNING id"
        )
        .bind(token_id)
        .bind(operation)
        .bind(txid)
        .bind(vout)
        .bind(amount)
        .bind(from_address)
        .bind(to_address)
        .bind(block_hash)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get("id"))
    }

    /// Get token operation history
    pub async fn get_token_history(
        &self,
        token_id: i32,
        page: i32,
        per_page: i32,
    ) -> Result<PaginatedResponse<TokenOperationResponse>> {
        let offset = (page - 1) * per_page;

        let rows = sqlx::query(
            "SELECT o.id, o.token_id, t.ticker, o.operation, o.txid, o.vout, o.amount::text as amount,
                    o.from_address, o.to_address, o.block_height, o.created_at
             FROM token_operations o
             JOIN tokens t ON t.id = o.token_id
             WHERE o.token_id = $1
             ORDER BY o.created_at DESC
             LIMIT $2 OFFSET $3"
        )
        .bind(token_id)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM token_operations WHERE token_id = $1"
        )
        .bind(token_id)
        .fetch_one(&self.pool)
        .await?;

        let op_names = ["", "DEPLOY", "MINT", "TRANSFER", "BURN", "SPLIT"];
        let total_pages = ((total.0 as f64) / (per_page as f64)).ceil() as i32;

        Ok(PaginatedResponse {
            data: rows
                .into_iter()
                .map(|row| {
                    let op: i16 = row.get("operation");
                    TokenOperationResponse {
                        id: row.get("id"),
                        token_id: row.get("token_id"),
                        ticker: row.get("ticker"),
                        operation: op_names.get(op as usize).unwrap_or(&"UNKNOWN").to_string(),
                        txid: hex::encode(row.get::<Vec<u8>, _>("txid")),
                        vout: row.get("vout"),
                        amount: row.get("amount"),
                        from_address: row.get("from_address"),
                        to_address: row.get("to_address"),
                        block_height: row.get("block_height"),
                        created_at: row.get("created_at"),
                    }
                })
                .collect(),
            total: total.0,
            page,
            per_page,
            total_pages,
        })
    }

    // ========================================================================
    // Statistics
    // ========================================================================

    /// Get protocol statistics
    pub async fn get_stats(&self) -> Result<TokenStats> {
        let row = sqlx::query(
            "SELECT total_tokens, total_holders, total_operations, last_block_height 
             FROM token_stats"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(TokenStats {
            total_tokens: row.get("total_tokens"),
            total_holders: row.get("total_holders"),
            total_operations: row.get("total_operations"),
            last_block_height: row.get("last_block_height"),
        })
    }

    /// Check if a transaction exists
    pub async fn tx_exists(&self, txid: &[u8], vout: i32) -> Result<bool> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM token_operations WHERE txid = $1 AND vout = $2"
        )
        .bind(txid)
        .bind(vout)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0 > 0)
    }
}
