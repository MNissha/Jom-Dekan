-- =====================================================================
-- Migration 023: Taxonomy requests
-- JomDekan — universities and programmes can currently only be created
-- by an ADMIN (see taxonomyRoutes.ts). When a student can't find their
-- university, faculty, or programme while completing their profile or
-- uploading a resource, they previously had no in-app path forward at
-- all. This adds a student-facing "request it" submission: one row can
-- describe one, two, or all three missing levels at once (a missing
-- university implies its faculty and programme are unknown too), plus an
-- optional subject code/name if the student wants to flag that too.
--
-- Subjects already have a *non-gated* self-service path
-- (taxonomyService.subjects.findOrCreateForProgramme) that creates a
-- COMMUNITY_SUBMITTED subject immediately so uploads are never blocked —
-- that stays as-is. requested_subject_code/name here only cover the case
-- where the subject's own programme doesn't exist yet either, so
-- find-or-create has no programme to attach to.
--
-- No new notifications table: admins are notified through the
-- per-user `notifications` table Migration 004 already created (the same
-- one reportModel.notifyAdmins() writes into and the existing
-- bell/notifications endpoints already read) — see notificationModel.ts.
--
-- This migration only ships the data model + the row/notification that
-- gets created on submission. The admin review screen (approve/reject)
-- is a separate, not-yet-built piece of work.
-- =====================================================================
-- Idempotent-safe: CREATE TABLE IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS taxonomy_requests (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by                UUID REFERENCES users(id) ON DELETE SET NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    -- Existing-row context (set when that level already exists and only
    -- something under it is missing) vs. a freshly typed name (set when
    -- that level itself doesn't exist yet). At most one of each pair is
    -- meaningful at a time, but both are nullable rather than
    -- constrained — this is a free-form "help us fill the gap" report,
    -- not a strict cascading form.
    university_id               UUID REFERENCES universities(id) ON DELETE SET NULL,
    requested_university_name   VARCHAR(200),
    faculty_id                  UUID REFERENCES faculties(id) ON DELETE SET NULL,
    requested_faculty_name      VARCHAR(200),
    programme_id                UUID REFERENCES programmes(id) ON DELETE SET NULL,
    requested_programme_name    VARCHAR(200),
    requested_subject_code      VARCHAR(30),
    requested_subject_name      VARCHAR(200),

    note                        TEXT,
    reviewed_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_requests_requested_by ON taxonomy_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_taxonomy_requests_status ON taxonomy_requests(status);

DROP TRIGGER IF EXISTS trg_taxonomy_requests_updated_at ON taxonomy_requests;
CREATE TRIGGER trg_taxonomy_requests_updated_at BEFORE UPDATE ON taxonomy_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
