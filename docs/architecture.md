# JomDekan — Architecture

## Layering (mandatory dependency flow)

```
React page/component
  → custom hook (TanStack Query)
    → frontend service (src/service/*.ts)
      → Axios instance (src/api/axiosInstance.ts)
        → Express route
          → validation middleware (Zod) + auth/authorize middleware
            → controller (thin — parses req, calls service, shapes response)
              → service (business rules, transactions, permissions)
                → model/repository (parameterized SQL, no req/res)
                  → PostgreSQL
        ← response flows back up through the same layers
```

Rules enforced throughout the codebase:

- **Routes** only define endpoints and middleware composition.
- **Controllers** stay thin: validated input in, service call, shaped response out.
- **Services** hold business rules, transactions, and permission-sensitive
  state changes. `authService.ts` is the reference implementation
  (registration, login, refresh-token rotation with reuse detection,
  logout).
- **Models/repositories** contain parameterized SQL only and never
  import `express`. They are callable from scripts (e.g.
  `scripts/createAdmin.ts`) as well as services.
- **Frontend components/pages never call Axios directly.** Every
  request goes through `frontend/src/service/*.ts`, consumed via a
  hook in `frontend/src/hooks/*.ts` (TanStack Query for anything that
  is server data).
- **Zustand** (`frontend/src/store/useAuthStore.ts`) holds only
  genuine client/UI state — here, the in-memory access token and the
  bootstrapped user object. It is not a cache for server data; the
  authoritative "who am I" fetch (`GET /auth/me`) is intended to be
  wired through TanStack Query once profile data grows beyond what the
  login/refresh response already returns.
- **No ORM.** SQL migrations in `database/migrations/` are the single
  source of schema truth.

## Why Express, not NestJS, and why a Node/pg pool, not Supabase SDK

The system proposal PDF's own recommended stack lists NestJS and
Supabase-managed Postgres. Per the build prompt's authority order,
security/architecture-guide requirements outrank the PDF's product-level
suggestions. The **Project Structure and Architecture Guide** skill —
authority #2 — specifies plain Express with hand-composed layers, and a
`pg` connection pool with parameterized SQL. This repository follows
the skill: Express + `pg`, not NestJS + Supabase SDK. The PDF's
relational, RLS-aware Postgres schema decisions (UUID PKs, `citext`
email, JSONB only for bounded/flexible data) are still followed, since
those are data-model requirements, not framework requirements — they
apply equally under a hand-rolled Express/pg stack.

Object storage: the PDF recommends Supabase Storage/S3/R2 behind
signed URLs. That contract is captured in
`backend/src/config/config/storage.ts` as a `StorageAdapter`
interface with a clearly-labelled `local-stub` implementation that
throws rather than silently pretending to upload — Milestone 3 swaps
in a real S3-compatible adapter.

## Milestone 0/1 request flow (implemented)

```
Browser (React/Vite SPA, :5173)
   │  Axios (withCredentials, Bearer access token in memory)
   ▼
Express API (:3000)
   requestId → pino logging → CORS → Helmet/CSP → compression
   → cookie-parser → /api/v1 rate limiter → routes
      /auth/register, /auth/login  (public, rate-limited)
      /auth/refresh                (reads httpOnly refresh cookie, rotates it)
      /auth/logout                 (revokes the session row)
      /auth/me                     (Bearer access token required)
   ▼
Services (authService) → Models (userModel, sessionModel, auditLogModel)
   ▼
PostgreSQL (users, user_profiles, user_sessions, audit_logs, taxonomy)
```

## Auth token design

- **Access token**: short-lived JWT (`JWT_ACCESS_EXPIRES_IN`, default
  15m), returned in the JSON body only, kept in frontend memory
  (`useAuthStore`) — never `localStorage`. Cleared on full page
  reload; `useSessionBootstrap` silently re-derives it from the
  refresh cookie on load.
- **Refresh token**: JWT signed with a separate secret, stored
  **hashed** (SHA-256) in `user_sessions.refresh_token_hash` — the
  plaintext token itself is never persisted server-side. Delivered to
  the browser only as an `HttpOnly; Secure (prod); SameSite=Strict`
  cookie scoped to `/api/v1/auth`, so page JavaScript can never read
  it.
- **Rotation**: every `/auth/refresh` call issues a brand-new refresh
  token and revokes the old session row, linking `replaced_by_id`.
  Presenting an already-revoked refresh token revokes the *entire*
  session family for that user (reuse-detection — a strong signal the
  token was stolen).
