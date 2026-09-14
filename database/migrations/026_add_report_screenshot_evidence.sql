ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS evidence_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS evidence_mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS evidence_data BYTEA;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_evidence_mime_check;
ALTER TABLE reports
    ADD CONSTRAINT reports_evidence_mime_check
    CHECK (
        evidence_mime_type IS NULL OR
        evidence_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    );
