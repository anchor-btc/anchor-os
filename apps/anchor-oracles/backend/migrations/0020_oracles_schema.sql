-- Anchor Oracles Database Schema
-- Decentralized oracle network for Bitcoin

-- Oracles registry
CREATE TABLE oracles (
    id SERIAL PRIMARY KEY,
    pubkey BYTEA NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    categories INTEGER NOT NULL DEFAULT 0,
    stake_sats BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    registered_at INTEGER,
    registered_txid BYTEA,
    -- Reputation stats
    total_attestations INTEGER DEFAULT 0,
    successful_attestations INTEGER DEFAULT 0,
    disputed_attestations INTEGER DEFAULT 0,
    avg_response_blocks REAL DEFAULT 0,
    reputation_score REAL DEFAULT 50.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oracles_pubkey ON oracles(pubkey);
CREATE INDEX idx_oracles_status ON oracles(status);
CREATE INDEX idx_oracles_reputation ON oracles(reputation_score DESC);
CREATE INDEX idx_oracles_categories ON oracles(categories);

-- Oracle categories enum reference
-- 1 = Block/Chain data
-- 2 = Crypto prices
-- 4 = Sports
-- 8 = Weather
-- 16 = Elections/Politics
-- 32 = Random/VRF
-- 64 = Custom events

-- Attestations (oracle-signed outcomes)
CREATE TABLE attestations (
    id SERIAL PRIMARY KEY,
    oracle_id INTEGER REFERENCES oracles(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    category INTEGER NOT NULL,
    event_id BYTEA NOT NULL,
    event_description TEXT,
    outcome_data BYTEA NOT NULL,
    schnorr_signature BYTEA NOT NULL,
    status VARCHAR(20) DEFAULT 'valid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(txid, vout)
);

CREATE INDEX idx_attestations_oracle ON attestations(oracle_id);
CREATE INDEX idx_attestations_event ON attestations(event_id);
CREATE INDEX idx_attestations_category ON attestations(category);
CREATE INDEX idx_attestations_status ON attestations(status);
CREATE INDEX idx_attestations_block ON attestations(block_height DESC);

-- Disputes against attestations
CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    attestation_id INTEGER REFERENCES attestations(id) ON DELETE CASCADE,
    disputer_pubkey BYTEA NOT NULL,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    reason INTEGER NOT NULL,
    stake_sats BIGINT NOT NULL,
    evidence BYTEA,
    status VARCHAR(20) DEFAULT 'pending',
    resolution VARCHAR(20),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(txid, vout)
);

CREATE INDEX idx_disputes_attestation ON disputes(attestation_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_disputer ON disputes(disputer_pubkey);

-- Event requests (for oracles to fulfill)
CREATE TABLE event_requests (
    id SERIAL PRIMARY KEY,
    event_id BYTEA NOT NULL UNIQUE,
    requester_pubkey BYTEA,
    category INTEGER NOT NULL,
    description TEXT NOT NULL,
    resolution_block INTEGER,
    bounty_sats BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    fulfilled_by INTEGER REFERENCES oracles(id),
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_requests_event ON event_requests(event_id);
CREATE INDEX idx_event_requests_category ON event_requests(category);
CREATE INDEX idx_event_requests_status ON event_requests(status);

-- Oracle stake transactions
CREATE TABLE oracle_stakes (
    id SERIAL PRIMARY KEY,
    oracle_id INTEGER REFERENCES oracles(id) ON DELETE CASCADE,
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    amount_sats BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'stake', 'unstake', 'slash'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(txid, vout)
);

CREATE INDEX idx_oracle_stakes_oracle ON oracle_stakes(oracle_id);
CREATE INDEX idx_oracle_stakes_action ON oracle_stakes(action);

-- Indexer state
CREATE TABLE indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO indexer_state (id, last_block_height) VALUES (1, 0);

-- Stats view
CREATE VIEW oracle_stats AS
SELECT 
    COUNT(*) as total_oracles,
    COUNT(*) FILTER (WHERE status = 'active') as active_oracles,
    SUM(stake_sats) as total_staked,
    AVG(reputation_score) as avg_reputation,
    SUM(total_attestations) as total_attestations
FROM oracles;

