-- AnchorProofs Schema
-- Proof of Existence system on Bitcoin using the Anchor protocol
-- Files are hashed client-side and only the hash is stored on-chain

-- AnchorProofs indexer state (separate from main anchor indexer)
CREATE TABLE IF NOT EXISTS anchorproof_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT anchorproof_single_row CHECK (id = 1)
);

-- Initialize indexer state
INSERT INTO anchorproof_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Proofs table
CREATE TABLE IF NOT EXISTS proofs (
    id SERIAL PRIMARY KEY,
    -- Hash information
    hash_algo SMALLINT NOT NULL, -- 1 = SHA-256, 2 = SHA-512
    file_hash BYTEA NOT NULL,
    -- File metadata (optional)
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    -- Transaction info
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    -- Creator info (for My Proofs feature)
    creator_address VARCHAR(100),
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Revocation status
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_txid BYTEA,
    revoked_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT proofs_txid_vout_unique UNIQUE (txid, vout),
    CONSTRAINT proofs_hash_algo_unique UNIQUE (file_hash, hash_algo)
);

-- Batch entries table (for BATCH operations)
CREATE TABLE IF NOT EXISTS proof_batch_entries (
    id SERIAL PRIMARY KEY,
    batch_txid BYTEA NOT NULL,
    batch_vout INTEGER NOT NULL DEFAULT 0,
    entry_index INTEGER NOT NULL,
    -- Hash information
    hash_algo SMALLINT NOT NULL,
    file_hash BYTEA NOT NULL,
    -- File metadata
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT proof_batch_entry_unique UNIQUE (batch_txid, batch_vout, entry_index)
);

