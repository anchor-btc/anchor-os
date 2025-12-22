-- ANCHOR Protocol Database Schema

-- Carrier types:
-- 0 = op_return (default)
-- 1 = inscription (Ordinals-style)
-- 2 = stamps (permanent bare multisig)
-- 3 = taproot_annex
-- 4 = witness_data

-- Messages table: stores ANCHOR messages from various carriers
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_hash BYTEA,
    block_height INTEGER,
    kind SMALLINT NOT NULL,
    body BYTEA NOT NULL,
    carrier SMALLINT NOT NULL DEFAULT 0,
    inscription_id TEXT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(txid, vout)
);

-- Anchors table: stores references to parent messages
CREATE TABLE anchors (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    anchor_index SMALLINT NOT NULL,
    txid_prefix BYTEA NOT NULL,
    vout SMALLINT NOT NULL,
    resolved_txid BYTEA,
    resolved_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    is_ambiguous BOOLEAN DEFAULT FALSE,
    is_orphan BOOLEAN DEFAULT FALSE,
    UNIQUE(message_id, anchor_index)
);

-- Indexer state: tracks the current indexing position
CREATE TABLE indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize indexer state
INSERT INTO indexer_state (id, last_block_height) VALUES (1, 0);

-- Indexes for efficient querying
CREATE INDEX idx_messages_txid ON messages(txid);
CREATE INDEX idx_messages_block_height ON messages(block_height);
CREATE INDEX idx_messages_kind ON messages(kind);
CREATE INDEX idx_messages_carrier ON messages(carrier);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_inscription_id ON messages(inscription_id) WHERE inscription_id IS NOT NULL;

CREATE INDEX idx_anchors_txid_prefix ON anchors(txid_prefix);
CREATE INDEX idx_anchors_resolved_message_id ON anchors(resolved_message_id);
CREATE INDEX idx_anchors_message_id ON anchors(message_id);

-- Helper function to get thread roots (messages with no anchors)
CREATE OR REPLACE FUNCTION get_thread_roots(limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    kind SMALLINT,
    body BYTEA,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.body, m.created_at
    FROM messages m
    WHERE NOT EXISTS (
        SELECT 1 FROM anchors a WHERE a.message_id = m.id
    )
    ORDER BY m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get replies to a message
CREATE OR REPLACE FUNCTION get_replies(parent_txid BYTEA, parent_vout INTEGER)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    kind SMALLINT,
    body BYTEA,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    parent_prefix BYTEA;
BEGIN
    -- Get the 8-byte prefix of the parent txid
    parent_prefix := substring(parent_txid from 1 for 8);
    
    RETURN QUERY
    SELECT m.id, m.txid, m.vout, m.block_height, m.kind, m.body, m.created_at
    FROM messages m
    INNER JOIN anchors a ON a.message_id = m.id
    WHERE a.anchor_index = 0  -- Only canonical parent (first anchor)
      AND a.txid_prefix = parent_prefix
      AND a.vout = parent_vout
      AND a.is_ambiguous = FALSE
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

