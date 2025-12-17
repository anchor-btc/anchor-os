//! Database operations for Anchor Lottery

use anyhow::Result;
use sqlx::postgres::PgPool;

use crate::models::{
    DlcContract, Lottery, LotteryStats, PrizeTier, Ticket, Winner,
    lottery_type_name, token_type_name,
};

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn connect(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    // Lottery operations

    pub async fn get_lotteries(&self, status: Option<&str>, limit: i64) -> Result<Vec<Lottery>> {
        let rows = if let Some(s) = status {
            sqlx::query_as::<_, (
                i32, Vec<u8>, i32, i32, i32, i32, i64, i32, Vec<u8>, Vec<u8>,
                String, i64, i32, Option<Vec<u8>>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, lottery_id, lottery_type, number_count, number_max, draw_block,
                       ticket_price_sats, token_type, oracle_pubkey, creator_pubkey,
                       status, total_pool_sats, ticket_count, winning_numbers, created_at
                FROM lotteries
                WHERE status = $1
                ORDER BY draw_block ASC
                LIMIT $2
                "#,
            )
            .bind(s)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, (
                i32, Vec<u8>, i32, i32, i32, i32, i64, i32, Vec<u8>, Vec<u8>,
                String, i64, i32, Option<Vec<u8>>, chrono::DateTime<chrono::Utc>,
            )>(
                r#"
                SELECT id, lottery_id, lottery_type, number_count, number_max, draw_block,
                       ticket_price_sats, token_type, oracle_pubkey, creator_pubkey,
                       status, total_pool_sats, ticket_count, winning_numbers, created_at
                FROM lotteries
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows.into_iter().map(|r| Lottery {
            id: r.0,
            lottery_id: hex::encode(&r.1),
            lottery_type: r.2,
            lottery_type_name: lottery_type_name(r.2),
            number_count: r.3,
            number_max: r.4,
            draw_block: r.5,
            ticket_price_sats: r.6,
            token_type: r.7,
            token_type_name: token_type_name(r.7),
            oracle_pubkey: hex::encode(&r.8),
            creator_pubkey: hex::encode(&r.9),
            status: r.10,
            total_pool_sats: r.11,
            ticket_count: r.12,
            winning_numbers: r.13,
            created_at: r.14.to_rfc3339(),
        }).collect())
    }

    pub async fn get_lottery_by_id(&self, lottery_id: &[u8]) -> Result<Option<Lottery>> {
        let row = sqlx::query_as::<_, (
            i32, Vec<u8>, i32, i32, i32, i32, i64, i32, Vec<u8>, Vec<u8>,
            String, i64, i32, Option<Vec<u8>>, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, lottery_id, lottery_type, number_count, number_max, draw_block,
                   ticket_price_sats, token_type, oracle_pubkey, creator_pubkey,
                   status, total_pool_sats, ticket_count, winning_numbers, created_at
            FROM lotteries
            WHERE lottery_id = $1
            "#,
        )
        .bind(lottery_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Lottery {
            id: r.0,
            lottery_id: hex::encode(&r.1),
            lottery_type: r.2,
            lottery_type_name: lottery_type_name(r.2),
            number_count: r.3,
            number_max: r.4,
            draw_block: r.5,
            ticket_price_sats: r.6,
            token_type: r.7,
            token_type_name: token_type_name(r.7),
            oracle_pubkey: hex::encode(&r.8),
            creator_pubkey: hex::encode(&r.9),
            status: r.10,
            total_pool_sats: r.11,
            ticket_count: r.12,
            winning_numbers: r.13,
            created_at: r.14.to_rfc3339(),
        }))
    }

    pub async fn insert_lottery(
        &self,
        lottery_id: &[u8],
        lottery_type: i32,
        number_count: i32,
        number_max: i32,
        draw_block: i32,
        ticket_price_sats: i64,
        token_type: i32,
        oracle_pubkey: &[u8],
        creator_pubkey: &[u8],
        txid: &[u8],
        block_height: Option<i32>,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO lotteries (lottery_id, lottery_type, number_count, number_max,
                                   draw_block, ticket_price_sats, token_type, oracle_pubkey,
                                   creator_pubkey, created_txid, created_at_block)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (lottery_id) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(lottery_id)
        .bind(lottery_type)
        .bind(number_count)
        .bind(number_max)
        .bind(draw_block)
        .bind(ticket_price_sats)
        .bind(token_type)
        .bind(oracle_pubkey)
        .bind(creator_pubkey)
        .bind(txid)
        .bind(block_height)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    // Ticket operations

    pub async fn get_tickets_by_lottery(&self, lottery_id: &[u8], limit: i64) -> Result<Vec<Ticket>> {
        let rows = sqlx::query_as::<_, (
            i32, Vec<u8>, Vec<u8>, i32, Option<i32>, Vec<u8>, Vec<u8>, i64,
            i32, bool, i32, i64, bool, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, lottery_id, txid, vout, block_height, buyer_pubkey, numbers,
                   amount_sats, matching_numbers, is_winner, prize_tier, prize_sats,
                   claimed, created_at
            FROM tickets
            WHERE lottery_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(lottery_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Ticket {
            id: r.0,
            lottery_id: hex::encode(&r.1),
            txid: hex::encode(&r.2),
            vout: r.3,
            block_height: r.4,
            buyer_pubkey: hex::encode(&r.5),
            numbers: r.6,
            amount_sats: r.7,
            matching_numbers: r.8,
            is_winner: r.9,
            prize_tier: r.10,
            prize_sats: r.11,
            claimed: r.12,
            created_at: r.13.to_rfc3339(),
        }).collect())
    }

    pub async fn get_tickets_by_buyer(&self, buyer_pubkey: &[u8], limit: i64) -> Result<Vec<Ticket>> {
        let rows = sqlx::query_as::<_, (
            i32, Vec<u8>, Vec<u8>, i32, Option<i32>, Vec<u8>, Vec<u8>, i64,
            i32, bool, i32, i64, bool, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, lottery_id, txid, vout, block_height, buyer_pubkey, numbers,
                   amount_sats, matching_numbers, is_winner, prize_tier, prize_sats,
                   claimed, created_at
            FROM tickets
            WHERE buyer_pubkey = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(buyer_pubkey)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Ticket {
            id: r.0,
            lottery_id: hex::encode(&r.1),
            txid: hex::encode(&r.2),
            vout: r.3,
            block_height: r.4,
            buyer_pubkey: hex::encode(&r.5),
            numbers: r.6,
            amount_sats: r.7,
            matching_numbers: r.8,
            is_winner: r.9,
            prize_tier: r.10,
            prize_sats: r.11,
            claimed: r.12,
            created_at: r.13.to_rfc3339(),
        }).collect())
    }

    pub async fn insert_ticket(
        &self,
        lottery_id: &[u8],
        txid: &[u8],
        vout: i32,
        block_height: Option<i32>,
        buyer_pubkey: &[u8],
        numbers: &[u8],
        amount_sats: i64,
    ) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO tickets (lottery_id, txid, vout, block_height, buyer_pubkey, numbers, amount_sats)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (txid, vout) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(lottery_id)
        .bind(txid)
        .bind(vout)
        .bind(block_height)
        .bind(buyer_pubkey)
        .bind(numbers)
        .bind(amount_sats)
        .fetch_one(&self.pool)
        .await?;

        // Update lottery pool
        sqlx::query(
            "UPDATE lotteries SET total_pool_sats = total_pool_sats + $1, ticket_count = ticket_count + 1 WHERE lottery_id = $2"
        )
        .bind(amount_sats)
        .bind(lottery_id)
        .execute(&self.pool)
        .await?;

        Ok(row.0)
    }

    // Winner operations

    pub async fn get_winners(&self, lottery_id: &[u8]) -> Result<Vec<Winner>> {
        let rows = sqlx::query_as::<_, (
            i32, Vec<u8>, Vec<u8>, i32, i32, i64, bool,
        )>(
            r#"
            SELECT id, buyer_pubkey, numbers, matching_numbers, prize_tier, prize_sats, claimed
            FROM tickets
            WHERE lottery_id = $1 AND is_winner = true
            ORDER BY prize_tier ASC
            "#,
        )
        .bind(lottery_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Winner {
            ticket_id: r.0,
            buyer_pubkey: hex::encode(&r.1),
            numbers: r.2,
            matching_numbers: r.3,
            prize_tier: r.4,
            prize_sats: r.5,
            claimed: r.6,
        }).collect())
    }

    // Prize tiers

    pub async fn get_prize_tiers(&self, lottery_type: i32) -> Result<Vec<PrizeTier>> {
        let rows = sqlx::query_as::<_, (i32, i32, f32, String)>(
            r#"
            SELECT tier, matches_required, payout_percentage, description
            FROM prize_tiers
            WHERE lottery_type = $1
            ORDER BY tier ASC
            "#,
        )
        .bind(lottery_type)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| PrizeTier {
            tier: r.0,
            matches_required: r.1,
            payout_percentage: r.2,
            description: r.3,
        }).collect())
    }

    // Stats

    pub async fn get_stats(&self) -> Result<LotteryStats> {
        let stats: (i32, i32, i32, i64, i64, i64) = sqlx::query_as(
            "SELECT total_lotteries, completed_lotteries, total_tickets_sold, total_volume_sats, total_payouts_sats, biggest_jackpot_sats FROM lottery_stats WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;

        let active: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM lotteries WHERE status = 'open'"
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(LotteryStats {
            total_lotteries: stats.0,
            completed_lotteries: stats.1,
            total_tickets_sold: stats.2,
            total_volume_sats: stats.3,
            total_payouts_sats: stats.4,
            biggest_jackpot_sats: stats.5,
            active_lotteries: active.0 as i32,
        })
    }

    // DLC operations

    pub async fn get_dlc_contracts(&self, lottery_id: &[u8]) -> Result<Vec<DlcContract>> {
        let rows = sqlx::query_as::<_, (
            i32, Vec<u8>, i32, Vec<u8>, Vec<u8>, String, chrono::DateTime<chrono::Utc>,
        )>(
            r#"
            SELECT id, lottery_id, ticket_id, oracle_pubkey, buyer_pubkey, status, created_at
            FROM dlc_contracts
            WHERE lottery_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(lottery_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| DlcContract {
            id: r.0,
            lottery_id: hex::encode(&r.1),
            ticket_id: r.2,
            oracle_pubkey: hex::encode(&r.3),
            buyer_pubkey: hex::encode(&r.4),
            status: r.5,
            created_at: r.6.to_rfc3339(),
        }).collect())
    }

    // Indexer state

    pub async fn get_last_block_height(&self) -> Result<i32> {
        let row: (i32,) = sqlx::query_as(
            "SELECT last_block_height FROM indexer_state WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn update_last_block(&self, block_hash: &[u8], block_height: i32) -> Result<()> {
        sqlx::query(
            "UPDATE indexer_state SET last_block_hash = $1, last_block_height = $2, updated_at = NOW() WHERE id = 1"
        )
        .bind(block_hash)
        .bind(block_height)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

