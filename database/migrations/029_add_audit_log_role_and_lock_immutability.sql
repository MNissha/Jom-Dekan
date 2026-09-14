-- =====================================================================
-- Migration 029: Split audit_logs into user vs admin logs + lock it down
-- audit_logs was already append-only in application code (auditLogModel
-- exports no update/delete), but there was no way to tell "a user did
-- this to themselves" apart from "an admin did this to someone" other
-- than parsing the `action` string — RESOURCE_DELETED in particular
-- fires from the same code path for both an owner and an admin. This
-- adds actor_role, captured at write time from each call site's own
-- actor context, so the Admin Portal can render two genuinely separate
-- logs instead of guessing from naming conventions.
--
-- It also makes the "cannot be deleted, edited, or archived" guarantee
-- a DB-level fact instead of just an application-code convention: a
-- trigger rejects any UPDATE or DELETE against this table outright.
-- (Safe to add — nothing in this codebase hard-deletes a `users` row,
-- so the `actor_user_id ... ON DELETE SET NULL` FK action, which would
-- itself be blocked by this trigger, never actually fires.)
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS / OR REPLACE / DROP-then-CREATE
-- so it can be re-run against a clean database.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Best-effort backfill for rows written before this column existed.
-- Prefer the actor's current role (the only information available for
-- history), then fall back to name-based conventions already in use
-- across the app's action constants, defaulting anything left to USER.
UPDATE audit_logs al
SET actor_role = u.role
FROM users u
WHERE al.actor_user_id = u.id AND al.actor_role IS NULL;

UPDATE audit_logs
SET actor_role = 'ADMIN'
WHERE actor_role IS NULL
  AND (
    action LIKE 'ADMIN_%'
    OR action LIKE 'MODERATION_%'
    -- TAXONOMY_% is admin-CRUD EXCEPT the three community-submission
    -- actions any authenticated user can trigger (findOrCreateForProgramme
    -- during upload, and the "request this" flow) — those fall through
    -- to the USER default below instead.
    OR (action LIKE 'TAXONOMY_%' AND action NOT IN (
      'TAXONOMY_REQUEST_SUBMITTED',
      'TAXONOMY_SUBJECT_COMMUNITY_SUBMITTED',
      'TAXONOMY_SUBJECT_REUSED_FOR_PROGRAMME'
    ))
    OR action IN (
      'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED', 'ACCOUNT_DELETED',
      'USER_SUSPENDED', 'USER_REACTIVATED',
      'RESOLVED_APPROVED', 'RESOLVED_REJECTED'
    )
  );

UPDATE audit_logs SET actor_role = 'USER' WHERE actor_role IS NULL;

-- Append-only enforcement at the database layer.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_mutation ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
