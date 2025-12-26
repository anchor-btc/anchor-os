-- Domain Identities (Selfie Records)
-- Stores published identities (Nostr, Pubky) linked to domains

CREATE TABLE IF NOT EXISTS domain_identities (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    identity_type VARCHAR(20) NOT NULL CHECK (identity_type IN ('nostr', 'pubky')),
    public_key VARCHAR(128) NOT NULL,
    subdomain VARCHAR(63),
    record_name VARCHAR(255) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one identity type per subdomain per domain
    UNIQUE (domain_id, identity_type, subdomain)
);

CREATE INDEX IF NOT EXISTS idx_domain_identities_domain_id ON domain_identities(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_identities_type ON domain_identities(identity_type);

