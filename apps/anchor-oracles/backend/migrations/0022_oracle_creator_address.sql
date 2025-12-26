-- Add creator_address column to oracles table
-- This stores the wallet address that created/registered the oracle

ALTER TABLE oracles ADD COLUMN IF NOT EXISTS creator_address TEXT;

CREATE INDEX IF NOT EXISTS idx_oracles_creator_address ON oracles(creator_address);

COMMENT ON COLUMN oracles.creator_address IS 'Wallet address that created/registered this oracle';