- CSRF: because the refresh cookie is `SameSite=Strict` and carries no
  authority on its own (a bare cookie without the matching session row
  and JWT signature does nothing), and the access token must be
  attached manually via `Authorization: Bearer`, cross-site requests
  cannot forge authenticated calls. Milestone 2+ should revisit this
  if any endpoint moves to cookie-only auth.

## AI Resource Summaries (Phase 1)

An additive feature layered on top of the Milestone 3 resource model,
following the same request flow as everything else (route → validate/
auth → thin controller → service → model → PostgreSQL):

```
resourceSummaryRoutes → resourceSummaryController
  → resourceSummaryService (permissions, caching, cost control, orchestration)
      → resourceService.getVisibleResource   (reuses the existing visibility gate)
      → resourceTextExtractionService        (local, free: mime/size checks, PDF/DOCX text extraction, image prep)
      → resourceSummaryModel                 (atomic claim + status transitions)
      → openaiSummaryService                 (the only module that imports the `openai` SDK)
      → resourceSummaryDocumentService        (deterministic PDF/DOCX rendering from cached JSON — download only, no AI call)
```

**Caching/cost model.** `resource_ai_summaries` (migration 032) stores
one row per generation attempt, keyed by `(resource_id, source_hash)`.
`source_hash` is the file's existing SHA-256 checksum for an uploaded
file, or a hash of the normalized title+description for a text-only
resource — so editing either invalidates the cache automatically. A
partial unique index on `(resource_id, source_hash)` restricted to
`status IN ('PROCESSING', 'READY')` is both the "no duplicate READY
summary" constraint and the atomic claim target for concurrent-request
protection (`resourceSummaryModel.claim`, an `INSERT ... ON CONFLICT
DO NOTHING`). `GET` and the download route only ever read this table;
only `POST` can write to it, and only after: the resource is visible +
READY, the feature is enabled, local extraction confirms the content
is supported and non-trivial, and the caller's daily quota
(`AI_SUMMARY_DAILY_USER_LIMIT`) isn't exhausted. Downloads regenerate
the PDF/DOCX bytes from the cached JSON on every request (cheap) but
never re-derive the summary content itself.

**Prompt-injection posture.** The document/image content is always the
last thing appended to the model input, after stable developer
instructions that explicitly tell the model to treat it as untrusted
and never follow instructions found inside it. The model's output is
Structured-Outputs-constrained (JSON Schema, `strict: true`) and
re-validated with Zod before it's ever persisted — nothing the model
returns is trusted to be well-formed. AI output is display-only React
text (never `dangerouslySetInnerHTML`), is never fed back into the
model as instructions, and never affects moderation, approval, or
resource content.

**Secrets.** `OPENAI_API_KEY` is read only by `openaiSummaryService`,
only via `backend/src/config/config/env.ts` (never a `VITE_` variable,
never returned in a response, never logged — the OpenAI SDK's own
errors are also never surfaced to callers, only a mapped, sanitized
`AppError`).

## Ask This Resource (Phase 2 agent)

A resource-grounded conversational agent layered on top of Phase 1,
following the same route → validate/auth → thin controller → service
→ model → PostgreSQL flow:

```
resourceAgentRoutes → resourceAgentController
  → resourceAgentService        (sessions, turn orchestration, cost control, citation validation)
      → resourceService.getVisibleResource   (reuses the existing visibility gate)
      → resourceSummaryService.resolveSource  (shared source-hash resolution with Phase 1)
      → resourceChunkService                  (local, free: chunking + PostgreSQL full-text search)
      → openaiAgentService                    (the only module that imports the `openai` SDK for the agent)
      → resourceAgentModel                    (sessions, messages, answer cache)
```

**What makes this an agent, not a single prompt call.** Each turn runs
a bounded tool-calling loop against OpenAI's Responses API: the model
is given three read-only function tools and decides for itself whether
and how many times to call them before producing a final structured
answer. It is not agentic in the "autonomous, unbounded, browses the
web" sense — no web search, no hosted File Search, no Code
Interpreter, no vector DB, no tool can write anything. Every tool
executes against exactly one server-bound `(resourceId, sourceHash)`
pair chosen from the authenticated request, never from a model-supplied
argument, so the model has no way to ask about a different resource.

**Agent tools** (all read-only, all scoped to the current resource):

| Tool | Purpose | Bounded by |
|------|---------|------------|
| `get_current_resource_summary` | Returns the cached Phase 1 summary (overview/key points/topics/limitations) | Nothing to fetch — pure in-memory passthrough |
| `search_current_resource` | Full-text search over the resource's chunks | `AI_AGENT_MAX_CHUNKS_PER_SEARCH` results |
| `read_current_resource_sections` | Reads specific chunks by ID (for follow-up on a search hit) | `AI_AGENT_MAX_CHUNK_CHARACTERS` per chunk |

