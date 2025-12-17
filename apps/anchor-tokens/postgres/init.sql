-- Anchor Tokens Schema
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
    -- Token identity
    ticker VARCHAR(32) NOT NULL,
    deploy_txid BYTEA NOT NULL,
    deploy_vout INTEGER NOT NULL DEFAULT 0,
    -- Token parameters
    decimals SMALLINT NOT NULL DEFAULT 0 CHECK (decimals >= 0 AND decimals <= 18),
    max_supply NUMERIC(78, 0) NOT NULL CHECK (max_supply > 0),
    mint_limit NUMERIC(78, 0) CHECK (mint_limit IS NULL OR mint_limit > 0),
    -- Supply tracking
    minted_supply NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (minted_supply >= 0),
    burned_supply NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (burned_supply >= 0),
    -- Stats
    holder_count INTEGER NOT NULL DEFAULT 0 CHECK (holder_count >= 0),
    tx_count INTEGER NOT NULL DEFAULT 1 CHECK (tx_count >= 0),
    -- Flags: 0x01=OPEN_MINT, 0x02=FIXED_SUPPLY, 0x04=BURNABLE
    flags SMALLINT NOT NULL DEFAULT 0,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT tokens_ticker_unique UNIQUE (ticker),
    CONSTRAINT tokens_deploy_unique UNIQUE (deploy_txid, deploy_vout)
);

