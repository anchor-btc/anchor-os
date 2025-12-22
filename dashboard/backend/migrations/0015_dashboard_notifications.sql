-- Notifications table for Anchor OS
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,  -- 'backup', 'service', 'transaction', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info',     -- 'info', 'success', 'warning', 'error'
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Insert some initial notifications for testing
INSERT INTO notifications (notification_type, title, message, severity, read) VALUES
    ('system', 'Welcome to Anchor OS', 'Your Bitcoin node is ready to use.', 'success', false),
    ('system', 'Setup Complete', 'All core services are running.', 'info', false);
