-- =====================================================================
-- Migration 032: AI resource summaries (Phase 1)
-- =====================================================================
-- One row per generation attempt. A resource/source-hash pair may have
-- many FAILED rows (each retry is a fresh row) but at most one row that
-- is PROCESSING or READY at a time — enforced by the partial unique
-- index below, which also doubles as the atomic claim target for
-- concurrent-duplicate-generation protection (see
-- resourceSummaryModel.claim, an INSERT ... ON CONFLICT DO NOTHING
-- against this exact index).
--
-- `content` never holds the raw extracted document text — only the
-- validated, bounded structured summary JSON described in
-- docs/architecture.md. No secrets, no full source text, ever stored
-- here.

CREATE TABLE IF NOT EXISTS resource_ai_summaries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id         UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    resource_file_id    UUID REFERENCES resource_files(id) ON DELETE CASCADE,
    source_hash         TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL
                            CHECK (status IN ('PROCESSING', 'READY', 'FAILED', 'UNSUPPORTED')),
    content             JSONB,
    model               TEXT,
    input_tokens        INTEGER,
    output_tokens       INTEGER,
    error_code          TEXT,
    error_message       TEXT,
    generated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_ai_summaries_resource
    ON resource_ai_summaries(resource_id, source_hash, created_at DESC);

-- Daily-per-user generation-limit lookups (resourceSummaryService counts
-- today's rows for a given generated_by).
CREATE INDEX IF NOT EXISTS idx_resource_ai_summaries_generated_by
    ON resource_ai_summaries(generated_by, created_at);

-- The atomic claim/insert + "no duplicate successful summary" guarantee:
-- at most one PROCESSING-or-READY row per (resource_id, source_hash).
-- FAILED/UNSUPPORTED rows are deliberately excluded so a retry after
-- failure is a plain new insert, never blocked by this index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resource_ai_summaries_active
    ON resource_ai_summaries(resource_id, source_hash)
    WHERE status IN ('PROCESSING', 'READY');

DROP TRIGGER IF EXISTS trg_resource_ai_summaries_updated_at ON resource_ai_summaries;
CREATE TRIGGER trg_resource_ai_summaries_updated_at BEFORE UPDATE ON resource_ai_summaries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
