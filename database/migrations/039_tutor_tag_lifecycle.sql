-- =====================================================================
-- Migration 039: Tie a tutor's verified tag to the application that
-- granted it, so deleting that application revokes the tag.
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

-- ---------------------------------------------------------------------
-- tutor_profiles.source_application_id — the tutor_applications row
-- whose approval created/renewed this tag. ON DELETE CASCADE means
-- deleting that specific application row automatically deletes the
-- tag with it (enforced at the DB level, not just in application
-- code) — admins can still revoke a tag directly without deleting the
-- application (see tutorService.adminRevokeTutorTag), and a tag
-- granted directly by an admin (no source application) simply leaves
-- this NULL.
-- ---------------------------------------------------------------------
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS source_application_id UUID
        REFERENCES tutor_applications(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_source_application ON tutor_profiles(source_application_id);
