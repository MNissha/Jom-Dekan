-- =====================================================================
-- Migration 031: Support requests & suggestions
-- JomDekan's new "Help & Support" section (Profile & Settings) lets a
-- signed-in user contact support about a problem, or leave a suggestion
-- for improving the platform. One table covers both — `type` tells them
-- apart, and `subject` is only meaningful for SUPPORT (suggestions are
-- free-form text with no subject line).
--
-- No new notifications table: admins are notified through the per-user
-- `notifications` table Migration 004 already created (the same one
-- reportModel.notifyAdmins() writes into and the existing
-- bell/notifications endpoints already read) — see notificationModel.ts.
-- Admins are also emailed directly (best-effort) with the full message,
-- so there's no admin review screen yet — the content is delivered
-- straight to them rather than queued for a dashboard.
-- =====================================================================
-- Idempotent-safe: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS support_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('SUPPORT', 'SUGGESTION')),
    subject     VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_type ON support_requests(type);
