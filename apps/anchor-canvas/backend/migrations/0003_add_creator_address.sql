-- Add creator_address column to pixel tables
-- This allows tracking who painted each pixel

-- Add creator_address to pixel_state
ALTER TABLE pixel_state 
ADD COLUMN IF NOT EXISTS creator_address TEXT;

-- Add creator_address to pixel_history
ALTER TABLE pixel_history 
ADD COLUMN IF NOT EXISTS creator_address TEXT;

-- Create index for querying by creator
CREATE INDEX IF NOT EXISTS idx_pixel_history_creator ON pixel_history(creator_address);
CREATE INDEX IF NOT EXISTS idx_pixel_state_creator ON pixel_state(creator_address);

