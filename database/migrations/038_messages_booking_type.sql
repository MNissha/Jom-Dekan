-- =====================================================================
-- Migration 038: Structured booking-request messages
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

-- ---------------------------------------------------------------------
-- messages.message_type / metadata — lets a message carry structured
-- data (e.g. a tutoring booking request) instead of only free text, so
-- the Messages UI can render a rich card with Accept/Decline actions
-- in-thread. Regular user-sent chat messages keep the 'text' default
-- and an empty metadata object; only server-side code (never the
-- public POST /messages endpoint) may set message_type='booking_request'.
-- ---------------------------------------------------------------------
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'booking_request')),
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
