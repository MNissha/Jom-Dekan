-- Resume/CV upload + portfolio link for the tutor application and, once
-- approved, the live tutor profile (mirrors it the same way bio/subjects/
-- experience already get copied on approval — see tutorModel.profiles.
-- upsertFromApplication). Nullable: enforced as required at the
-- application-form/validator level for new applications, not a DB
-- constraint, so existing rows aren't broken.
ALTER TABLE tutor_applications
    ADD COLUMN IF NOT EXISTS resume_storage_key TEXT,
    ADD COLUMN IF NOT EXISTS resume_original_filename TEXT,
    ADD COLUMN IF NOT EXISTS resume_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS resume_size_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS resume_storage_key TEXT,
    ADD COLUMN IF NOT EXISTS resume_original_filename TEXT,
    ADD COLUMN IF NOT EXISTS resume_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS resume_size_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
