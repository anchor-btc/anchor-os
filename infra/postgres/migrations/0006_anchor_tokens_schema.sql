-- Migration: Anchor Tokens Schema
-- A UTXO-based token protocol on Bitcoin using the Anchor Protocol
-- Uses AnchorKind::Custom(20) for token operations

-- ============================================================================
-- Indexer State
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT token_single_row CHECK (id = 1)
);

INSERT INTO token_indexer_state (id, last_block_height) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Token Definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(32) NOT NULL,
    deploy_txid BYTEA NOT NULL,
    deploy_vout INTEGER NOT NULL DEFAULT 0,
    decimals SMALLINT NOT NULL DEFAULT 0 CHECK (decimals >= 0 AND decimals <= 18),
    max_supply NUMERIC(78, 0) NOT NULL CHECK (max_supply > 0),
    mint_limit NUMERIC(78, 0) CHECK (mint_limit IS NULL OR mint_limit > 0),
    minted_supply NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (minted_supply >= 0),
    burned_supply NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (burned_supply >= 0),
    holder_count INTEGER NOT NULL DEFAULT 0 CHECK (holder_count >= 0),
    tx_count INTEGER NOT NULL DEFAULT 1 CHECK (tx_count >= 0),
    flags SMALLINT NOT NULL DEFAULT 0,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT tokens_ticker_unique UNIQUE (ticker),
    CONSTRAINT tokens_deploy_unique UNIQUE (deploy_txid, deploy_vout)
);

-- ============================================================================
-- Token UTXOs
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_utxos (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    amount NUMERIC(78, 0) NOT NULL CHECK (amount > 0),
    owner_script BYTEA,
    owner_address TEXT,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    spent_txid BYTEA,
    spent_vout INTEGER,
    spent_block_height INTEGER,
    spent_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT token_utxos_unique UNIQUE (txid, vout, token_id)
);

-- ============================================================================
-- Token Operations History
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_operations (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    operation SMALLINT NOT NULL CHECK (operation >= 1 AND operation <= 5),
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    amount NUMERIC(78, 0),
    from_address TEXT,
    to_address TEXT,
    block_hash BYTEA,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Token Balances (Cached)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_balances (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    balance NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    utxo_count INTEGER NOT NULL DEFAULT 0 CHECK (utxo_count >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT token_balances_unique UNIQUE (token_id, address)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tokens_ticker ON tokens(ticker);
CREATE INDEX IF NOT EXISTS idx_tokens_ticker_lower ON tokens(LOWER(ticker));
CREATE INDEX IF NOT EXISTS idx_tokens_deploy_txid ON tokens(deploy_txid);
CREATE INDEX IF NOT EXISTS idx_tokens_block_height ON tokens(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_holder_count ON tokens(holder_count DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_tx_count ON tokens(tx_count DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_txid_prefix ON tokens(substring(deploy_txid from 1 for 8));

CREATE INDEX IF NOT EXISTS idx_token_utxos_token ON token_utxos(token_id);
CREATE INDEX IF NOT EXISTS idx_token_utxos_txid ON token_utxos(txid);
CREATE INDEX IF NOT EXISTS idx_token_utxos_owner ON token_utxos(owner_address);
CREATE INDEX IF NOT EXISTS idx_token_utxos_unspent ON token_utxos(token_id, owner_address) WHERE spent_txid IS NULL;
CREATE INDEX IF NOT EXISTS idx_token_utxos_block_height ON token_utxos(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_token_utxos_created_at ON token_utxos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_utxos_txid_vout ON token_utxos(txid, vout);
CREATE INDEX IF NOT EXISTS idx_token_utxos_txid_prefix ON token_utxos(substring(txid from 1 for 8));

CREATE INDEX IF NOT EXISTS idx_token_operations_token ON token_operations(token_id);
CREATE INDEX IF NOT EXISTS idx_token_operations_txid ON token_operations(txid);
CREATE INDEX IF NOT EXISTS idx_token_operations_type ON token_operations(operation);
CREATE INDEX IF NOT EXISTS idx_token_operations_from ON token_operations(from_address) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_operations_to ON token_operations(to_address) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_operations_block_height ON token_operations(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_token_operations_created_at ON token_operations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_balances_token ON token_balances(token_id);
CREATE INDEX IF NOT EXISTS idx_token_balances_address ON token_balances(address);
CREATE INDEX IF NOT EXISTS idx_token_balances_amount ON token_balances(token_id, balance DESC);

CREATE INDEX IF NOT EXISTS idx_tokens_ticker_search ON tokens USING gin(to_tsvector('simple', ticker));

-- ============================================================================
-- Views
-- ============================================================================

CREATE OR REPLACE VIEW token_stats AS
SELECT 
    COUNT(DISTINCT t.id) as total_tokens,
    COALESCE(SUM(t.holder_count), 0) as total_holders,
    COALESCE(SUM(t.tx_count), 0) as total_operations,
    MAX(t.block_height) as last_block_height,
    MAX(t.updated_at) as last_update
FROM tokens t;

CREATE OR REPLACE VIEW token_summary AS
SELECT 
    t.id,
    t.ticker,
    t.decimals,
    t.max_supply,
    t.minted_supply,
    t.burned_supply,
    (t.minted_supply - t.burned_supply) as circulating_supply,
    t.holder_count,
    t.tx_count,
    t.flags,
    t.block_height,
    t.created_at,
    encode(t.deploy_txid, 'hex') as deploy_txid_hex
FROM tokens t
ORDER BY t.created_at DESC;

-- ============================================================================
-- Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_token_holders(
    p_token_id INTEGER,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    address TEXT,
    balance NUMERIC(78, 0),
    utxo_count INTEGER,
    percentage NUMERIC(10, 4)
) AS $$
DECLARE
    v_circulating NUMERIC(78, 0);
BEGIN
    SELECT (minted_supply - burned_supply) INTO v_circulating
    FROM tokens WHERE id = p_token_id;
    
    RETURN QUERY
    SELECT 
        b.address,
        b.balance,
        b.utxo_count,
        CASE 
            WHEN v_circulating > 0 THEN 
                ROUND((b.balance::NUMERIC / v_circulating) * 100, 4)
            ELSE 0
        END as percentage
    FROM token_balances b
    WHERE b.token_id = p_token_id AND b.balance > 0
    ORDER BY b.balance DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_address_balance(
    p_token_id INTEGER,
    p_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_balance NUMERIC(78, 0);
    v_utxo_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_balance, v_utxo_count
    FROM token_utxos
    WHERE token_id = p_token_id
      AND owner_address = p_address
      AND spent_txid IS NULL;
    
    INSERT INTO token_balances (token_id, address, balance, utxo_count, updated_at)
    VALUES (p_token_id, p_address, v_balance, v_utxo_count, NOW())
    ON CONFLICT (token_id, address) DO UPDATE SET
        balance = EXCLUDED.balance,
        utxo_count = EXCLUDED.utxo_count,
        updated_at = NOW();
    
    DELETE FROM token_balances
    WHERE token_id = p_token_id AND address = p_address AND balance = 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_holder_count(p_token_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE tokens SET
        holder_count = (
            SELECT COUNT(*) FROM token_balances
            WHERE token_id = p_token_id AND balance > 0
        ),
        updated_at = NOW()
    WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_ticker_available(p_ticker VARCHAR(32))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM tokens WHERE UPPER(ticker) = UPPER(p_ticker)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_tokens_updated_at ON tokens;
CREATE TRIGGER tr_tokens_updated_at
    BEFORE UPDATE ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_token_timestamp();