The loop calls at most `AI_AGENT_MAX_TOOL_CALLS` tools per question;
once that limit is reached, the next request to OpenAI omits the
`tools` parameter entirely, forcing a final structured answer instead
of another tool call.

**Chunking and PostgreSQL search (no vector DB).** `resourceChunkService`
splits a resource's extracted text (reusing Phase 1's PDF/DOCX
extraction, plus per-page extraction for PDFs) into heading-aware
chunks (`resource_ai_chunks`, migration 033), each with a generated
`tsvector` column and a GIN index. `search_current_resource` runs
`websearch_to_tsquery` ranked full-text search — the same mechanism
already used elsewhere in this codebase (see Milestone 4's plan),
never an embedding/vector similarity search. Chunks are built lazily
and cached by `(resource_id, source_hash, chunk_index)`; a resource
whose file/description changes gets its chunks rebuilt under the new
hash, exactly like Phase 1's summary cache.

**Conversation persistence and retention.** Sessions and messages live
in JomDekan's own database (`resource_agent_sessions`,
`resource_agent_messages`) — `previous_response_id` is never used, so
OpenAI holds no state between turns (`store: false`). Only the last
`AI_AGENT_CONTEXT_TURNS` question/answer pairs are resent as context
on each new question, keeping input size bounded regardless of how
long a conversation grows. A session expires after
`AI_AGENT_SESSION_EXPIRY_DAYS` of inactivity or immediately if the
resource's `source_hash` changes (edited file/description) — either
case starts a fresh session rather than reusing stale grounding.

**Cost controls.**
- Session creation, message listing, and clearing never call OpenAI.
- A per-user daily limit (`AI_AGENT_DAILY_USER_LIMIT`) counts only
  turns that actually reached OpenAI — cache hits and idempotent
  replays are excluded (`countQuestionsTodayForUser` filters on
  `output_tokens IS NOT NULL`).
- A per-session message cap (`AI_AGENT_SESSION_MESSAGE_LIMIT`) bounds
  worst-case storage/context growth for one conversation.
- An exact-answer cache (`resource_agent_answer_cache`, keyed by
  `resource_id + source_hash + sha256(normalized question)`) skips
  OpenAI entirely for a repeated question against unchanged content —
  `PARTIAL` answers are deliberately never cached, since they reflect
  incomplete evidence that a later, better search might improve on.
- An `Idempotency-Key` (client-supplied or generated) makes retried
  submissions replay the stored answer instead of billing twice; a
  partial unique index on `(session_id, role, idempotency_key)` makes
  the claim atomic under concurrent duplicate requests.
- `AI_AGENT_MAX_OUTPUT_TOKENS`, `AI_AGENT_MAX_TOOL_CALLS`,
  `AI_AGENT_MAX_CHUNKS_PER_SEARCH`, and `AI_AGENT_MAX_CHUNK_CHARACTERS`
  all bound a single turn's worst-case OpenAI spend.

**Citation and answer validation (defense in depth, same pattern as
Phase 1).** The JSON Schema handed to OpenAI's Structured Outputs
constrains the shape the model can return; `agentAnswerSchema` (Zod)
independently re-validates the parsed JSON; and — the part unique to
the agent — every citation's `chunkId` is checked against a ledger of
chunk IDs actually returned by tool calls *during that specific turn*.
A well-formed but invented `chunkId` is silently dropped rather than
trusted, since Structured Outputs alone cannot guarantee the model
didn't fabricate an ID that merely looks valid.

**Prompt-injection posture.** Same posture as Phase 1: resource
content reached via tool results is data, never instructions, and the
static system prompt explicitly tells the model to ignore any
instruction-like text found inside it. Tested with adversarial chunk
content ("ignore previous instructions...") in the integration suite.

**Known limitations.** Citations point at chunk IDs/page numbers, not
exact character offsets, so "click to jump to this exact sentence" is
not implemented — only "read this chunk's excerpt". Image-only and
scanned/OCR'd-PDF resources are not supported (the agent is gated on
Phase 1 already having produced a `READY` summary, and Phase 1 itself
reports those as `UNSUPPORTED`). Answers are only as good as the
underlying chunked text and full-text search ranking — the agent does
not re-read the entire document per question the way a human would.

