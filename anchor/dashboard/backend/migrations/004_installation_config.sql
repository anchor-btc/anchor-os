-- Installation configuration table for Anchor OS setup wizard
-- Tracks which services are installed, their status, and the selected preset

CREATE TABLE IF NOT EXISTS installation_config (
    id SERIAL PRIMARY KEY,
    preset VARCHAR(20) NOT NULL DEFAULT 'default',
    services JSONB NOT NULL DEFAULT '{}',
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration row
INSERT INTO installation_config (preset, services, setup_completed)
VALUES ('default', '{}', FALSE)
ON CONFLICT DO NOTHING;

-- Service status tracking table for individual service states
CREATE TABLE IF NOT EXISTS service_status (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(100) NOT NULL UNIQUE,
    install_status VARCHAR(20) NOT NULL DEFAULT 'not_installed',
    enabled BOOLEAN DEFAULT FALSE,
    last_health_check TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_install_status CHECK (install_status IN ('not_installed', 'installed', 'installing', 'failed'))
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_service_status_service_id ON service_status(service_id);
CREATE INDEX IF NOT EXISTS idx_service_status_install_status ON service_status(install_status);
