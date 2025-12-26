-- Bypass do wizard de instalacao para testes E2E
-- Este script marca o setup como completo para pular o wizard
-- Execute com: docker exec core-postgres psql -U anchor -d anchor -f /path/to/seed-test-db.sql

UPDATE installation_config 
SET setup_completed = TRUE, 
    preset = 'default',
    services = '{"core-bitcoin": true, "core-wallet": true, "core-indexer": true}',
    updated_at = NOW() 
WHERE id = 1;

-- Opcional: criar usuario de teste se a tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profile') THEN
        INSERT INTO user_profile (name, avatar_url, created_at)
        VALUES ('Test User', NULL, NOW())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

