-- =====================================================================
-- Migration 030: Opportunity applications — CV/portfolio attachments,
-- and a real application deadline on listings.
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

-- ---------------------------------------------------------------------
-- opportunities.application_deadline — plain DATE (the posting form
-- only ever collects YYYY-MM-DD). A listing is auto-archived (status
-- flipped to 'closed', the same value an admin uses to close a
-- listing manually) once this date has passed — see
-- OpportunityModel.archiveExpired(), called lazily on read the same
-- way userModel.reactivateExpiredSuspensions() lifts expired
-- suspensions, no cron needed.
-- ---------------------------------------------------------------------
ALTER TABLE opportunities
    ADD COLUMN IF NOT EXISTS application_deadline DATE;

CREATE INDEX IF NOT EXISTS idx_opportunities_application_deadline
    ON opportunities(application_deadline) WHERE status = 'active';

-- ---------------------------------------------------------------------
-- opportunity_applications — optional CV/portfolio per application.
-- Bytes are stored directly as BYTEA on the row (mirrors
-- reports.evidence_data/evidence_mime_type/evidence_filename), since
-- each application has exactly one CV slot and one portfolio slot —
-- no need for a separate files table or the full presigned-upload
-- pipeline resources use. A URL alternative is also offered per field
-- for applicants who'd rather link than upload.
-- ---------------------------------------------------------------------
ALTER TABLE opportunity_applications
    ADD COLUMN IF NOT EXISTS cv_filename TEXT,
    ADD COLUMN IF NOT EXISTS cv_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS cv_data BYTEA,
    ADD COLUMN IF NOT EXISTS cv_url TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_filename TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_data BYTEA,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
