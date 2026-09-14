-- Lets students add a subject inline while uploading a resource when it
-- isn't in the catalogue yet, instead of being blocked until an admin
-- creates it. "source"/"verification_status" track where a subject row
-- came from so admins can find and clean up community submissions later;
-- "created_by" records who submitted it (best-effort — set null if the
-- user is later deleted, same convention as audit_logs.actor_user_id).
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'ADMIN'
        CHECK (source IN ('ADMIN', 'COMMUNITY')),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'ADMIN_VERIFIED'
        CHECK (verification_status IN ('COMMUNITY_SUBMITTED', 'ADMIN_VERIFIED')),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_verification_status ON subjects(verification_status);
