-- Domains Schema Migration
-- A decentralized DNS system on Bitcoin using the Anchor protocol

-- Domains indexer state
CREATE TABLE IF NOT EXISTS anchor_domains_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT anchor_domains_single_row CHECK (id = 1)
);

INSERT INTO anchor_domains_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    owner_txid BYTEA NOT NULL,
    owner_vout INTEGER NOT NULL DEFAULT 0,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT domains_name_unique UNIQUE (name),
    CONSTRAINT domains_txid_vout_unique UNIQUE (txid, vout)
);

-- DNS Records table
CREATE TABLE IF NOT EXISTS dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    record_type SMALLINT NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 300,
    value TEXT NOT NULL,
    priority INTEGER,
    weight INTEGER,
    port INTEGER,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Domain history
CREATE TABLE IF NOT EXISTS domain_history (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    operation SMALLINT NOT NULL,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name);
CREATE INDEX IF NOT EXISTS idx_domains_name_lower ON domains(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_domains_txid ON domains(txid);
CREATE INDEX IF NOT EXISTS idx_domains_txid_prefix ON domains(substring(txid from 1 for 8));
CREATE INDEX IF NOT EXISTS idx_domains_block_height ON domains(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dns_records_domain ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(record_type);
CREATE INDEX IF NOT EXISTS idx_dns_records_active ON dns_records(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_domain_history_domain ON domain_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_history_created ON domain_history(created_at DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_domains_name_search ON domains 
    USING gin(to_tsvector('simple', name));

-- Stats view
CREATE OR REPLACE VIEW anchor_domains_stats AS
SELECT 
    COUNT(DISTINCT d.id) as total_domains,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = TRUE) as total_records,
    COUNT(DISTINCT d.txid) + COUNT(DISTINCT r.txid) as total_transactions,
    MAX(d.block_height) as last_block_height,
    MAX(GREATEST(d.updated_at, r.created_at)) as last_update
FROM domains d
LEFT JOIN dns_records r ON r.domain_id = d.id;

-- Triggers
CREATE OR REPLACE FUNCTION update_domain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_domains_updated_at ON domains;
CREATE TRIGGER tr_domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_timestamp();

CREATE OR REPLACE FUNCTION log_domain_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO domain_history (domain_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 1, NEW.block_hash, NEW.block_height);
    ELSIF TG_OP = 'UPDATE' AND OLD.txid != NEW.txid THEN
        INSERT INTO domain_history (domain_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 2, NEW.block_hash, NEW.block_height);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_domains_history ON domains;
CREATE TRIGGER tr_domains_history
    AFTER INSERT OR UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION log_domain_history();
