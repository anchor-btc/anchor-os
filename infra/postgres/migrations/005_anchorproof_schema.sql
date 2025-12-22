-- AnchorProof Schema Migration
-- Proof of Existence system on Bitcoin using the Anchor protocol

-- AnchorProof indexer state
CREATE TABLE IF NOT EXISTS anchorproof_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT anchorproof_single_row CHECK (id = 1)
);

INSERT INTO anchorproof_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Proofs table
CREATE TABLE IF NOT EXISTS proofs (
    id SERIAL PRIMARY KEY,
    hash_algo SMALLINT NOT NULL,
    file_hash BYTEA NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    block_hash BYTEA,
    block_height INTEGER,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_txid BYTEA,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT proofs_txid_vout_unique UNIQUE (txid, vout),
    CONSTRAINT proofs_hash_algo_unique UNIQUE (file_hash, hash_algo)
);

-- Batch entries table
CREATE TABLE IF NOT EXISTS proof_batch_entries (
    id SERIAL PRIMARY KEY,
    batch_txid BYTEA NOT NULL,
    batch_vout INTEGER NOT NULL DEFAULT 0,
    entry_index INTEGER NOT NULL,
    hash_algo SMALLINT NOT NULL,
    file_hash BYTEA NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT proof_batch_entry_unique UNIQUE (batch_txid, batch_vout, entry_index)
);

-- Proof history
CREATE TABLE IF NOT EXISTS proof_history (
    id SERIAL PRIMARY KEY,
    proof_id INTEGER NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    operation SMALLINT NOT NULL,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proofs_file_hash ON proofs(file_hash);
CREATE INDEX IF NOT EXISTS idx_proofs_hash_algo ON proofs(hash_algo);
CREATE INDEX IF NOT EXISTS idx_proofs_txid ON proofs(txid);
CREATE INDEX IF NOT EXISTS idx_proofs_block_height ON proofs(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_is_revoked ON proofs(is_revoked);
CREATE INDEX IF NOT EXISTS idx_proofs_filename ON proofs(filename) WHERE filename IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proofs_mime_type ON proofs(mime_type) WHERE mime_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proofs_txid_prefix ON proofs(substring(txid from 1 for 8));
CREATE INDEX IF NOT EXISTS idx_batch_entries_txid ON proof_batch_entries(batch_txid, batch_vout);
CREATE INDEX IF NOT EXISTS idx_batch_entries_hash ON proof_batch_entries(file_hash);
CREATE INDEX IF NOT EXISTS idx_history_proof ON proof_history(proof_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON proof_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_search ON proofs 
    USING gin(to_tsvector('simple', COALESCE(filename, '') || ' ' || COALESCE(description, '')));

-- Stats view
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

-- Triggers
CREATE OR REPLACE FUNCTION update_anchorproof_indexer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_anchorproof_indexer_updated_at ON anchorproof_indexer_state;
CREATE TRIGGER tr_anchorproof_indexer_updated_at
    BEFORE UPDATE ON anchorproof_indexer_state
    FOR EACH ROW
    EXECUTE FUNCTION update_anchorproof_indexer_timestamp();

CREATE OR REPLACE FUNCTION log_proof_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO proof_history (proof_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.txid, NEW.vout, 1, NEW.block_hash, NEW.block_height);
    ELSIF TG_OP = 'UPDATE' AND OLD.is_revoked = FALSE AND NEW.is_revoked = TRUE THEN
        INSERT INTO proof_history (proof_id, txid, vout, operation, block_hash, block_height)
        VALUES (NEW.id, NEW.revoked_txid, 0, 2, NEW.block_hash, NEW.block_height);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_proofs_history ON proofs;
CREATE TRIGGER tr_proofs_history
    AFTER INSERT OR UPDATE ON proofs
    FOR EACH ROW
    EXECUTE FUNCTION log_proof_history();
