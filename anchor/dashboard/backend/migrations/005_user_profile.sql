-- User profile table for personalization
-- Stores user name and optional avatar for a more personal experience

CREATE TABLE IF NOT EXISTS user_profile (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'Bitcoiner',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default profile
INSERT INTO user_profile (name)
VALUES ('Bitcoiner')
ON CONFLICT DO NOTHING;
