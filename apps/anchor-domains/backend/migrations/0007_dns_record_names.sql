-- Add record_name field to dns_records for Selfie Records support
-- This allows storing the full DNS record name (e.g., user._nostr.domain.tld)
-- For regular records, this is NULL and the domain name is used
-- For identity records (Selfie Records), this contains the full record name

ALTER TABLE dns_records
ADD COLUMN IF NOT EXISTS record_name VARCHAR(512);

-- Index for record name lookups
CREATE INDEX IF NOT EXISTS idx_dns_records_record_name ON dns_records(record_name) WHERE record_name IS NOT NULL;

