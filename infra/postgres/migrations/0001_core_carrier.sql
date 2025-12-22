-- Migration: Add carrier column for multi-carrier support
-- Run this on existing databases to add carrier support

-- Add carrier column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'carrier'
    ) THEN
        ALTER TABLE messages ADD COLUMN carrier SMALLINT NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added carrier column to messages table';
    ELSE
        RAISE NOTICE 'carrier column already exists';
    END IF;
END $$;

-- Add inscription_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'inscription_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN inscription_id TEXT;
        RAISE NOTICE 'Added inscription_id column to messages table';
    ELSE
        RAISE NOTICE 'inscription_id column already exists';
    END IF;
END $$;

-- Add content_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'content_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN content_type TEXT;
        RAISE NOTICE 'Added content_type column to messages table';
    ELSE
        RAISE NOTICE 'content_type column already exists';
    END IF;
END $$;

-- Create carrier index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_messages_carrier'
    ) THEN
        CREATE INDEX idx_messages_carrier ON messages(carrier);
        RAISE NOTICE 'Created idx_messages_carrier index';
    ELSE
        RAISE NOTICE 'idx_messages_carrier index already exists';
    END IF;
END $$;

-- Create inscription_id index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_messages_inscription_id'
    ) THEN
        CREATE INDEX idx_messages_inscription_id ON messages(inscription_id) WHERE inscription_id IS NOT NULL;
        RAISE NOTICE 'Created idx_messages_inscription_id index';
    ELSE
        RAISE NOTICE 'idx_messages_inscription_id index already exists';
    END IF;
END $$;

-- Carrier types reference:
-- 0 = op_return (default)
-- 1 = inscription (Ordinals-style)
-- 2 = stamps (permanent bare multisig)
-- 3 = taproot_annex
-- 4 = witness_data

COMMENT ON COLUMN messages.carrier IS 'Carrier type: 0=op_return, 1=inscription, 2=stamps, 3=taproot_annex, 4=witness_data';
COMMENT ON COLUMN messages.inscription_id IS 'Ordinals inscription ID (for inscription carrier)';
COMMENT ON COLUMN messages.content_type IS 'MIME content type (for inscription carrier)';
