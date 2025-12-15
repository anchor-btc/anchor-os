-- AnchorMap Database Initialization
-- This file is used when running a standalone AnchorMap deployment

-- Include the main anchor schema first (if not already present)
-- Then include the anchormap-specific schema

\echo 'Initializing AnchorMap database...'

-- The anchormap schema is loaded from the migrations directory
-- See: docker/postgres/migrations/003_anchormap_schema.sql

\echo 'AnchorMap database initialization complete!'

