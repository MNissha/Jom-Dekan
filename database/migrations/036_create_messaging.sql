-- =====================================================================
-- Migration 036: Direct messaging (1:1 conversations)
-- Independent of the `notifications` table/feature — this is its own
-- inbox with its own read/unread state, not a notification type.
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

-- ---------------------------------------------------------------------
-- conversations — exactly one row per unordered pair of users. The
-- CHECK forces participant_one_id < participant_two_id, so every
-- insert/lookup must sort the pair first (see messageModel.ts's
-- orderParticipants helper); the UNIQUE index then makes "find or
-- create a conversation with this user" a plain upsert-safe lookup.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_two_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_conversations_participant_order
        CHECK (participant_one_id < participant_two_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_pair
    ON conversations(participant_one_id, participant_two_id);

-- Listing "my conversations by latest activity" needs both sides
-- indexed separately — a user can be participant_one on some rows and
-- participant_two on others.
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one_updated
    ON conversations(participant_one_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two_updated
    ON conversations(participant_two_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- messages — messageModel.createMessage() bumps conversations.updated_at
-- in the same transaction as the INSERT below, since this table has no
-- updated_at trigger of its own to drive that.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body             TEXT NOT NULL,
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fetching a conversation's messages in order (latest page first, then
-- reversed to ascending by the model; older-history pagination via a
-- `before` cursor uses this same index).
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at);

-- Unread-count queries filter to `read_at IS NULL` and exclude the
-- current user's own messages (sender_id != $1) — a partial index over
-- just the unread rows keeps that cheap as message volume grows.
CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