-- Proof history (for tracking updates and revocations)
CREATE TABLE IF NOT EXISTS proof_history (
    id SERIAL PRIMARY KEY,
    proof_id INTEGER NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    operation SMALLINT NOT NULL, -- 1=stamp, 2=revoke, 3=batch
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Proof indexes
CREATE INDEX IF NOT EXISTS idx_proofs_file_hash ON proofs(file_hash);
CREATE INDEX IF NOT EXISTS idx_proofs_hash_algo ON proofs(hash_algo);
CREATE INDEX IF NOT EXISTS idx_proofs_txid ON proofs(txid);
CREATE INDEX IF NOT EXISTS idx_proofs_block_height ON proofs(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_is_revoked ON proofs(is_revoked);
CREATE INDEX IF NOT EXISTS idx_proofs_filename ON proofs(filename) WHERE filename IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proofs_mime_type ON proofs(mime_type) WHERE mime_type IS NOT NULL;

-- For txid_prefix lookups (first 8 bytes)
CREATE INDEX IF NOT EXISTS idx_proofs_txid_prefix ON proofs(substring(txid from 1 for 8));

-- Creator address index (for My Proofs feature)
CREATE INDEX IF NOT EXISTS idx_proofs_creator_address ON proofs(creator_address) WHERE creator_address IS NOT NULL;

-- Batch entries indexes
CREATE INDEX IF NOT EXISTS idx_batch_entries_txid ON proof_batch_entries(batch_txid, batch_vout);
CREATE INDEX IF NOT EXISTS idx_batch_entries_hash ON proof_batch_entries(file_hash);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_history_proof ON proof_history(proof_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON proof_history(created_at DESC);

-- Full-text search on filename and description
CREATE INDEX IF NOT EXISTS idx_proofs_search ON proofs 
    USING gin(to_tsvector('simple', COALESCE(filename, '') || ' ' || COALESCE(description, '')));

-- ============================================================================
-- Views
-- ============================================================================

-- Stats view for quick statistics
CREATE OR REPLACE VIEW anchorproof_stats AS
SELECT 
    COUNT(*) as total_proofs,
    COUNT(*) FILTER (WHERE NOT is_revoked) as active_proofs,
    COUNT(*) FILTER (WHERE is_revoked) as revoked_proofs,
    COUNT(*) FILTER (WHERE hash_algo = 1) as sha256_proofs,
    COUNT(*) FILTER (WHERE hash_algo = 2) as sha512_proofs,
    COUNT(DISTINCT txid) as total_transactions,
    MAX(block_height) as last_block_height,
    MAX(created_at) as last_update,
    COALESCE(SUM(file_size), 0) as total_file_size
FROM proofs;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to find proof by file hash
CREATE OR REPLACE FUNCTION find_proof_by_hash(
    p_file_hash BYTEA,
    p_hash_algo SMALLINT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    hash_algo SMALLINT,
    file_hash BYTEA,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    is_revoked BOOLEAN,
    revoked_txid BYTEA,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.hash_algo,
        p.file_hash,
        p.filename,
        p.mime_type,
        p.file_size,
        p.description,
        p.txid,
        p.vout,
        p.block_height,
        p.is_revoked,
        p.revoked_txid,
        p.created_at
    FROM proofs p
    WHERE p.file_hash = p_file_hash
      AND (p_hash_algo IS NULL OR p.hash_algo = p_hash_algo)
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate a file hash
CREATE OR REPLACE FUNCTION validate_proof(
    p_file_hash BYTEA,
    p_hash_algo SMALLINT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    proof_id INTEGER,
    txid BYTEA,
    block_height INTEGER,
    is_revoked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_proof RECORD;
BEGIN
    SELECT * INTO v_proof
    FROM proofs p
    WHERE p.file_hash = p_file_hash AND p.hash_algo = p_hash_algo
    LIMIT 1;
    
    IF v_proof IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::BYTEA, NULL::INTEGER, NULL::BOOLEAN, NULL::TIMESTAMP WITH TIME ZONE;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            v_proof.id,
            v_proof.txid,
            v_proof.block_height,
            v_proof.is_revoked,
            v_proof.created_at;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to list proofs with pagination
CREATE OR REPLACE FUNCTION list_proofs(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_include_revoked BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id INTEGER,
    hash_algo SMALLINT,
    file_hash BYTEA,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    is_revoked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.hash_algo,
        p.file_hash,
        p.filename,
        p.mime_type,
        p.file_size,
        p.description,
        p.txid,
        p.vout,
        p.block_height,
        p.is_revoked,
        p.created_at
    FROM proofs p
    WHERE p_include_revoked OR NOT p.is_revoked
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to search proofs by filename or description
CREATE OR REPLACE FUNCTION search_proofs(
    search_query TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    hash_algo SMALLINT,
    file_hash BYTEA,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    is_revoked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.hash_algo,
        p.file_hash,
        p.filename,
        p.mime_type,
        p.file_size,
        p.description,
        p.txid,
        p.vout,
        p.block_height,
        p.is_revoked,
        p.created_at,
        ts_rank(
            to_tsvector('simple', COALESCE(p.filename, '') || ' ' || COALESCE(p.description, '')),
            plainto_tsquery('simple', search_query)
        ) as rank
    FROM proofs p
    WHERE to_tsvector('simple', COALESCE(p.filename, '') || ' ' || COALESCE(p.description, '')) 
          @@ plainto_tsquery('simple', search_query)
       OR p.filename ILIKE '%' || search_query || '%'
       OR p.description ILIKE '%' || search_query || '%'
    ORDER BY rank DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get proof history
CREATE OR REPLACE FUNCTION get_proof_history(p_proof_id INTEGER)
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
    FROM proof_history h
    WHERE h.proof_id = p_proof_id
    ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if hash already exists
CREATE OR REPLACE FUNCTION hash_exists(
    p_file_hash BYTEA,
    p_hash_algo SMALLINT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM proofs WHERE file_hash = p_file_hash AND hash_algo = p_hash_algo
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get proofs by creator addresses (for My Proofs feature)
CREATE OR REPLACE FUNCTION get_proofs_by_addresses(
    p_addresses TEXT[],
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    hash_algo SMALLINT,
    file_hash BYTEA,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA,
    vout INTEGER,
    block_height INTEGER,
    is_revoked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.hash_algo,
        p.file_hash,
        p.filename,
        p.mime_type,
        p.file_size,
        p.description,
        p.txid,
        p.vout,
        p.block_height,
        p.is_revoked,
        p.created_at
    FROM proofs p
    WHERE p.creator_address = ANY(p_addresses)
    ORDER BY p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get proof stats by creator addresses
CREATE OR REPLACE FUNCTION get_proofs_stats_by_addresses(
    p_addresses TEXT[]
)
RETURNS TABLE (
    total_proofs BIGINT,
    unique_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_proofs,
        COUNT(DISTINCT p.txid)::bigint as unique_transactions
    FROM proofs p
    WHERE p.creator_address = ANY(p_addresses);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp on indexer state changes
CREATE OR REPLACE FUNCTION update_anchorproof_indexer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_anchorproof_indexer_updated_at
    BEFORE UPDATE ON anchorproof_indexer_state
    FOR EACH ROW
    EXECUTE FUNCTION update_anchorproof_indexer_timestamp();

-- Log proof operations to history
CREATE OR REPLACE FUNCTION log_proof_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO proof_history (proof_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 1, NEW.block_hash, NEW.block_height); -- 1 = stamp
    ELSIF TG_OP = 'UPDATE' AND OLD.is_revoked = FALSE AND NEW.is_revoked = TRUE THEN
        INSERT INTO proof_history (proof_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.revoked_txid, 0, 2, NEW.block_hash, NEW.block_height); -- 2 = revoke
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_proofs_history
    AFTER INSERT OR UPDATE ON proofs
    FOR EACH ROW
    EXECUTE FUNCTION log_proof_history();