-- ============================================================================
-- Token UTXOs (Unspent Token Holdings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_utxos (
    id SERIAL PRIMARY KEY,
    -- Token reference
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    -- UTXO identity
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    -- Amount
    amount NUMERIC(78, 0) NOT NULL CHECK (amount > 0),
    -- Owner information (derived from transaction output)
    owner_script BYTEA,
    owner_address TEXT,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Spending info (NULL = unspent)
    spent_txid BYTEA,
    spent_vout INTEGER,
    spent_block_height INTEGER,
    spent_at TIMESTAMP WITH TIME ZONE,
    -- Constraints
    CONSTRAINT token_utxos_unique UNIQUE (txid, vout, token_id)
);

-- ============================================================================
-- Token Operations History
-- ============================================================================

-- Operation types:
-- 1 = DEPLOY
-- 2 = MINT
-- 3 = TRANSFER
-- 4 = BURN
-- 5 = SPLIT

CREATE TABLE IF NOT EXISTS token_operations (
    id SERIAL PRIMARY KEY,
    -- Token reference
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    -- Operation details
    operation SMALLINT NOT NULL CHECK (operation >= 1 AND operation <= 5),
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL DEFAULT 0,
    -- Amount (for MINT, BURN, single TRANSFER)
    amount NUMERIC(78, 0),
    -- Addresses involved
    from_address TEXT,
    to_address TEXT,
    -- Block info
    block_hash BYTEA,
    block_height INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Token Balances (Cached for Fast Lookups)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_balances (
    id SERIAL PRIMARY KEY,
    -- Token reference
    token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    -- Address
    address TEXT NOT NULL,
    -- Balance (sum of unspent UTXOs)
    balance NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    -- UTXO count
    utxo_count INTEGER NOT NULL DEFAULT 0 CHECK (utxo_count >= 0),
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT token_balances_unique UNIQUE (token_id, address)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Token indexes
CREATE INDEX IF NOT EXISTS idx_tokens_ticker ON tokens(ticker);
CREATE INDEX IF NOT EXISTS idx_tokens_ticker_lower ON tokens(LOWER(ticker));
CREATE INDEX IF NOT EXISTS idx_tokens_deploy_txid ON tokens(deploy_txid);
CREATE INDEX IF NOT EXISTS idx_tokens_block_height ON tokens(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_holder_count ON tokens(holder_count DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_tx_count ON tokens(tx_count DESC);

-- For txid_prefix lookups (first 8 bytes)
CREATE INDEX IF NOT EXISTS idx_tokens_txid_prefix ON tokens(substring(deploy_txid from 1 for 8));

-- UTXO indexes
CREATE INDEX IF NOT EXISTS idx_utxos_token ON token_utxos(token_id);
CREATE INDEX IF NOT EXISTS idx_utxos_txid ON token_utxos(txid);
CREATE INDEX IF NOT EXISTS idx_utxos_owner ON token_utxos(owner_address);
CREATE INDEX IF NOT EXISTS idx_utxos_unspent ON token_utxos(token_id, owner_address) WHERE spent_txid IS NULL;
CREATE INDEX IF NOT EXISTS idx_utxos_block_height ON token_utxos(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_utxos_created_at ON token_utxos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utxos_txid_vout ON token_utxos(txid, vout);

-- For finding UTXOs by txid prefix (for spending validation)
CREATE INDEX IF NOT EXISTS idx_utxos_txid_prefix ON token_utxos(substring(txid from 1 for 8));

-- Operation indexes
CREATE INDEX IF NOT EXISTS idx_operations_token ON token_operations(token_id);
CREATE INDEX IF NOT EXISTS idx_operations_txid ON token_operations(txid);
CREATE INDEX IF NOT EXISTS idx_operations_type ON token_operations(operation);
CREATE INDEX IF NOT EXISTS idx_operations_from ON token_operations(from_address) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_to ON token_operations(to_address) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_block_height ON token_operations(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON token_operations(created_at DESC);

-- Balance indexes
CREATE INDEX IF NOT EXISTS idx_balances_token ON token_balances(token_id);
CREATE INDEX IF NOT EXISTS idx_balances_address ON token_balances(address);
CREATE INDEX IF NOT EXISTS idx_balances_amount ON token_balances(token_id, balance DESC);

-- Full-text search on tickers
CREATE INDEX IF NOT EXISTS idx_tokens_ticker_search ON tokens 
    USING gin(to_tsvector('simple', ticker));

-- ============================================================================
-- Views
-- ============================================================================

-- Stats view for quick statistics
CREATE OR REPLACE VIEW token_stats AS
SELECT 
    COUNT(DISTINCT t.id) as total_tokens,
    COALESCE(SUM(t.holder_count), 0) as total_holders,
    COALESCE(SUM(t.tx_count), 0) as total_operations,
    MAX(t.block_height) as last_block_height,
    MAX(t.updated_at) as last_update
FROM tokens t;

-- Token summary view
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

-- Get token by ticker
CREATE OR REPLACE FUNCTION get_token_by_ticker(p_ticker VARCHAR(32))
RETURNS TABLE (
    id INTEGER,
    ticker VARCHAR(32),
    deploy_txid BYTEA,
    deploy_vout INTEGER,
    decimals SMALLINT,
    max_supply NUMERIC(78, 0),
    mint_limit NUMERIC(78, 0),
    minted_supply NUMERIC(78, 0),
    burned_supply NUMERIC(78, 0),
    holder_count INTEGER,
    tx_count INTEGER,
    flags SMALLINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.ticker, t.deploy_txid, t.deploy_vout,
        t.decimals, t.max_supply, t.mint_limit,
        t.minted_supply, t.burned_supply,
        t.holder_count, t.tx_count, t.flags,
        t.block_height, t.created_at
    FROM tokens t
    WHERE UPPER(t.ticker) = UPPER(p_ticker);
END;
$$ LANGUAGE plpgsql;

-- Get token holders with pagination
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
    -- Get circulating supply
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

-- Get unspent UTXOs for an address
CREATE OR REPLACE FUNCTION get_address_utxos(
    p_address TEXT,
    p_token_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    token_id INTEGER,
    ticker VARCHAR(32),
    txid BYTEA,
    vout INTEGER,
    amount NUMERIC(78, 0),
    decimals SMALLINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, u.token_id, t.ticker,
        u.txid, u.vout, u.amount, t.decimals,
        u.block_height, u.created_at
    FROM token_utxos u
    JOIN tokens t ON t.id = u.token_id
    WHERE u.owner_address = p_address
      AND u.spent_txid IS NULL
      AND (p_token_id IS NULL OR u.token_id = p_token_id)
    ORDER BY t.ticker, u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get address balances
CREATE OR REPLACE FUNCTION get_address_balances(p_address TEXT)
RETURNS TABLE (
    token_id INTEGER,
    ticker VARCHAR(32),
    decimals SMALLINT,
    balance NUMERIC(78, 0),
    utxo_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.token_id, t.ticker, t.decimals,
        b.balance, b.utxo_count
    FROM token_balances b
    JOIN tokens t ON t.id = b.token_id
    WHERE b.address = p_address AND b.balance > 0
    ORDER BY t.ticker;
END;
$$ LANGUAGE plpgsql;

-- Update balance for an address (recalculates from UTXOs)
CREATE OR REPLACE FUNCTION update_address_balance(
    p_token_id INTEGER,
    p_address TEXT
)
RETURNS VOID AS $$
DECLARE
    v_balance NUMERIC(78, 0);
    v_utxo_count INTEGER;
BEGIN
    -- Calculate balance from unspent UTXOs
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_balance, v_utxo_count
    FROM token_utxos
    WHERE token_id = p_token_id
      AND owner_address = p_address
      AND spent_txid IS NULL;
    
    -- Upsert balance
    INSERT INTO token_balances (token_id, address, balance, utxo_count, updated_at)
    VALUES (p_token_id, p_address, v_balance, v_utxo_count, NOW())
    ON CONFLICT (token_id, address) DO UPDATE SET
        balance = EXCLUDED.balance,
        utxo_count = EXCLUDED.utxo_count,
        updated_at = NOW();
    
    -- Remove zero balances
    DELETE FROM token_balances
    WHERE token_id = p_token_id AND address = p_address AND balance = 0;
END;
$$ LANGUAGE plpgsql;

-- Update holder count for a token
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

-- Check if ticker is available
CREATE OR REPLACE FUNCTION is_ticker_available(p_ticker VARCHAR(32))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM tokens WHERE UPPER(ticker) = UPPER(p_ticker)
    );
END;
$$ LANGUAGE plpgsql;

-- Search tokens
CREATE OR REPLACE FUNCTION search_tokens(
    p_query TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    ticker VARCHAR(32),
    decimals SMALLINT,
    max_supply NUMERIC(78, 0),
    minted_supply NUMERIC(78, 0),
    holder_count INTEGER,
    tx_count INTEGER,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.ticker, t.decimals, t.max_supply,
        t.minted_supply, t.holder_count, t.tx_count,
        t.block_height, t.created_at,
        ts_rank(to_tsvector('simple', t.ticker), plainto_tsquery('simple', p_query)) as rank
    FROM tokens t
    WHERE to_tsvector('simple', t.ticker) @@ plainto_tsquery('simple', p_query)
       OR t.ticker ILIKE '%' || p_query || '%'
    ORDER BY rank DESC, t.holder_count DESC, t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- List tokens with pagination
CREATE OR REPLACE FUNCTION list_tokens(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'DESC'
)
RETURNS TABLE (
    id INTEGER,
    ticker VARCHAR(32),
    decimals SMALLINT,
    max_supply NUMERIC(78, 0),
    minted_supply NUMERIC(78, 0),
    burned_supply NUMERIC(78, 0),
    holder_count INTEGER,
    tx_count INTEGER,
    flags SMALLINT,
    block_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT id, ticker, decimals, max_supply, minted_supply, burned_supply,
                holder_count, tx_count, flags, block_height, created_at
         FROM tokens
         ORDER BY %I %s
         LIMIT $1 OFFSET $2',
        p_sort_by, p_sort_order
    ) USING p_limit, p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp on token changes
CREATE OR REPLACE FUNCTION update_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_tokens_updated_at
    BEFORE UPDATE ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_token_timestamp();
