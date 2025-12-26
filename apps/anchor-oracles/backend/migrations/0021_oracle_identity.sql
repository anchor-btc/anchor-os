-- Add key_type and linked_identity_id columns to oracles table
-- key_type: 0 = secp256k1 (Nostr/Bitcoin), 1 = Ed25519 (Pubky)

ALTER TABLE oracles ADD COLUMN IF NOT EXISTS key_type INTEGER NOT NULL DEFAULT 0;
ALTER TABLE oracles ADD COLUMN IF NOT EXISTS linked_identity_id TEXT;

-- Add index for faster identity lookups
CREATE INDEX IF NOT EXISTS idx_oracles_linked_identity ON oracles(linked_identity_id);
CREATE INDEX IF NOT EXISTS idx_oracles_key_type ON oracles(key_type);

-- Comment for documentation
COMMENT ON COLUMN oracles.key_type IS 'Cryptographic key type: 0 = secp256k1 (Nostr), 1 = Ed25519 (Pubky)';
COMMENT ON COLUMN oracles.linked_identity_id IS 'Optional: ID of linked identity in anchor-wallet';

