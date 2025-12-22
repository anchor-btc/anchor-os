-- Pending transactions for domain registration
-- Tracks transactions that have been broadcast but not yet confirmed on-chain

CREATE TABLE IF NOT EXISTS pending_transactions (
    id SERIAL PRIMARY KEY,
    txid BYTEA NOT NULL UNIQUE,
    domain_name TEXT NOT NULL,
    operation SMALLINT NOT NULL DEFAULT 1,  -- 1=register, 2=update, 3=transfer
    records_json JSONB,
    carrier SMALLINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Indexes for pending transactions
CREATE INDEX IF NOT EXISTS idx_pending_txid ON pending_transactions(txid);
CREATE INDEX IF NOT EXISTS idx_pending_domain ON pending_transactions(LOWER(domain_name));
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_transactions(expires_at);

