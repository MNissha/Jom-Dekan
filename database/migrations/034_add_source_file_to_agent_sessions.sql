-- =====================================================================
-- Migration 034: bind "Ask This Resource" sessions to an explicit file
-- =====================================================================
-- Multi-file resources now let a user explicitly choose which uploaded
-- file the AI Summary/Agent analyze (see resourceSourceSelectionService).
-- `source_hash` already uniquely identifies the selected file's content
-- (it IS that file's checksum), so cache/session correctness never
-- depended on this column — but the agent's session should still record
-- *which file* it was bound to, both for clarity and so
-- resourceAgentService can re-resolve the exact same file (rather than
-- re-deriving a possibly-different "recommended" one) on every
-- subsequent action against an existing session.
--
-- Nullable and additive: existing sessions (text-only, or created before
-- this migration) simply have NULL here, which resourceAgentService
-- already treats as "fall back to the normal default resolution" — no
-- backfill needed, nothing existing breaks.

ALTER TABLE resource_agent_sessions
    ADD COLUMN IF NOT EXISTS resource_file_id UUID REFERENCES resource_files(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_resource_agent_sessions_file
    ON resource_agent_sessions(resource_file_id);
