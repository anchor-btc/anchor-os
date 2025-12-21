-- Anchor Domains Schema
-- A decentralized DNS system on Bitcoin using the Anchor protocol
-- Supports TLDs: .btc, .sat, .anchor, .anc, .bit
-- Domains are registered first-come-first-served based on block confirmation

-- Anchor Domains indexer state (separate from main anchor indexer)
CREATE TABLE IF NOT EXISTS anchor_domains_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT anchor_domains_single_row CHECK (id = 1)
);

-- Initialize Anchor Domains indexer state
INSERT INTO anchor_domains_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Domains table (first-come-first-served based on block height)
CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    -- Current state transaction
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    -- Original registration transaction (owner)
    owner_txid BYTEA NOT NULL,
    owner_vout INTEGER NOT NULL DEFAULT 0,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint on name (case-insensitive)
    CONSTRAINT domains_name_unique UNIQUE (name),
    CONSTRAINT domains_txid_vout_unique UNIQUE (txid, vout)
);

-- DNS Records table
CREATE TABLE IF NOT EXISTS dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    -- Transaction that created this record
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    -- Record data
    record_type SMALLINT NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 300,
    value TEXT NOT NULL,
    -- Additional fields for MX/SRV
    priority INTEGER,
    weight INTEGER,
    port INTEGER,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Soft delete for updates (keep history)
    is_active BOOLEAN DEFAULT TRUE
);

-- Domain update history
CREATE TABLE IF NOT EXISTS domain_history (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    operation SMALLINT NOT NULL, -- 1=register, 2=update, 3=transfer
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Domain indexes
CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name);
CREATE INDEX IF NOT EXISTS idx_domains_name_lower ON domains(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_domains_txid ON domains(txid);
CREATE INDEX IF NOT EXISTS idx_domains_owner_txid ON domains(owner_txid);
CREATE INDEX IF NOT EXISTS idx_domains_block_height ON domains(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at DESC);

-- For txid_prefix lookups (first 8 bytes)
CREATE INDEX IF NOT EXISTS idx_domains_txid_prefix ON domains(substring(txid from 1 for 8));

-- DNS record indexes
CREATE INDEX IF NOT EXISTS idx_records_domain ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_records_type ON dns_records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_active ON dns_records(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_records_txid ON dns_records(txid);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_history_domain ON domain_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON domain_history(created_at DESC);

-- Full-text search on domain names
CREATE INDEX IF NOT EXISTS idx_domains_name_search ON domains 
    USING gin(to_tsvector('simple', name));

-- ============================================================================
-- Views
-- ============================================================================

-- Stats view for quick statistics
CREATE OR REPLACE VIEW anchor_domains_stats AS
SELECT 
    COUNT(DISTINCT d.id) as total_domains,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = TRUE) as total_records,
    COUNT(DISTINCT d.txid) + COUNT(DISTINCT r.txid) as total_transactions,
    MAX(d.block_height) as last_block_height,
    MAX(GREATEST(d.updated_at, r.created_at)) as last_update
FROM domains d
LEFT JOIN dns_records r ON r.domain_id = d.id;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to resolve a domain by name
CREATE OR REPLACE FUNCTION resolve_domain(domain_name VARCHAR(255))
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    txid BYTEA,
    vout INTEGER,
    record_type SMALLINT,
    ttl INTEGER,
    value TEXT,
    priority INTEGER,
    weight INTEGER,
    port INTEGER,
    record_txid BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.txid,
        d.vout,
        r.record_type,
        r.ttl,
        r.value,
        r.priority,
        r.weight,
        r.port,
        r.txid as record_txid,
        r.block_height,
        r.created_at
    FROM domains d
    LEFT JOIN dns_records r ON r.domain_id = d.id AND r.is_active = TRUE
    WHERE LOWER(d.name) = LOWER(domain_name)
    ORDER BY r.record_type, r.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve by txid prefix
CREATE OR REPLACE FUNCTION resolve_by_txid_prefix(prefix BYTEA)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    txid BYTEA,
    vout INTEGER,
    record_type SMALLINT,
    ttl INTEGER,
    value TEXT,
    priority INTEGER,
    weight INTEGER,
    port INTEGER,
    record_txid BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.txid,
        d.vout,
        r.record_type,
        r.ttl,
        r.value,
        r.priority,
        r.weight,
        r.port,
        r.txid as record_txid,
        r.block_height,
        r.created_at
    FROM domains d
    LEFT JOIN dns_records r ON r.domain_id = d.id AND r.is_active = TRUE
    WHERE substring(d.txid from 1 for 8) = prefix
    ORDER BY r.record_type, r.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to search domains
CREATE OR REPLACE FUNCTION search_domains(
    search_query TEXT,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    txid BYTEA,
    vout INTEGER,
    record_count BIGINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.txid,
        d.vout,
        COUNT(r.id) FILTER (WHERE r.is_active = TRUE) as record_count,
        d.block_height,
        d.created_at,
        ts_rank(to_tsvector('simple', d.name), plainto_tsquery('simple', search_query)) as rank
    FROM domains d
    LEFT JOIN dns_records r ON r.domain_id = d.id
    WHERE to_tsvector('simple', d.name) @@ plainto_tsquery('simple', search_query)
       OR d.name ILIKE '%' || search_query || '%'
    GROUP BY d.id
    ORDER BY rank DESC, d.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to list domains with pagination
CREATE OR REPLACE FUNCTION list_domains(
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    txid BYTEA,
    vout INTEGER,
    record_count BIGINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.txid,
        d.vout,
        COUNT(r.id) FILTER (WHERE r.is_active = TRUE) as record_count,
        d.block_height,
        d.created_at
    FROM domains d
    LEFT JOIN dns_records r ON r.domain_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get domain history
CREATE OR REPLACE FUNCTION get_domain_history(domain_name VARCHAR(255))
RETURNS TABLE (
    id INTEGER,
    txid BYTEA,
    vout INTEGER,
    operation SMALLINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.txid,
        h.vout,
        h.operation,
        h.block_height,
        h.created_at
    FROM domain_history h
    JOIN domains d ON d.id = h.domain_id
    WHERE LOWER(d.name) = LOWER(domain_name)
    ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if domain is available
CREATE OR REPLACE FUNCTION is_domain_available(domain_name VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM domains WHERE LOWER(name) = LOWER(domain_name)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp on domain changes
CREATE OR REPLACE FUNCTION update_domain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_timestamp();

-- Log domain updates to history
CREATE OR REPLACE FUNCTION log_domain_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO domain_history (domain_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 1, NEW.block_hash, NEW.block_height); -- 1 = register
    ELSIF TG_OP = 'UPDATE' AND OLD.txid != NEW.txid THEN
        INSERT INTO domain_history (domain_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 2, NEW.block_hash, NEW.block_height); -- 2 = update
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_domains_history
    AFTER INSERT OR UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION log_domain_history();
