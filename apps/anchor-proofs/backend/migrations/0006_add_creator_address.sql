-- Add creator_address column to proofs table
-- This allows tracking who created each proof

ALTER TABLE proofs ADD COLUMN IF NOT EXISTS creator_address TEXT;

-- Create index for querying by creator
CREATE INDEX IF NOT EXISTS idx_proofs_creator ON proofs(creator_address);

