//! Database operations for the explorer API

use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::postgres::PgPool;

use crate::models::{
    carrier_name, AnchorResponse, CarrierStats, ListParams, MessageResponse, StatsResponse,
    ThreadNodeResponse, ThreadResponse,
};

/// Database connection pool wrapper
#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

/// Raw message row from database
#[derive(Debug, sqlx::FromRow)]
struct MessageRow {
    id: i32,
    txid: Vec<u8>,
    vout: i32,
    block_height: Option<i32>,
    kind: i16,
    carrier: i16,
    body: Vec<u8>,
    created_at: DateTime<Utc>,
}

/// Raw message row with precomputed reply count
#[derive(Debug, sqlx::FromRow)]
struct MessageRowWithReplyCount {
    id: i32,
    txid: Vec<u8>,
    vout: i32,
    block_height: Option<i32>,
    kind: i16,
    carrier: i16,
    body: Vec<u8>,
    created_at: DateTime<Utc>,
    reply_count: i64,
}

/// Raw anchor row from database
#[derive(Debug, sqlx::FromRow)]
struct AnchorRow {
    anchor_index: i16,
    txid_prefix: Vec<u8>,
    vout: i16,
    resolved_txid: Option<Vec<u8>>,
    is_ambiguous: bool,
    is_orphan: bool,
}

impl Database {
    /// Create a new database connection
    pub async fn connect(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    /// Get protocol statistics
    pub async fn get_stats(&self) -> Result<StatsResponse> {
        let total_messages: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages")
            .fetch_one(&self.pool)
            .await?;

        let total_roots: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM messages m WHERE NOT EXISTS (SELECT 1 FROM anchors a WHERE a.message_id = m.id)",
        )
        .fetch_one(&self.pool)
        .await?;

        let total_anchors: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM anchors")
            .fetch_one(&self.pool)
            .await?;

        let resolved_anchors: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM anchors WHERE resolved_txid IS NOT NULL",
        )
        .fetch_one(&self.pool)
        .await?;

        let orphan_anchors: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM anchors WHERE is_orphan = TRUE")
                .fetch_one(&self.pool)
                .await?;

        let ambiguous_anchors: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM anchors WHERE is_ambiguous = TRUE")
                .fetch_one(&self.pool)
                .await?;

        let last_block: (i32,) =
            sqlx::query_as("SELECT last_block_height FROM indexer_state WHERE id = 1")
                .fetch_one(&self.pool)
                .await?;

        // Get carrier stats
        let op_return: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages WHERE carrier = 0")
            .fetch_one(&self.pool)
            .await
            .unwrap_or((0,));

        let inscription: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages WHERE carrier = 1")
            .fetch_one(&self.pool)
            .await
            .unwrap_or((0,));

        let stamps: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages WHERE carrier = 2")
            .fetch_one(&self.pool)
            .await
            .unwrap_or((0,));

        let taproot_annex: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM messages WHERE carrier = 3")
                .fetch_one(&self.pool)
                .await
                .unwrap_or((0,));

        let witness_data: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM messages WHERE carrier = 4")
                .fetch_one(&self.pool)
                .await
                .unwrap_or((0,));

