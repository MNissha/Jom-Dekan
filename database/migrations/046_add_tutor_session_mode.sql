-- =====================================================================
-- Migration 046: Session mode on tutor applications/profiles
-- =====================================================================
-- How a tutor actually meets students: fully online (needs a platform),
-- on campus (needs a physical address), or both. Existing rows default
-- to 'ONLINE' with no platform set — harmless, since a tutor can update
-- it from their dashboard, and the applicant-facing form always
-- requires the fields that matter for whichever mode is chosen.

ALTER TABLE tutor_applications
    ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'ONLINE'
        CHECK (mode IN ('ONLINE', 'ON_CAMPUS', 'HYBRID')),
    ADD COLUMN IF NOT EXISTS location_address TEXT,
    ADD COLUMN IF NOT EXISTS online_platform VARCHAR(100);

ALTER TABLE tutor_applications ALTER COLUMN mode DROP DEFAULT;

ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'ONLINE'
        CHECK (mode IN ('ONLINE', 'ON_CAMPUS', 'HYBRID')),
    ADD COLUMN IF NOT EXISTS location_address TEXT,
    ADD COLUMN IF NOT EXISTS online_platform VARCHAR(100);

ALTER TABLE tutor_profiles ALTER COLUMN mode DROP DEFAULT;
