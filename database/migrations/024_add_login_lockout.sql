-- =====================================================================
-- Migration 024: Per-account login lockout
-- JomDekan — brute-force protection was previously only IP-based
-- (authRateLimiter), which both under- and over-protects: a shared
-- campus IP punishes many innocent students together, while a single
-- attacker can rotate IPs freely. This adds a per-account counter so
-- authService.login can lock one specific account for 15 minutes after
-- 10 consecutive wrong passwords, independent of where the requests
-- come from.
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ;
