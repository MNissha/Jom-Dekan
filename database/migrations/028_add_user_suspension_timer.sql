-- =====================================================================
-- Migration 028: Optional auto-expiring timer for admin account disables
-- JomDekan — users.status already supports 'SUSPENDED' (and
-- users.deleted_at already covers soft-delete), but there was no way to
-- schedule an automatic reactivation. This adds a nullable timestamp:
-- NULL means an indefinite disable (admin must manually re-enable),
-- set means the account is lazily reactivated (same pattern as
-- lockout_until in migration 024) the next time it's touched by
-- authService.login/refresh or the admin user list/profile endpoints,
-- once that timestamp has passed.
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
