-- Anchor Lottery Database Schema
-- Trustless lottery with DLC-based payouts

-- Lotteries
CREATE TABLE lotteries (
    id SERIAL PRIMARY KEY,
    lottery_id BYTEA NOT NULL UNIQUE,
    lottery_type INTEGER NOT NULL, -- 0=daily, 1=weekly, 2=jackpot
    number_count INTEGER NOT NULL, -- how many numbers to pick
    number_max INTEGER NOT NULL, -- max value (e.g., 60)
    draw_block INTEGER NOT NULL, -- when to draw
    ticket_price_sats BIGINT NOT NULL,
    token_type INTEGER NOT NULL DEFAULT 0, -- 0=BTC, 1=AnchorToken
    oracle_pubkey BYTEA NOT NULL, -- designated oracle for draw
    creator_pubkey BYTEA NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, drawing, completed, cancelled
    total_pool_sats BIGINT DEFAULT 0,
    ticket_count INTEGER DEFAULT 0,
    winning_numbers BYTEA,
    draw_txid BYTEA,
    draw_signature BYTEA,
    created_txid BYTEA,
    created_at_block INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lotteries_lottery_id ON lotteries(lottery_id);
CREATE INDEX idx_lotteries_status ON lotteries(status);
CREATE INDEX idx_lotteries_draw_block ON lotteries(draw_block);
CREATE INDEX idx_lotteries_oracle ON lotteries(oracle_pubkey);
CREATE INDEX idx_lotteries_type ON lotteries(lottery_type);

-- Tickets
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    lottery_id BYTEA NOT NULL REFERENCES lotteries(lottery_id),
    txid BYTEA NOT NULL,
    vout INTEGER NOT NULL,
    block_height INTEGER,
    buyer_pubkey BYTEA NOT NULL,
    numbers BYTEA NOT NULL, -- sorted array of chosen numbers
    amount_sats BIGINT NOT NULL,
    matching_numbers INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    prize_tier INTEGER DEFAULT 0, -- 0=no prize, 1=jackpot, 2=second, etc.
    prize_sats BIGINT DEFAULT 0,
    claimed BOOLEAN DEFAULT FALSE,
    claim_txid BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(txid, vout)
);

CREATE INDEX idx_tickets_lottery ON tickets(lottery_id);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_pubkey);
CREATE INDEX idx_tickets_winner ON tickets(is_winner);
CREATE INDEX idx_tickets_claimed ON tickets(claimed);
CREATE INDEX idx_tickets_block ON tickets(block_height);

-- DLC contracts for trustless payout
CREATE TABLE dlc_contracts (
    id SERIAL PRIMARY KEY,
    lottery_id BYTEA NOT NULL,
    ticket_id INTEGER REFERENCES tickets(id),
    oracle_pubkey BYTEA NOT NULL,
    buyer_pubkey BYTEA NOT NULL,
    funding_txid BYTEA,
    funding_vout INTEGER,
    contract_info BYTEA, -- serialized DLC contract details
    adaptor_signatures BYTEA, -- adaptor signatures for each outcome
    oracle_signature BYTEA, -- oracle's attestation signature
    status VARCHAR(20) DEFAULT 'pending', -- pending, funded, settled, refunded
    settled_txid BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dlc_lottery ON dlc_contracts(lottery_id);
CREATE INDEX idx_dlc_ticket ON dlc_contracts(ticket_id);
CREATE INDEX idx_dlc_status ON dlc_contracts(status);
CREATE INDEX idx_dlc_buyer ON dlc_contracts(buyer_pubkey);

-- Prize tiers configuration
CREATE TABLE prize_tiers (
    id SERIAL PRIMARY KEY,
    lottery_type INTEGER NOT NULL,
    tier INTEGER NOT NULL, -- 1=jackpot, 2=second, etc.
    matches_required INTEGER NOT NULL, -- how many numbers must match
    payout_percentage REAL NOT NULL, -- percentage of pool
    description VARCHAR(100),
    UNIQUE(lottery_type, tier)
);

-- Insert default prize tiers
INSERT INTO prize_tiers (lottery_type, tier, matches_required, payout_percentage, description) VALUES
    (0, 1, 6, 50.0, 'Jackpot - Match all 6'),
    (0, 2, 5, 25.0, 'Second - Match 5'),
    (0, 3, 4, 15.0, 'Third - Match 4'),
    (0, 4, 3, 10.0, 'Fourth - Match 3'),
    (1, 1, 6, 60.0, 'Jackpot - Match all 6'),
    (1, 2, 5, 25.0, 'Second - Match 5'),
    (1, 3, 4, 15.0, 'Third - Match 4'),
    (2, 1, 6, 80.0, 'Mega Jackpot - Match all 6'),
    (2, 2, 5, 15.0, 'Second - Match 5'),
    (2, 3, 4, 5.0, 'Third - Match 4');

-- Lottery stats
CREATE TABLE lottery_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_lotteries INTEGER DEFAULT 0,
    completed_lotteries INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    total_volume_sats BIGINT DEFAULT 0,
    total_payouts_sats BIGINT DEFAULT 0,
    biggest_jackpot_sats BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO lottery_stats (id) VALUES (1);

-- Indexer state
CREATE TABLE indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_block_hash BYTEA,
    last_block_height INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO indexer_state (id, last_block_height) VALUES (1, 0);

-- Function to update lottery stats
CREATE OR REPLACE FUNCTION update_lottery_stats() RETURNS TRIGGER AS $$
BEGIN
    UPDATE lottery_stats SET
        total_lotteries = (SELECT COUNT(*) FROM lotteries),
        completed_lotteries = (SELECT COUNT(*) FROM lotteries WHERE status = 'completed'),
        total_tickets_sold = (SELECT COUNT(*) FROM tickets),
        total_volume_sats = COALESCE((SELECT SUM(amount_sats) FROM tickets), 0),
        total_payouts_sats = COALESCE((SELECT SUM(prize_sats) FROM tickets WHERE claimed = true), 0),
        biggest_jackpot_sats = COALESCE((SELECT MAX(total_pool_sats) FROM lotteries WHERE status = 'completed'), 0),
        updated_at = NOW()
    WHERE id = 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update stats
CREATE TRIGGER update_stats_on_lottery
    AFTER INSERT OR UPDATE ON lotteries
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_lottery_stats();

CREATE TRIGGER update_stats_on_ticket
    AFTER INSERT OR UPDATE ON tickets
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_lottery_stats();

-- View for active lotteries
CREATE VIEW active_lotteries AS
SELECT 
    l.*,
    o.name as oracle_name,
    o.reputation_score as oracle_reputation
FROM lotteries l
LEFT JOIN (SELECT pubkey, name, reputation_score FROM oracles) o ON l.oracle_pubkey = o.pubkey
WHERE l.status = 'open';

-- View for lottery winners
CREATE VIEW lottery_winners AS
SELECT 
    t.id as ticket_id,
    t.lottery_id,
    t.buyer_pubkey,
    t.numbers,
    t.matching_numbers,
    t.prize_tier,
    t.prize_sats,
    t.claimed,
    l.winning_numbers,
    l.total_pool_sats
FROM tickets t
JOIN lotteries l ON t.lottery_id = l.lottery_id
WHERE t.is_winner = true;

