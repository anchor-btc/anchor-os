-- Electrum server preference setting
-- Values: "electrs" (default) or "fulcrum"

INSERT INTO system_settings (key, value) 
VALUES ('electrum_server', '"electrs"')
ON CONFLICT (key) DO NOTHING;
