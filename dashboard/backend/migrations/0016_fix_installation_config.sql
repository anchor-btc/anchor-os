-- Fix: Ensure installation_config has only one row (id=1)
-- This prevents the setup loop bug caused by duplicate rows

-- Remove any duplicate rows (keep only id=1)
DELETE FROM installation_config WHERE id != 1;

-- Add singleton constraint to prevent future duplicates
-- (This will fail silently if constraint already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'installation_config_singleton'
    ) THEN
        ALTER TABLE installation_config 
        ADD CONSTRAINT installation_config_singleton CHECK (id = 1);
    END IF;
END $$;

-- Ensure id=1 row exists with setup_completed=true if no rows exist
INSERT INTO installation_config (id, preset, services, setup_completed, created_at, updated_at)
SELECT 1, 'default', '{}', false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM installation_config WHERE id = 1);

