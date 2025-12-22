-- Places Schema
-- A Bitcoin-powered map markers application using the Anchor protocol
-- Markers are stored on-chain with lat/lng coordinates and messages

-- Places indexer state (separate from main anchor indexer)
CREATE TABLE IF NOT EXISTS places_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT places_single_row CHECK (id = 1)
);

-- Initialize places indexer state
INSERT INTO places_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Marker categories
CREATE TABLE IF NOT EXISTS marker_categories (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#FF6B35'
);

-- Insert default categories
INSERT INTO marker_categories (id, name, icon, color) VALUES
    (0, 'General', 'map-pin', '#FF6B35'),
    (1, 'Tourism', 'camera', '#3B82F6'),
    (2, 'Commerce', 'shopping-bag', '#10B981'),
    (3, 'Event', 'calendar', '#8B5CF6'),
    (4, 'Warning', 'alert-triangle', '#EF4444'),
    (5, 'Historic', 'landmark', '#F59E0B')
ON CONFLICT (id) DO NOTHING;

-- Main markers table
CREATE TABLE IF NOT EXISTS markers (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    category_id SMALLINT NOT NULL DEFAULT 0 REFERENCES marker_categories(id),
    latitude REAL NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude REAL NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    message TEXT NOT NULL,
    creator_address TEXT,  -- Bitcoin address that created this marker
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(txid, vout)
);

-- Add creator_address column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'markers' AND column_name = 'creator_address') THEN
        ALTER TABLE markers ADD COLUMN creator_address TEXT;
    END IF;
END $$;

-- Marker replies (using Anchor threading)
CREATE TABLE IF NOT EXISTS marker_replies (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    -- Parent marker reference
    parent_txid BYTEA NOT NULL,
    parent_vout INTEGER NOT NULL DEFAULT 0,
    -- Reply content
    message TEXT NOT NULL,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(txid, vout),
    FOREIGN KEY (parent_txid, parent_vout) REFERENCES markers(txid, vout) ON DELETE CASCADE
);

-- Indexes for efficient querying

