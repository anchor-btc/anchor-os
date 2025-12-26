//! Database operations for Anchor Predictions

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

use crate::amm::AmmState;
use crate::models::{outcome_name, resolution_name, Market, MarketStats, Position, Winner};

pub struct Database {
    pub pool: PgPool,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;
        Ok(Self { pool })
    }

    // ==================== Stats ====================

    pub async fn get_stats(&self) -> Result<MarketStats> {
        let row = sqlx::query(
            r#"
            SELECT 
                total_markets, active_markets, resolved_markets,
                total_positions, total_volume_sats, total_payouts_sats,
                largest_market_sats
            FROM market_stats WHERE id = 1
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(MarketStats {
            total_markets: row.get("total_markets"),
            active_markets: row.get("active_markets"),
            resolved_markets: row.get("resolved_markets"),
            total_positions: row.get("total_positions"),
            total_volume_sats: row.get("total_volume_sats"),
            total_payouts_sats: row.get("total_payouts_sats"),
            largest_market_sats: row.get("largest_market_sats"),
        })
    }

    // ==================== Markets ====================

    pub async fn list_markets(&self, status: Option<&str>, limit: i32) -> Result<Vec<Market>> {
        let query = match status {
            Some(s) => sqlx::query(
                r#"
                SELECT id, market_id, question, description, resolution_block,
                       oracle_pubkey, creator_pubkey, status, resolution,
                       yes_pool, no_pool, total_volume_sats, total_yes_sats,
                       total_no_sats, position_count, created_at
                FROM markets
                WHERE status = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(s)
            .bind(limit),
            None => sqlx::query(
                r#"
                SELECT id, market_id, question, description, resolution_block,
                       oracle_pubkey, creator_pubkey, status, resolution,
                       yes_pool, no_pool, total_volume_sats, total_yes_sats,
                       total_no_sats, position_count, created_at
                FROM markets
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit),
        };

        let rows = query.fetch_all(&self.pool).await?;
        let markets = rows.iter().map(|row| self.row_to_market(row)).collect();
        Ok(markets)
    }

    pub async fn get_market(&self, market_id: &str) -> Result<Option<Market>> {
        let market_id_bytes = hex::decode(market_id)?;
        let row = sqlx::query(
            r#"
            SELECT id, market_id, question, description, resolution_block,
                   oracle_pubkey, creator_pubkey, status, resolution,
                   yes_pool, no_pool, total_volume_sats, total_yes_sats,
                   total_no_sats, position_count, created_at
            FROM markets
            WHERE market_id = $1
            "#,
        )
        .bind(&market_id_bytes)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(|r| self.row_to_market(r)))
    }

    pub async fn get_market_by_bytes(&self, market_id: &[u8]) -> Result<Option<Market>> {
        let row = sqlx::query(
            r#"
            SELECT id, market_id, question, description, resolution_block,
                   oracle_pubkey, creator_pubkey, status, resolution,
                   yes_pool, no_pool, total_volume_sats, total_yes_sats,
                   total_no_sats, position_count, created_at
            FROM markets
            WHERE market_id = $1
            "#,
        )
        .bind(market_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.as_ref().map(|r| self.row_to_market(r)))
    }

    pub async fn create_market(&self, market: &Market) -> Result<i32> {
        // Convert hex market_id to bytes
        let market_id_bytes = hex::decode(&market.market_id)?;
        let oracle_bytes = hex::decode(&market.oracle_pubkey).unwrap_or_default();
        let creator_bytes = hex::decode(&market.creator_pubkey).unwrap_or_default();
        
        // Calculate k_constant as string (for NUMERIC)
        let k_constant = format!("{}", market.yes_pool as i128 * market.no_pool as i128);
        
        let row = sqlx::query(
            r#"
            INSERT INTO markets (
                market_id, question, description, resolution_block, 
                oracle_pubkey, creator_pubkey, status, resolution,
                yes_pool, no_pool, k_constant, total_volume_sats, 
                total_yes_sats, total_no_sats, position_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::NUMERIC, $12, $13, $14, $15)
            RETURNING id
            "#,
        )
        .bind(&market_id_bytes)
        .bind(&market.question)
        .bind(&market.description)
        .bind(market.resolution_block)
        .bind(&oracle_bytes)
        .bind(&creator_bytes)
        .bind(&market.status)
        .bind(market.resolution)
        .bind(market.yes_pool)
        .bind(market.no_pool)
        .bind(&k_constant)
        .bind(market.total_volume_sats)
        .bind(market.total_yes_sats)
        .bind(market.total_no_sats)
        .bind(market.position_count)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get("id"))
    }

    fn row_to_market(&self, row: &sqlx::postgres::PgRow) -> Market {
        let market_id: Vec<u8> = row.get("market_id");
        let oracle_pubkey: Vec<u8> = row.get("oracle_pubkey");
        let creator_pubkey: Vec<u8> = row.get("creator_pubkey");
        let resolution: Option<i16> = row.get("resolution");
        let yes_pool: i64 = row.get("yes_pool");
        let no_pool: i64 = row.get("no_pool");
        let (yes_price, no_price) = Market::calculate_prices(yes_pool, no_pool);
        let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");

        Market {
            id: row.get("id"),
            market_id: hex::encode(&market_id),
            question: row.get("question"),
            description: row.get("description"),
            resolution_block: row.get("resolution_block"),
            oracle_pubkey: hex::encode(&oracle_pubkey),
            creator_pubkey: hex::encode(&creator_pubkey),
            status: row.get("status"),
            resolution,
            resolution_name: resolution_name(resolution),
            yes_pool,
            no_pool,
            yes_price,
            no_price,
            total_volume_sats: row.get("total_volume_sats"),
            total_yes_sats: row.get("total_yes_sats"),
            total_no_sats: row.get("total_no_sats"),
            position_count: row.get("position_count"),
            created_at: created_at.to_rfc3339(),
        }
    }

    pub async fn insert_market(
        &self,
        market_id: &[u8],
        question: &str,
        description: Option<&str>,
        resolution_block: i32,
        oracle_pubkey: &[u8],
        creator_pubkey: &[u8],
        created_txid: &[u8],
        block_height: i32,
        initial_liquidity: i64,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO markets (
                market_id, question, description, resolution_block,
                oracle_pubkey, creator_pubkey, created_txid, created_at_block,
                yes_pool, no_pool, k_constant
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9::NUMERIC * $9::NUMERIC)
            ON CONFLICT (market_id) DO NOTHING
            "#,
        )
        .bind(market_id)
        .bind(question)
        .bind(description)
        .bind(resolution_block)
        .bind(oracle_pubkey)
        .bind(creator_pubkey)
        .bind(created_txid)
        .bind(block_height)
        .bind(initial_liquidity)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ==================== Positions ====================

    pub async fn get_market_positions(&self, market_id: &str, limit: i32) -> Result<Vec<Position>> {
        let market_id_bytes = hex::decode(market_id)?;
        let rows = sqlx::query(
            r#"
            SELECT id, market_id, txid, vout, block_height, user_pubkey,
                   outcome, amount_sats, shares, avg_price,
                   is_winner, payout_sats, claimed, created_at
            FROM positions
            WHERE market_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&market_id_bytes)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let positions = rows.iter().map(|row| self.row_to_position(row)).collect();
        Ok(positions)
    }

    pub async fn get_user_positions(&self, user_pubkey: &str, limit: i32) -> Result<Vec<Position>> {
        let user_pubkey_bytes = hex::decode(user_pubkey)?;
        let rows = sqlx::query(
            r#"
            SELECT id, market_id, txid, vout, block_height, user_pubkey,
                   outcome, amount_sats, shares, avg_price,
                   is_winner, payout_sats, claimed, created_at
            FROM positions
            WHERE user_pubkey = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&user_pubkey_bytes)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let positions = rows.iter().map(|row| self.row_to_position(row)).collect();
        Ok(positions)
    }

    pub async fn get_all_positions(&self, limit: i32) -> Result<Vec<Position>> {
        let rows = sqlx::query(
            r#"
            SELECT id, market_id, txid, vout, block_height, user_pubkey,
                   outcome, amount_sats, shares, avg_price,
                   is_winner, payout_sats, claimed, created_at
            FROM positions
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let positions = rows.iter().map(|row| self.row_to_position(row)).collect();
        Ok(positions)
    }

    fn row_to_position(&self, row: &sqlx::postgres::PgRow) -> Position {
        let market_id: Vec<u8> = row.get("market_id");
        let txid: Vec<u8> = row.get("txid");
        let user_pubkey: Vec<u8> = row.get("user_pubkey");
        let outcome: i16 = row.get("outcome");
        let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");

        Position {
            id: row.get("id"),
            market_id: hex::encode(&market_id),
            txid: hex::encode(&txid),
            vout: row.get("vout"),
            block_height: row.get("block_height"),
            user_pubkey: hex::encode(&user_pubkey),
            outcome,
            outcome_name: outcome_name(outcome),
            amount_sats: row.get("amount_sats"),
            shares: row.get("shares"),
            avg_price: row.get("avg_price"),
            is_winner: row.get("is_winner"),
            payout_sats: row.get("payout_sats"),
            claimed: row.get("claimed"),
            created_at: created_at.to_rfc3339(),
        }
    }

    pub async fn get_position_by_id(&self, id: i32) -> Result<Option<Position>> {
        let row = sqlx::query(
            r#"
            SELECT id, market_id, txid, vout, block_height, user_pubkey,
                   outcome, amount_sats, shares, avg_price,
                   is_winner, payout_sats, claimed, created_at
            FROM positions
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_position(&r)))
    }

    pub async fn insert_position(
        &self,
        market_id: &[u8],
        txid: &[u8],
        vout: i32,
        block_height: i32,
        user_pubkey: &[u8],
        outcome: i16,
        amount_sats: i64,
        shares: i64,
        avg_price: f32,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO positions (
                market_id, txid, vout, block_height, user_pubkey,
                outcome, amount_sats, shares, avg_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (txid, vout) DO NOTHING
            "#,
        )
        .bind(market_id)
        .bind(txid)
        .bind(vout)
        .bind(block_height)
        .bind(user_pubkey)
        .bind(outcome)
        .bind(amount_sats)
        .bind(shares)
        .bind(avg_price)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_market_after_bet(
        &self,
        market_id: &[u8],
        new_yes_pool: i64,
        new_no_pool: i64,
        amount_sats: i64,
        outcome: i16,
    ) -> Result<()> {
        let (yes_add, no_add) = if outcome == 1 {
            (amount_sats, 0i64)
        } else {
            (0i64, amount_sats)
        };

        sqlx::query(
            r#"
            UPDATE markets SET
                yes_pool = $1,
                no_pool = $2,
                total_volume_sats = total_volume_sats + $3,
                total_yes_sats = total_yes_sats + $4,
                total_no_sats = total_no_sats + $5,
                position_count = position_count + 1,
                updated_at = NOW()
            WHERE market_id = $6
            "#,
        )
        .bind(new_yes_pool)
        .bind(new_no_pool)
        .bind(amount_sats)
        .bind(yes_add)
        .bind(no_add)
        .bind(market_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ==================== Resolution ====================

    pub async fn resolve_market(
        &self,
        market_id: &[u8],
        resolution: i16,
        resolved_txid: &[u8],
        resolved_at_block: i32,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE markets SET
                resolution = $1,
                resolved_txid = $2,
                resolved_at_block = $3,
                updated_at = NOW()
            WHERE market_id = $4 AND status = 'open'
            "#,
        )
        .bind(resolution)
        .bind(resolved_txid)
        .bind(resolved_at_block)
        .bind(market_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_market_winners(&self, market_id: &str) -> Result<Vec<Winner>> {
        let market_id_bytes = hex::decode(market_id)?;
        let rows = sqlx::query(
            r#"
            SELECT id, user_pubkey, outcome, amount_sats, shares, payout_sats, claimed
            FROM positions
            WHERE market_id = $1 AND is_winner = true
            ORDER BY payout_sats DESC
            "#,
        )
        .bind(&market_id_bytes)
        .fetch_all(&self.pool)
        .await?;

        let winners = rows
            .iter()
            .map(|row| {
                let user_pubkey: Vec<u8> = row.get("user_pubkey");
                let outcome: i16 = row.get("outcome");
                Winner {
                    position_id: row.get("id"),
                    user_pubkey: hex::encode(&user_pubkey),
                    outcome,
                    outcome_name: outcome_name(outcome),
                    amount_sats: row.get("amount_sats"),
                    shares: row.get("shares"),
                    payout_sats: row.get("payout_sats"),
                    claimed: row.get("claimed"),
                }
            })
            .collect();
        Ok(winners)
    }

    pub async fn claim_winnings(&self, position_id: i32, claim_txid: &[u8]) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE positions SET
                claimed = true,
                claim_txid = $1,
                updated_at = NOW()
            WHERE id = $2 AND is_winner = true AND claimed = false
            "#,
        )
        .bind(claim_txid)
        .bind(position_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // ==================== History ====================

    pub async fn get_resolved_markets(&self, limit: i32) -> Result<Vec<Market>> {
        let rows = sqlx::query(
            r#"
            SELECT id, market_id, question, description, resolution_block,
                   oracle_pubkey, creator_pubkey, status, resolution,
                   yes_pool, no_pool, total_volume_sats, total_yes_sats,
                   total_no_sats, position_count, created_at
            FROM markets
            WHERE status = 'resolved'
            ORDER BY updated_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let markets = rows.iter().map(|row| self.row_to_market(row)).collect();
        Ok(markets)
    }

    // ==================== Indexer State ====================

    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row = sqlx::query("SELECT last_block_height FROM indexer_state WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get("last_block_height"))
    }

    pub async fn update_last_block(&self, block_hash: &[u8], height: i32) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE indexer_state SET
                last_block_hash = $1,
                last_block_height = $2,
                updated_at = NOW()
            WHERE id = 1
            "#,
        )
        .bind(block_hash)
        .bind(height)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ==================== AMM Helpers ====================

    pub async fn get_market_amm_state(&self, market_id: &[u8]) -> Result<Option<AmmState>> {
        let row = sqlx::query("SELECT yes_pool, no_pool FROM markets WHERE market_id = $1")
            .bind(market_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| AmmState::from_pools(r.get("yes_pool"), r.get("no_pool"))))
    }
}