        Ok(StatsResponse {
            total_messages: total_messages.0,
            total_roots: total_roots.0,
            total_replies: total_messages.0 - total_roots.0,
            total_anchors: total_anchors.0,
            resolved_anchors: resolved_anchors.0,
            orphan_anchors: orphan_anchors.0,
            ambiguous_anchors: ambiguous_anchors.0,
            last_block_height: last_block.0,
            carriers: CarrierStats {
                op_return: op_return.0,
                inscription: inscription.0,
                stamps: stamps.0,
                taproot_annex: taproot_annex.0,
                witness_data: witness_data.0,
            },
        })
    }

    /// List messages with pagination
    pub async fn list_messages(&self, params: &ListParams) -> Result<(Vec<MessageResponse>, i64)> {
        // Get total count
        let total: (i64,) = if let Some(kind) = params.kind {
            sqlx::query_as("SELECT COUNT(*) FROM messages WHERE kind = $1")
                .bind(kind)
                .fetch_one(&self.pool)
                .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM messages")
                .fetch_one(&self.pool)
                .await?
        };

        // Get messages
        let rows: Vec<MessageRow> = if let Some(kind) = params.kind {
            sqlx::query_as(
                r#"
                SELECT id, txid, vout, block_height, kind, carrier, body, created_at
                FROM messages
                WHERE kind = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(kind)
            .bind(params.per_page)
            .bind(params.offset())
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as(
                r#"
                SELECT id, txid, vout, block_height, kind, carrier, body, created_at
                FROM messages
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(params.per_page)
            .bind(params.offset())
            .fetch_all(&self.pool)
            .await?
        };

        let mut messages = Vec::with_capacity(rows.len());
        for row in rows {
            let msg = self.row_to_response(row).await?;
            messages.push(msg);
        }

        Ok((messages, total.0))
    }

    /// List root messages (threads)
    pub async fn list_roots(&self, params: &ListParams) -> Result<(Vec<MessageResponse>, i64)> {
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM messages m WHERE NOT EXISTS (SELECT 1 FROM anchors a WHERE a.message_id = m.id)",
        )
        .fetch_one(&self.pool)
        .await?;

        let rows: Vec<MessageRow> = sqlx::query_as(
            r#"
            SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.carrier, m.body, m.created_at
            FROM messages m
            WHERE NOT EXISTS (SELECT 1 FROM anchors a WHERE a.message_id = m.id)
            ORDER BY m.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(params.per_page)
        .bind(params.offset())
        .fetch_all(&self.pool)
        .await?;

        let mut messages = Vec::with_capacity(rows.len());
        for row in rows {
            let msg = self.row_to_response(row).await?;
            messages.push(msg);
        }

        Ok((messages, total.0))
    }

    /// List root messages with advanced filters
    pub async fn list_roots_filtered(&self, params: &crate::models::FilterParams) -> Result<(Vec<MessageResponse>, i64)> {
        let mut conditions = vec!["NOT EXISTS (SELECT 1 FROM anchors a WHERE a.message_id = m.id)".to_string()];
        let mut bind_index = 1;

        // Build filter conditions
        // For txid search: user searches in display format (big-endian)
        // Database stores in internal format (little-endian)
        // We reverse the search pattern to match internal storage
        if let Some(ref _txid) = params.txid {
            conditions.push(format!("encode(m.txid, 'hex') ILIKE ${}", bind_index));
            bind_index += 1;
        }

        if params.block_height.is_some() {
            conditions.push(format!("m.block_height = ${}", bind_index));
            bind_index += 1;
        }

        if params.block_min.is_some() {
            conditions.push(format!("m.block_height >= ${}", bind_index));
            bind_index += 1;
        }

        if params.block_max.is_some() {
            conditions.push(format!("m.block_height <= ${}", bind_index));
            bind_index += 1;
        }

        if params.kind.is_some() {
            conditions.push(format!("m.kind = ${}", bind_index));
            bind_index += 1;
        }

        if params.carrier.is_some() {
            conditions.push(format!("m.carrier = ${}", bind_index));
            bind_index += 1;
        }

        if params.text.is_some() {
            conditions.push(format!("(convert_from(m.body, 'UTF8') ILIKE ${} OR encode(m.body, 'hex') ILIKE ${})", bind_index, bind_index));
            bind_index += 1;
        }

        if params.from_date.is_some() {
            conditions.push(format!("m.created_at >= ${}", bind_index));
            bind_index += 1;
        }

        if params.to_date.is_some() {
            conditions.push(format!("m.created_at <= ${}", bind_index));
            bind_index += 1;
        }

        if params.min_size.is_some() {
            conditions.push(format!("length(m.body) >= ${}", bind_index));
            bind_index += 1;
        }

        if params.max_size.is_some() {
            conditions.push(format!("length(m.body) <= ${}", bind_index));
            bind_index += 1;
        }

        let where_clause = conditions.join(" AND ");

        // Determine sort order
        let order_by = match params.sort.as_deref() {
            Some("oldest") => "m.created_at ASC",
            Some("replies") => "reply_count DESC, m.created_at DESC",
            Some("size") => "length(m.body) DESC, m.created_at DESC",
            _ => "m.created_at DESC", // newest (default)
        };

        // Build count query
        let count_query = format!(
            "SELECT COUNT(*) FROM messages m WHERE {}",
            where_clause
        );

        // Build main query with subquery for reply_count to allow sorting
        let main_query = format!(
            r#"
            SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.carrier, m.body, m.created_at,
                   (SELECT COUNT(*) FROM anchors a2 WHERE a2.txid_prefix = substring(m.txid from 1 for 8) AND a2.vout = m.vout AND a2.anchor_index = 0) as reply_count
            FROM messages m
            WHERE {}
            ORDER BY {}
            LIMIT ${} OFFSET ${}
            "#,
            where_clause, order_by, bind_index, bind_index + 1
        );

        // Execute count query with bindings
        let mut count_q = sqlx::query_as::<_, (i64,)>(&count_query);
        let mut main_q = sqlx::query_as::<_, MessageRowWithReplyCount>(&main_query);

        // Bind parameters in order
        if let Some(ref txid) = params.txid {
            // Reverse the hex bytes to convert from display format to internal format
            // Display: 2a6614fa... -> Internal: ...fa1466a2
            let reversed_pattern = reverse_hex_bytes(txid);
            let pattern = format!("%{}%", reversed_pattern);
            count_q = count_q.bind(pattern.clone());
            main_q = main_q.bind(pattern);
        }

        if let Some(block_height) = params.block_height {
            count_q = count_q.bind(block_height);
            main_q = main_q.bind(block_height);
        }

        if let Some(block_min) = params.block_min {
            count_q = count_q.bind(block_min);
            main_q = main_q.bind(block_min);
        }

        if let Some(block_max) = params.block_max {
            count_q = count_q.bind(block_max);
            main_q = main_q.bind(block_max);
        }

        if let Some(kind) = params.kind {
            count_q = count_q.bind(kind);
            main_q = main_q.bind(kind);
        }

        if let Some(carrier) = params.carrier {
            count_q = count_q.bind(carrier);
            main_q = main_q.bind(carrier);
        }

        if let Some(ref text) = params.text {
            let pattern = format!("%{}%", text);
            count_q = count_q.bind(pattern.clone());
            main_q = main_q.bind(pattern);
        }

        if let Some(ref from_date) = params.from_date {
            count_q = count_q.bind(from_date);
            main_q = main_q.bind(from_date);
        }

        if let Some(ref to_date) = params.to_date {
            count_q = count_q.bind(to_date);
            main_q = main_q.bind(to_date);
        }

        if let Some(min_size) = params.min_size {
            count_q = count_q.bind(min_size);
            main_q = main_q.bind(min_size);
        }

        if let Some(max_size) = params.max_size {
            count_q = count_q.bind(max_size);
            main_q = main_q.bind(max_size);
        }

        // Bind pagination
        main_q = main_q.bind(params.per_page).bind(params.offset());

        let total = count_q.fetch_one(&self.pool).await?;
        let rows = main_q.fetch_all(&self.pool).await?;

        let mut messages = Vec::with_capacity(rows.len());
        for row in rows {
            let msg = self.row_with_count_to_response(row).await?;
            messages.push(msg);
        }

        Ok((messages, total.0))
    }

    /// Get a specific message by txid and vout
    pub async fn get_message(&self, txid: &[u8], vout: i32) -> Result<Option<MessageResponse>> {
        let row: Option<MessageRow> = sqlx::query_as(
            r#"
            SELECT id, txid, vout, block_height, kind, carrier, body, created_at
            FROM messages
            WHERE txid = $1 AND vout = $2
            "#,
        )
        .bind(txid)
        .bind(vout)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_response(row).await?)),
            None => Ok(None),
        }
    }

    /// Get replies to a message
    pub async fn get_replies(&self, txid: &[u8], vout: i32) -> Result<Vec<MessageResponse>> {
        let prefix = &txid[0..8];

        let rows: Vec<MessageRow> = sqlx::query_as(
            r#"
            SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.carrier, m.body, m.created_at
            FROM messages m
            INNER JOIN anchors a ON a.message_id = m.id
            WHERE a.anchor_index = 0
              AND a.txid_prefix = $1
              AND a.vout = $2
              AND a.is_ambiguous = FALSE
            ORDER BY m.created_at ASC
            "#,
        )
        .bind(prefix)
        .bind(vout as i16)
        .fetch_all(&self.pool)
        .await?;

        let mut messages = Vec::with_capacity(rows.len());
        for row in rows {
            let msg = self.row_to_response(row).await?;
            messages.push(msg);
        }

        Ok(messages)
    }

    /// Get popular threads sorted by total message count
    pub async fn get_popular_threads(&self, limit: i32) -> Result<Vec<crate::models::PopularThreadResponse>> {
        use crate::models::PopularThreadResponse;
        
        // Get all root messages (no anchors)
        let rows: Vec<MessageRow> = sqlx::query_as(
            r#"
            SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.carrier, m.body, m.created_at
            FROM messages m
            WHERE NOT EXISTS (
                SELECT 1 FROM anchors a WHERE a.message_id = m.id
            )
            ORDER BY m.created_at DESC
            LIMIT 100
            "#,
        )
        .fetch_all(&self.pool)
        .await?;
        
        // For each root, calculate total thread messages
        let mut popular: Vec<PopularThreadResponse> = Vec::new();
        
        for row in rows {
            let message = self.row_to_response(row).await?;
            
            // Get thread to count total messages
            let mut txid_bytes = hex::decode(&message.txid)?;
            txid_bytes.reverse();
            
            if let Some(thread) = self.get_thread(&txid_bytes, message.vout).await? {
                popular.push(PopularThreadResponse {
                    message,
                    total_thread_messages: thread.total_messages,
                });
            }
        }
        
        // Sort by total thread messages descending
        popular.sort_by(|a, b| b.total_thread_messages.cmp(&a.total_thread_messages));
        
        // Take only threads with more than 1 message and limit
        Ok(popular
            .into_iter()
            .filter(|p| p.total_thread_messages > 1)
            .take(limit as usize)
            .collect())
    }

    /// Get a full thread
    pub async fn get_thread(&self, txid: &[u8], vout: i32) -> Result<Option<ThreadResponse>> {
        let root = match self.get_message(txid, vout).await? {
            Some(msg) => msg,
            None => return Ok(None),
        };

        let replies = self.get_thread_replies(&root).await?;
        let total = Self::count_thread_messages(&replies) + 1;

        Ok(Some(ThreadResponse {
            root,
            replies,
            total_messages: total,
        }))
    }

    /// Recursively get thread replies
    async fn get_thread_replies(&self, parent: &MessageResponse) -> Result<Vec<ThreadNodeResponse>> {
        // parent.txid is in display format (big-endian hex), need to convert to internal format
        let mut txid = hex::decode(&parent.txid)?;
        txid.reverse(); // Convert from display to internal format
        let replies = self.get_replies(&txid, parent.vout).await?;

        let mut nodes = Vec::with_capacity(replies.len());
        for reply in replies {
            let sub_replies = Box::pin(self.get_thread_replies(&reply)).await?;
            nodes.push(ThreadNodeResponse {
                message: reply,
                replies: sub_replies,
            });
        }

        Ok(nodes)
    }

    /// Count messages in a thread tree
    fn count_thread_messages(nodes: &[ThreadNodeResponse]) -> i64 {
        let mut count = nodes.len() as i64;
        for node in nodes {
            count += Self::count_thread_messages(&node.replies);
        }
        count
    }

    /// Convert a database row to a response
    async fn row_to_response(&self, row: MessageRow) -> Result<MessageResponse> {
        // Get anchors
        let anchor_rows: Vec<AnchorRow> = sqlx::query_as(
            r#"
            SELECT anchor_index, txid_prefix, vout, resolved_txid, is_ambiguous, is_orphan
            FROM anchors
            WHERE message_id = $1
            ORDER BY anchor_index
            "#,
        )
        .bind(row.id)
        .fetch_all(&self.pool)
        .await?;

        let anchors: Vec<AnchorResponse> = anchor_rows
            .into_iter()
            .map(|a| AnchorResponse {
                index: a.anchor_index,
                txid_prefix: hex::encode(&a.txid_prefix),
                vout: a.vout,
                // Convert resolved_txid from internal to display format (reverse bytes)
                resolved_txid: a.resolved_txid.map(|t| {
                    let mut bytes = t;
                    bytes.reverse();
                    hex::encode(&bytes)
                }),
                is_ambiguous: a.is_ambiguous,
                is_orphan: a.is_orphan,
            })
            .collect();

        // Get reply count
        let prefix = &row.txid[0..8];
        let reply_count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)
            FROM anchors
            WHERE anchor_index = 0 AND txid_prefix = $1 AND vout = $2
            "#,
        )
        .bind(prefix)
        .bind(row.vout as i16)
        .fetch_one(&self.pool)
        .await?;

        let body_text = String::from_utf8(row.body.clone()).ok();

        // Convert txid from internal to display format (reverse bytes)
        let mut txid_display = row.txid.clone();
        txid_display.reverse();

        Ok(MessageResponse {
            id: row.id,
            txid: hex::encode(&txid_display),
            vout: row.vout,
            block_height: row.block_height,
            kind: row.kind,
            kind_name: kind_to_name(row.kind),
            carrier: row.carrier,
            carrier_name: carrier_name(row.carrier).to_string(),
            body_hex: hex::encode(&row.body),
            body_text,
            anchors,
            reply_count: reply_count.0,
            created_at: row.created_at,
        })
    }

    /// Convert a database row with precomputed reply count to a response
    async fn row_with_count_to_response(
        &self,
        row: MessageRowWithReplyCount,
    ) -> Result<MessageResponse> {
        // Get anchors
        let anchor_rows: Vec<AnchorRow> = sqlx::query_as(
            r#"
            SELECT anchor_index, txid_prefix, vout, resolved_txid, is_ambiguous, is_orphan
            FROM anchors
            WHERE message_id = $1
            ORDER BY anchor_index
            "#,
        )
        .bind(row.id)
        .fetch_all(&self.pool)
        .await?;

        let anchors: Vec<AnchorResponse> = anchor_rows
            .into_iter()
            .map(|a| AnchorResponse {
                index: a.anchor_index,
                txid_prefix: hex::encode(&a.txid_prefix),
                vout: a.vout,
                resolved_txid: a.resolved_txid.map(|t| {
                    let mut bytes = t;
                    bytes.reverse();
                    hex::encode(&bytes)
                }),
                is_ambiguous: a.is_ambiguous,
                is_orphan: a.is_orphan,
            })
            .collect();

        let body_text = String::from_utf8(row.body.clone()).ok();

        // Convert txid from internal to display format (reverse bytes)
        let mut txid_display = row.txid.clone();
        txid_display.reverse();

        Ok(MessageResponse {
            id: row.id,
            txid: hex::encode(&txid_display),
            vout: row.vout,
            block_height: row.block_height,
            kind: row.kind,
            kind_name: kind_to_name(row.kind),
            carrier: row.carrier,
            carrier_name: carrier_name(row.carrier).to_string(),
            body_hex: hex::encode(&row.body),
            body_text,
            anchors,
            reply_count: row.reply_count,
            created_at: row.created_at,
        })
    }
}

/// Convert kind code to human-readable name
fn kind_to_name(kind: i16) -> String {
    match kind {
        0 => "Generic".to_string(),
        1 => "Text".to_string(),
        2 => "State".to_string(),
        3 => "Vote".to_string(),
        4 => "Image".to_string(),
        n => format!("Custom({})", n),
    }
}

/// Reverse hex bytes to convert between display and internal txid format
/// Example: "2a6614fa" -> "fa1466a2"
fn reverse_hex_bytes(hex: &str) -> String {
    // Normalize to lowercase
    let hex = hex.to_lowercase();
    
    // If odd length, pad with leading zero
    let hex = if hex.len() % 2 == 1 {
        format!("0{}", hex)
    } else {
        hex.to_string()
    };
    
    // Split into byte pairs and reverse
    let bytes: Vec<&str> = (0..hex.len())
        .step_by(2)
        .map(|i| &hex[i..i+2])
        .collect();
    
    bytes.into_iter().rev().collect()
}

