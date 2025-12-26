-- Anchor Predictions: Binary Prediction Markets with AMM
-- This migration drops the old lottery schema and creates new prediction market tables

-- Drop old lottery tables and objects
DROP VIEW IF EXISTS lottery_winners;
DROP VIEW IF EXISTS active_lotteries;
DROP TRIGGER IF EXISTS update_stats_on_ticket ON tickets;
DROP TRIGGER IF EXISTS update_stats_on_lottery ON lotteries;
DROP TRIGGER IF EXISTS update_lottery_status_and_winners_trigger ON lotteries;
DROP FUNCTION IF EXISTS update_lottery_stats();
DROP FUNCTION IF EXISTS update_lottery_status_and_winners();
DROP TABLE IF EXISTS dlc_contracts;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS prize_tiers;
DROP TABLE IF EXISTS lotteries;
DROP TABLE IF EXISTS lottery_stats;

-- Markets: Binary prediction markets (YES/NO outcomes)
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    market_id BYTEA NOT NULL UNIQUE,
    -- Market content
    question TEXT NOT NULL,
    description TEXT,
    -- Resolution
    resolution_block INTEGER NOT NULL,
    oracle_pubkey BYTEA NOT NULL,
    creator_pubkey BYTEA NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, resolved, cancelled
    resolution SMALLINT, -- NULL=unresolved, 0=NO, 1=YES, 2=INVALID
    -- AMM State (Constant Product Market Maker)
    yes_pool BIGINT DEFAULT 1000000000, -- YES shares in pool (starts with liquidity)
    no_pool BIGINT DEFAULT 1000000000,  -- NO shares in pool
    k_constant NUMERIC(40,0), -- k = yes_pool * no_pool (calculated on first bet)
    -- Volume tracking
    total_volume_sats BIGINT DEFAULT 0,
    total_yes_sats BIGINT DEFAULT 0,
    total_no_sats BIGINT DEFAULT 0,
    position_count INTEGER DEFAULT 0,
    -- Transaction references
    created_txid BYTEA,
    created_at_block INTEGER,
    resolved_txid BYTEA,
    resolved_at_block INTEGER,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_market_id ON markets(market_id);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_resolution_block ON markets(resolution_block);
CREATE INDEX idx_markets_oracle ON markets(oracle_pubkey);
CREATE INDEX idx_markets_creator ON markets(creator_pubkey);

-- Positions: User bets on market outcomes
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    market_id BYTEA NOT NULL REFERENCES markets(market_id),
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    -- User info
    user_pubkey BYTEA NOT NULL,
    -- Bet details
    outcome SMALLINT NOT NULL, -- 0=NO, 1=YES
    amount_sats BIGINT NOT NULL,
    shares BIGINT NOT NULL, -- Shares received from AMM
    avg_price REAL NOT NULL, -- Average price paid per share (0-1)
    -- Resolution
    is_winner BOOLEAN DEFAULT FALSE,
    payout_sats BIGINT DEFAULT 0,
    claimed BOOLEAN DEFAULT FALSE,
    claim_txid BYTEA,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(txid, vout)
);

CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_positions_user ON positions(user_pubkey);
CREATE INDEX idx_positions_outcome ON positions(outcome);
CREATE INDEX idx_positions_winner ON positions(is_winner);
CREATE INDEX idx_positions_claimed ON positions(claimed);
CREATE INDEX idx_positions_block ON positions(block_height);

-- Market stats (aggregate statistics)
CREATE TABLE market_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_markets INTEGER DEFAULT 0,
    active_markets INTEGER DEFAULT 0,
    resolved_markets INTEGER DEFAULT 0,
    total_positions INTEGER DEFAULT 0,
    total_volume_sats BIGINT DEFAULT 0,
    total_payouts_sats BIGINT DEFAULT 0,
    largest_market_sats BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO market_stats (id) VALUES (1);

-- Indexer state (reuse existing or create new)
CREATE TABLE IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset indexer to reindex with new schema
UPDATE indexer_state SET last_block_height = 0, last_block_hash = NULL WHERE id = 1;

-- Function to update market stats
CREATE OR REPLACE FUNCTION update_market_stats() RETURNS TRIGGER AS $$
BEGIN
    UPDATE market_stats SET
        total_markets = (SELECT COUNT(*) FROM markets),
        active_markets = (SELECT COUNT(*) FROM markets WHERE status = 'open'),
        resolved_markets = (SELECT COUNT(*) FROM markets WHERE status = 'resolved'),
        total_positions = (SELECT COUNT(*) FROM positions),
        total_volume_sats = COALESCE((SELECT SUM(amount_sats) FROM positions), 0),
        total_payouts_sats = COALESCE((SELECT SUM(payout_sats) FROM positions WHERE claimed = true), 0),
        largest_market_sats = COALESCE((SELECT MAX(total_volume_sats) FROM markets), 0),
        updated_at = NOW()
    WHERE id = 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update stats
CREATE TRIGGER update_stats_on_market
    AFTER INSERT OR UPDATE ON markets
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_market_stats();

CREATE TRIGGER update_stats_on_position
    AFTER INSERT OR UPDATE ON positions
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_market_stats();

-- Function to calculate winner positions when market is resolved
CREATE OR REPLACE FUNCTION resolve_market_positions() RETURNS TRIGGER AS $$
BEGIN
    -- Only run when resolution changes from NULL to a value
    IF OLD.resolution IS NULL AND NEW.resolution IS NOT NULL AND NEW.resolution IN (0, 1) THEN
        -- Mark winning positions
        UPDATE positions
        SET 
            is_winner = (outcome = NEW.resolution),
            payout_sats = CASE 
                WHEN outcome = NEW.resolution THEN 
                    -- Winner gets their shares value (simplified: amount * 2 - fees)
                    -- In real AMM, payout = shares * final_price where final_price = 1 for winners
                    shares
                ELSE 0
            END,
            updated_at = NOW()
        WHERE market_id = NEW.market_id;
        
        NEW.status = 'resolved';
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resolve_market_trigger
    BEFORE UPDATE ON markets
    FOR EACH ROW
    EXECUTE FUNCTION resolve_market_positions();

-- View for active markets with calculated prices
CREATE VIEW active_markets_view AS
SELECT 
    m.*,
    -- Price of YES = no_pool / (yes_pool + no_pool)
    CASE WHEN (m.yes_pool + m.no_pool) > 0 
        THEN m.no_pool::REAL / (m.yes_pool + m.no_pool)::REAL 
        ELSE 0.5 
    END as yes_price,
    -- Price of NO = yes_pool / (yes_pool + no_pool)
    CASE WHEN (m.yes_pool + m.no_pool) > 0 
        THEN m.yes_pool::REAL / (m.yes_pool + m.no_pool)::REAL 
        ELSE 0.5 
    END as no_price
FROM markets m
WHERE m.status = 'open';

-- View for market winners
CREATE VIEW market_winners AS
SELECT 
    p.id as position_id,
    p.market_id,
    p.user_pubkey,
    p.outcome,
    p.amount_sats,
    p.shares,
    p.payout_sats,
    p.claimed,
    m.question,
    m.resolution
FROM positions p
JOIN markets m ON p.market_id = m.market_id
WHERE p.is_winner = true;

