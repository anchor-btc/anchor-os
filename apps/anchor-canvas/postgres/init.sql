-- AnchorCanvas Database Schema
-- A collaborative pixel canvas on Bitcoin using the Anchor protocol

-- Canvas configuration
-- 4580 x 4580 = ~21 million pixels (Bitcoin's magic number)
-- Each pixel can be colored by anyone via a Bitcoin transaction

-- Estado atual de cada pixel (estado mais recente)
CREATE TABLE IF NOT EXISTS pixel_state (
    id SERIAL PRIMARY KEY,
    x INTEGER NOT NULL CHECK (x >= 0 AND x < 4580),
    y INTEGER NOT NULL CHECK (y >= 0 AND y < 4580),
    r SMALLINT NOT NULL CHECK (r >= 0 AND r <= 255),
    g SMALLINT NOT NULL CHECK (g >= 0 AND g <= 255),
    b SMALLINT NOT NULL CHECK (b >= 0 AND b <= 255),
    last_txid BYTEA NOT NULL,
    last_vout INTEGER NOT NULL DEFAULT 0,
    last_block_height INTEGER,
    creator_address VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(x, y)
);

-- Historico de alteracoes (para replay e auditoria)
CREATE TABLE IF NOT EXISTS pixel_history (
    id SERIAL PRIMARY KEY,
    x INTEGER NOT NULL CHECK (x >= 0 AND x < 4580),
    y INTEGER NOT NULL CHECK (y >= 0 AND y < 4580),
    r SMALLINT NOT NULL CHECK (r >= 0 AND r <= 255),
    g SMALLINT NOT NULL CHECK (g >= 0 AND g <= 255),
    b SMALLINT NOT NULL CHECK (b >= 0 AND b <= 255),
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    creator_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estado do indexador do Canvas (separado do indexer principal)
CREATE TABLE IF NOT EXISTS canvas_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT canvas_single_row CHECK (id = 1)
);

-- Initialize Canvas indexer state
INSERT INTO canvas_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pixel_state_coords ON pixel_state(x, y);
CREATE INDEX IF NOT EXISTS idx_pixel_state_updated ON pixel_state(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_state_block ON pixel_state(last_block_height DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_state_txid ON pixel_state(last_txid);

CREATE INDEX IF NOT EXISTS idx_pixel_history_coords ON pixel_history(x, y);
CREATE INDEX IF NOT EXISTS idx_pixel_history_created ON pixel_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_history_block ON pixel_history(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_history_txid ON pixel_history(txid);
CREATE INDEX IF NOT EXISTS idx_pixel_history_creator ON pixel_history(creator_address);
CREATE INDEX IF NOT EXISTS idx_pixel_state_creator ON pixel_state(creator_address);

-- Spatial index for region queries (using btree on x,y is sufficient for our use case)
CREATE INDEX IF NOT EXISTS idx_pixel_state_region ON pixel_state(x, y) INCLUDE (r, g, b);

-- Stats view for quick statistics
CREATE OR REPLACE VIEW canvas_stats AS
SELECT 
    COUNT(*) as total_pixels_painted,
    COUNT(DISTINCT last_txid) as total_transactions,
    MAX(last_block_height) as last_block_height,
    MAX(updated_at) as last_update
FROM pixel_state;

-- Function to get pixel history
CREATE OR REPLACE FUNCTION get_pixel_history(px INTEGER, py INTEGER, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    r SMALLINT,
    g SMALLINT,
    b SMALLINT,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT ph.r, ph.g, ph.b, ph.txid, ph.vout, ph.block_height, ph.created_at
    FROM pixel_history ph
    WHERE ph.x = px AND ph.y = py
    ORDER BY ph.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent pixel changes
CREATE OR REPLACE FUNCTION get_recent_pixels(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    x INTEGER,
    y INTEGER,
    r SMALLINT,
    g SMALLINT,
    b SMALLINT,
    last_txid BYTEA,
    last_block_height INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT ps.x, ps.y, ps.r, ps.g, ps.b, ps.last_txid, ps.last_block_height, ps.updated_at
    FROM pixel_state ps
    ORDER BY ps.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get pixels in a region (for tiles)
CREATE OR REPLACE FUNCTION get_region_pixels(
    x_min INTEGER, 
    y_min INTEGER, 
    x_max INTEGER, 
    y_max INTEGER
)
RETURNS TABLE (
    x INTEGER,
    y INTEGER,
    r SMALLINT,
    g SMALLINT,
    b SMALLINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ps.x, ps.y, ps.r, ps.g, ps.b
    FROM pixel_state ps
    WHERE ps.x >= x_min AND ps.x < x_max
      AND ps.y >= y_min AND ps.y < y_max
    ORDER BY ps.y, ps.x;
END;
$$ LANGUAGE plpgsql;








