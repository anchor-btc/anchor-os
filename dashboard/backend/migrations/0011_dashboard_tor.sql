-- Tor settings migration for Anchor OS

-- Add Tor settings to system_settings table
INSERT INTO system_settings (key, value) VALUES
    ('tor', '{
        "enabled": false,
        "proxy_mode": "hybrid",
        "proxy_bitcoin": true,
        "proxy_electrs": true,
        "proxy_mempool": false,
        "hidden_services": {
            "bitcoin": true,
            "electrs": true,
            "dashboard": false
        }
    }')
ON CONFLICT (key) DO NOTHING;
