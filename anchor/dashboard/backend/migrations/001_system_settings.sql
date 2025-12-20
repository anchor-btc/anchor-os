-- System settings table for Anchor OS
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default settings
INSERT INTO system_settings (key, value) VALUES
    ('auth', '{"enabled": false, "password_hash": null, "inactivity_timeout": 300}'),
    ('theme', '{"current": "bitcoin-orange", "auto_mode": false}'),
    ('language', '{"current": "en"}'),
    ('network', '{"bitcoin_network": "regtest"}'),
    ('notifications', '{"enabled": true, "backup_alerts": true, "service_alerts": true, "transaction_alerts": false}'),
    ('dashboard', '{"default_widgets": ["quick-launch", "resource-charts", "wallet", "node-stats", "recent-transactions", "indexer-stats"]}')
ON CONFLICT (key) DO NOTHING;



