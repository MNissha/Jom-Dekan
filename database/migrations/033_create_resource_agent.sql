-- =====================================================================
-- Migration 033: "Ask This Resource" agent (Phase 2)
-- =====================================================================
-- Three tables:
--   resource_ai_chunks           — chunked, searchable source text/evidence
--   resource_agent_sessions      — one conversation per (user, resource)
--   resource_agent_messages      — the conversation transcript
--   resource_agent_answer_cache  — exact-question cache (optional reuse)
--
-- All four are pure derived/cache data over Phase 1's resources /
-- resource_files / resource_ai_summaries — nothing here stores secrets,
-- raw OpenAI responses, or hidden reasoning.

-- ---------------------------------------------------------------------
-- resource_ai_chunks — reindexed whenever the resource's Phase 1 source
-- hash changes (see resourceChunkService). A resource with an IMAGE
-- source type gets exactly one synthetic chunk built from its cached
-- Phase 1 summary (there is no raw transcript to chunk) so the same
-- search/read tool interface works uniformly across source types.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_ai_chunks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id         UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    resource_file_id    UUID REFERENCES resource_files(id) ON DELETE CASCADE,
    source_hash         TEXT NOT NULL,
    chunk_index         INTEGER NOT NULL,
    page_number         INTEGER,
    section_title       TEXT,
    content             TEXT NOT NULL CHECK (length(trim(content)) > 0),
    search_vector       tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_id, source_hash, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_resource_ai_chunks_resource_hash
    ON resource_ai_chunks(resource_id, source_hash);
CREATE INDEX IF NOT EXISTS idx_resource_ai_chunks_search_vector
    ON resource_ai_chunks USING GIN(search_vector);

-- ---------------------------------------------------------------------
-- resource_agent_sessions — one active conversation per (user, resource).
-- Bound to the source hash at creation time; resourceAgentService checks
-- this against the resource's *current* hash on every request and marks
-- the session stale (rather than silently answering from outdated
-- evidence) the moment they diverge.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_agent_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    source_hash     TEXT NOT NULL,
    title           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'CLEARED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);

-- Finds "the" active session for a user+resource quickly; a user may
-- have several CLEARED sessions for the same resource over time, but
-- at most one ACTIVE one (enforced in resourceAgentService, not by a
-- DB constraint, since CLEARED rows must remain freely insertable).
CREATE INDEX IF NOT EXISTS idx_resource_agent_sessions_active
    ON resource_agent_sessions(user_id, resource_id, status);

DROP TRIGGER IF EXISTS trg_resource_agent_sessions_updated_at ON resource_agent_sessions;
CREATE TRIGGER trg_resource_agent_sessions_updated_at BEFORE UPDATE ON resource_agent_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- resource_agent_messages — the transcript. `idempotency_key` is set on
-- both the USER and ASSISTANT row of one turn (never colliding with
-- each other because the unique index below also scopes on role) so a
-- retried/double-clicked request can be recognized and answered from
-- the already-persisted result instead of calling OpenAI again.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_agent_messages (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id           UUID NOT NULL REFERENCES resource_agent_sessions(id) ON DELETE CASCADE,
    role                 VARCHAR(10) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
    content              TEXT NOT NULL,
    citations            JSONB,
    suggested_questions  JSONB,
    model                TEXT,
    input_tokens         INTEGER,
    output_tokens        INTEGER,
    cached_input_tokens  INTEGER,
    request_id           TEXT,
    idempotency_key      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_agent_messages_session
    ON resource_agent_messages(session_id, created_at ASC);

-- The atomic claim target for duplicate-submission protection — an
-- INSERT ... ON CONFLICT DO NOTHING against this exact index, mirroring
-- migration 032's resource_ai_summaries claim pattern.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resource_agent_messages_idempotency
    ON resource_agent_messages(session_id, role, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------
-- resource_agent_answer_cache — exact-question reuse only (no semantic/
-- approximate matching in this phase). A hit here means an identical
-- normalized question against the identical (resource, source hash)
-- pair was already answered — safe to reuse verbatim without another
-- OpenAI call, and correctly invalidated the moment the source changes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_agent_answer_cache (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id                 UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    source_hash                 TEXT NOT NULL,
    normalized_question_hash    TEXT NOT NULL,
    answer                      TEXT NOT NULL,
    answer_status               VARCHAR(10) NOT NULL
                                    CHECK (answer_status IN ('ANSWERED', 'PARTIAL', 'NOT_FOUND')),
    citations                   JSONB,
    suggested_questions         JSONB,
    model                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_id, source_hash, normalized_question_hash)
);