-- Marker indexes
CREATE INDEX IF NOT EXISTS idx_markers_coords ON markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_markers_category ON markers(category_id);
CREATE INDEX IF NOT EXISTS idx_markers_block ON markers(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_markers_created ON markers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markers_txid ON markers(txid);

-- Bounding box queries (for viewport filtering)
CREATE INDEX IF NOT EXISTS idx_markers_bounds ON markers(latitude, longitude) 
    INCLUDE (category_id, message, txid, vout);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_markers_message_search ON markers 
    USING gin(to_tsvector('english', message));

-- Reply indexes
CREATE INDEX IF NOT EXISTS idx_replies_parent ON marker_replies(parent_txid, parent_vout);
CREATE INDEX IF NOT EXISTS idx_replies_created ON marker_replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_txid ON marker_replies(txid);

-- Creator address index (for My Places feature)
CREATE INDEX IF NOT EXISTS idx_markers_creator ON markers(creator_address);

-- Stats view for quick statistics
CREATE OR REPLACE VIEW places_stats AS
SELECT 
    COUNT(*) as total_markers,
    COUNT(DISTINCT txid) as total_transactions,
    (SELECT COUNT(*) FROM marker_replies) as total_replies,
    MAX(block_height) as last_block_height,
    MAX(created_at) as last_update
FROM markers;

-- Function to get markers within bounds
CREATE OR REPLACE FUNCTION get_markers_in_bounds(
    lat_min REAL,
    lat_max REAL,
    lng_min REAL,
    lng_max REAL,
    category_filter SMALLINT DEFAULT NULL,
    limit_count INTEGER DEFAULT 1000
)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    category_id SMALLINT,
    category_name VARCHAR(50),
    category_icon VARCHAR(50),
    category_color VARCHAR(7),
    latitude REAL,
    longitude REAL,
    message TEXT,
    block_height INTEGER,
    reply_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        (SELECT COUNT(*) FROM marker_replies r WHERE r.parent_txid = m.txid AND r.parent_vout = m.vout) as reply_count,
        m.created_at
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    WHERE m.latitude >= lat_min AND m.latitude <= lat_max
      AND m.longitude >= lng_min AND m.longitude <= lng_max
      AND (category_filter IS NULL OR m.category_id = category_filter)
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search markers by message
CREATE OR REPLACE FUNCTION search_markers(
    search_query TEXT,
    category_filter SMALLINT DEFAULT NULL,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    category_id SMALLINT,
    category_name VARCHAR(50),
    category_icon VARCHAR(50),
    category_color VARCHAR(7),
    latitude REAL,
    longitude REAL,
    message TEXT,
    block_height INTEGER,
    reply_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        (SELECT COUNT(*) FROM marker_replies r WHERE r.parent_txid = m.txid AND r.parent_vout = m.vout) as reply_count,
        m.created_at,
        ts_rank(to_tsvector('english', m.message), plainto_tsquery('english', search_query)) as rank
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    WHERE to_tsvector('english', m.message) @@ plainto_tsquery('english', search_query)
      AND (category_filter IS NULL OR m.category_id = category_filter)
    ORDER BY rank DESC, m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get marker with replies
CREATE OR REPLACE FUNCTION get_marker_with_replies(
    marker_txid BYTEA,
    marker_vout INTEGER
)
RETURNS TABLE (
    -- Marker fields
    marker_id INTEGER,
    txid BYTEA,
    vout INTEGER,
    category_id SMALLINT,
    category_name VARCHAR(50),
    category_icon VARCHAR(50),
    category_color VARCHAR(7),
    latitude REAL,
    longitude REAL,
    message TEXT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    -- Reply fields (NULL for main marker row)
    reply_id INTEGER,
    reply_txid BYTEA,
    reply_vout INTEGER,
    reply_message TEXT,
    reply_block_height INTEGER,
    reply_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Return marker info
    RETURN QUERY
    SELECT 
        m.id as marker_id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        m.created_at,
        NULL::INTEGER as reply_id,
        NULL::BYTEA as reply_txid,
        NULL::INTEGER as reply_vout,
        NULL::TEXT as reply_message,
        NULL::INTEGER as reply_block_height,
        NULL::TIMESTAMP WITH TIME ZONE as reply_created_at
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    WHERE m.txid = marker_txid AND m.vout = marker_vout
    
    UNION ALL
    
    -- Return replies
    SELECT 
        m.id as marker_id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        m.created_at,
        r.id as reply_id,
        r.txid as reply_txid,
        r.vout as reply_vout,
        r.message as reply_message,
        r.block_height as reply_block_height,
        r.created_at as reply_created_at
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    JOIN marker_replies r ON r.parent_txid = m.txid AND r.parent_vout = m.vout
    WHERE m.txid = marker_txid AND m.vout = marker_vout
    ORDER BY reply_created_at ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent markers
CREATE OR REPLACE FUNCTION get_recent_markers(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    category_id SMALLINT,
    category_name VARCHAR(50),
    category_icon VARCHAR(50),
    category_color VARCHAR(7),
    latitude REAL,
    longitude REAL,
    message TEXT,
    block_height INTEGER,
    reply_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        (SELECT COUNT(*) FROM marker_replies r WHERE r.parent_txid = m.txid AND r.parent_vout = m.vout) as reply_count,
        m.created_at
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get markers by creator address (for My Places)
CREATE OR REPLACE FUNCTION get_markers_by_creator(
    creator TEXT,
    category_filter SMALLINT DEFAULT NULL,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    category_id SMALLINT,
    category_name VARCHAR(50),
    category_icon VARCHAR(50),
    category_color VARCHAR(7),
    latitude REAL,
    longitude REAL,
    message TEXT,
    block_height INTEGER,
    reply_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.txid,
        m.vout,
        m.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        m.latitude,
        m.longitude,
        m.message,
        m.block_height,
        (SELECT COUNT(*) FROM marker_replies r WHERE r.parent_txid = m.txid AND r.parent_vout = m.vout) as reply_count,
        m.created_at
    FROM markers m
    JOIN marker_categories c ON m.category_id = c.id
    WHERE m.creator_address = creator
      AND (category_filter IS NULL OR m.category_id = category_filter)
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