**Security.** Session ownership is checked on every read/write
(`AGENT_SESSION_FORBIDDEN`/`AGENT_SESSION_NOT_FOUND`); the
resource/source-hash pair is resolved server-side from the
authenticated request on every turn, never accepted as model or client
input, so one user's conversation can never leak another user's
resource or another resource's chunks. `OPENAI_API_KEY` is reused from
Phase 1's config (never a second key), read only server-side, never
logged, never returned in a response.

## Multi-file resources and AI source selection

A resource can hold several uploaded files (Milestone 3's
`resource_files`, one-to-many from the start). Both AI features —
Summary and Agent — always analyze exactly **one** explicitly resolved
file (or the text-only title+description); a multi-file resource is
never summarized/searched across all its files at once.

**Resolution (`resourceSourceSelectionService` +
`resourceSummaryService.resolveSource`)**, given a resource and an
optional client-supplied `resourceFileId`:

1. An explicit `resourceFileId` wins outright, once validated against
   that resource's own file list — must exist there and be READY
   (`AI_SOURCE_FILE_NOT_FOUND` 404 / `AI_SOURCE_FILE_NOT_READY` 409
   otherwise). A caller that has already shown the user a specific file
   is never silently overridden.
2. Otherwise, a resource with exactly one READY file uses it
   automatically (unchanged from the original single-file design).
3. Otherwise, among several READY files, the **recommended** one is
   used: MIME-priority order — text-based PDF, then DOCX, then a plain
   text file (not currently an uploadable type, kept for
   forward-compatibility), then a supported PNG/JPEG image, then any
   other AI-supported type; ties break by upload order (`created_at`
   ascending). This is a pure MIME-type decision — **no file is ever
   opened or sent to OpenAI merely to compute a recommendation**, and it
   is never repeated per ordinary GET request beyond one extra indexed
   query for the file list already needed anyway.
4. No READY file at all → the text-only title+description source,
   unchanged from Phase 1.

**Why this is safe to cache identically to the single-file design.**
The existing `resource_ai_summaries` unique index
(`resource_id, source_hash`, migration 032) was already safe for
multiple files without any migration: `source_hash` for a file-backed
source is that file's own SHA-256 checksum, computed once at
upload-confirm time and never mutated afterward (a changed file is
always a brand-new `resource_files` row with its own id and checksum,
never an in-place edit) — so two different files on the same resource
essentially always produce two different `source_hash` values and
therefore two independent cache rows, keyed correctly without any
schema change. `resource_file_id` was already stored on every summary
row for reference; only `resource_agent_sessions` needed a new nullable
`resource_file_id` column (migration 034) so a session can re-resolve
the *exact* file it was bound to on every later action, rather than
re-deriving a possibly-different "recommended" default each time.

**Agent session binding.** `getOrCreateSession` resolves the source
(as above) and stores the chosen `resourceFileId` (or `null`, for
text-only) on the new session row. Every later action against that
session (`listMessages`, `askQuestion`) re-resolves the source using
the *session's own stored* `resourceFileId` — never a freshly-derived
default — so a conversation on a deliberately non-recommended file (the
user picked the DOCX over the recommended PDF) is never mistaken for
stale just because the recommendation would differ today. Selecting a
different file while a session is ACTIVE clears that old session
(`status = 'CLEARED'`) and starts a fresh one bound to the new
selection — sessions are never mutated in place to point at a different
file's content, and at most one session per (user, resource) is ACTIVE
at a time.

**API surface.** `resourceFileId` is an optional query param (GET) or
body field (POST) on every AI Summary and Agent endpoint that resolves
a source — see `docs/api.md`. The frontend threads it through
TanStack Query's key on every affected hook (`useResourceSummary`,
`useGenerateResourceSummary`, `useDownloadResourceSummary`,
`useAgentSession`, `useAgentSuggestions`), so selecting a different file
is a distinct cache entry, never a patch onto the previous selection's
cached status/messages.

**Cost controls preserved.** Everything Phase 1/2 already guaranteed
still holds per-selected-file: no OpenAI call from a GET, from
computing the recommendation, or from changing which file is selected;
one cached summary per file checksum, reused across users and across
repeated views/downloads; the daily/session limits and idempotency
protection are unchanged (they were never file-scoped to begin with —
they bound a user's or a session's total question volume, which still
applies exactly the same way regardless of which file a given question
targets).

## What's deferred

Milestones 2–8 (taxonomy CRUD, resources/files, search, forum,
notifications/admin moderation, tutoring, recommendations) are staged
in `docs/implementation-plan.md` with their target file layout already
reserved in the directory tree, but not yet implemented. See that file
for the exact next vertical slice.
