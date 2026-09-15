# JomDekan — Implementation Plan

Status as of this session. Milestones follow the build prompt's
implementation order exactly.

## Milestone 0 — Foundation — ✅ DONE

- Repository structure (`backend/`, `frontend/`, `database/`, `docs/`)
  matching the Architecture Guide skill, adapted for JomDekan.
- Express app: typed env validation (Zod, fails fast at startup),
  request IDs, pino structured logging with secret redaction, CORS
  (explicit origins), Helmet + CSP, compression, cookie parsing,
  global + auth-specific rate limiting, consistent JSON error shape.
- `GET /health`, `/health/live`, `/health/ready` (checks DB), `/version`.
- Swagger/OpenAPI at `/api/v1/docs` (dev only).
- PostgreSQL connection pool (`pg`), migration runner
  (`npm run migrate`), seed runner (`npm run seed`).
- React + TypeScript + Vite shell: React Router, Tailwind (JomDekan
  palette), TanStack Query provider, Zustand store, Axios instance
  with interceptors.
- Testing scaffolding: Jest + Supertest (backend), Vitest + React
  Testing Library (frontend), Playwright config (frontend E2E).
- Docker Compose (Postgres + Redis) for local dev.
- GitHub Actions CI (lint, typecheck, test, build — both packages).

## Milestone 1 — Authentication and profiles — ✅ CORE SLICE DONE

Implemented:

- `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`,
  `GET /me`.
- bcrypt (cost 12) password hashing; passwords never logged or
  returned.
- Case-insensitive unique email (Postgres `citext`).
- Short-lived access JWT (body only) + rotated, hashed refresh-token
  sessions in HttpOnly/Secure/SameSite=Strict cookies; reuse detection
  revokes the session family.
- `USER`/`ADMIN` roles; public registration can never set `role`
  (Zod `.strict()` schema rejects the field outright).
- `authenticate` / `authorize(...)` / `optionalAuthenticate`
  middleware; `ProtectedRoute` on the frontend.
- Audit log entries for register/login.
- `scripts/createAdmin.ts` — the only path to the first ADMIN account.
- Frontend: Login/Register pages (React Hook Form + Zod), silent
  session bootstrap on load, Dashboard shell behind `ProtectedRoute`.
- Tests: Zod validator unit tests; Supertest integration tests
  (register/duplicate/login/wrong-password/me/unknown-field-rejection).

Not yet implemented (explicitly out of this slice, tracked here so
they aren't lost):

- Email verification send/confirm flow (`email_verification_tokens`
  table exists; no endpoint yet).
- Forgot/reset password flow (`password_reset_tokens` table exists;
  no endpoint yet — must return a generic response regardless of
  whether the email exists, per the prompt's requirement).
- Avatar upload (depends on Milestone 3's storage adapter).
- Academic onboarding fields on `user_profiles` (university/programme
  pickers) — needs Milestone 2's taxonomy endpoints first.
- Google OAuth/OIDC (explicitly deferred until password auth is
  stable, per the prompt).
- CSRF token middleware — current design relies on `SameSite=Strict` +
  bearer-header access tokens (see `docs/architecture.md`); revisit if
  any state-changing endpoint becomes cookie-only.

## Milestone 2 — Academic taxonomy — NOT STARTED

Tables already exist (`universities`, `faculties`, `programmes`,
`subjects`, `programme_subjects`) with seed examples (UiTM, Computer
Science, Law, CSC510). Needed: admin CRUD routes/services/controllers,
public read-only browse endpoints, frontend pickers for onboarding.

## Milestone 3 — Resources and secure files — NOT STARTED

Needs: `resources`, `resource_files`, `resource_questions`,
`resource_answers`, `tags`/`resource_tags` migration
(`002_create_resources.sql`); real `StorageAdapter` implementation
(S3/R2/Supabase Storage) behind `backend/src/config/config/storage.ts`;
upload-intent → client upload → confirm → scan-stub → ready flow;
signed download URLs.

## Milestone 4 — Search, filters, favorites, collections — NOT STARTED

Needs Milestone 3 data. Postgres full-text (`tsvector` + GIN) and
trigram search; server-side pagination (`data` + `meta`); URL-encoded
filter state on the frontend.

## Milestone 5 — Questions, answers, forum — NOT STARTED

Needs `003_create_community.sql` (forum_posts/comments/votes/follows).

## Milestone 6 — Notifications and admin moderation — NOT STARTED

Needs `004_create_moderation_and_events.sql`
(reports/moderation_actions/notifications); Redis/BullMQ wiring
(`config/redis.ts` currently a placeholder); email adapter beyond the
`console` stub.

## Milestone 7 — Tutor and opportunity extension — NOT STARTED

## Milestone 8 — Responsible recommendation extension — NOT STARTED

## AI Resource Summaries — Phase 1 — ✅ DONE

Additive feature on top of Milestone 3's resource model — see
`docs/architecture.md`'s dedicated section and `docs/api.md`'s
"AI Resource Summaries" section.

Implemented:

- `GET`/`POST /api/v1/resources/:resourceId/ai-summary`,
  `GET /api/v1/resources/:resourceId/ai-summary/download?format=pdf|docx`.
- OpenAI Responses API integration (Structured Outputs + Zod
  re-validation), backend-only, model/limits fully configurable via env.
- Text extraction for PDF (`pdf-parse`) and DOCX (`mammoth`); direct
  multimodal image summarization for PNG/JPEG (no separate
  transcription call); text-only resources summarized from
  title+description with a short-content-aware prompt tier.
- PostgreSQL-backed caching keyed by source hash (migration 032,
  `resource_ai_summaries`), atomic duplicate-generation protection, a
  per-user daily generation limit, and safe FAILED/UNSUPPORTED error
  mapping (never a raw OpenAI error to the client).
- Deterministic PDF (`pdfkit`) and DOCX (`docx`) study-note generation
  from the cached JSON — brand-styled, downloads never call OpenAI.
- Frontend `AiSummarySection` on the resource-detail page covering all
  documented states (NOT_GENERATED/PROCESSING/READY/FAILED/UNSUPPORTED/
  DISABLED) plus PDF/DOCX download buttons.
- Backend: 4 test files (unit: text extraction, OpenAI request/response
  mapping, PDF/DOCX rendering; integration: the full API against a real
  Postgres with OpenAI mocked). Frontend: `AiSummarySection.test.tsx`.

Not in Phase 1 scope (explicitly deferred by the feature spec):

- The conversational "Ask This Resource" agent (Phase 2) — Phase 1 only
  builds the foundation (cached, validated structured summaries) it
  will read from.
- XLSX/PPTX and scanned/OCR'd PDFs are reported as unsupported rather
  than summarized.
- A resource with multiple files originally summarized only the first
  READY file (upload order) — not all of them; superseded by explicit,
  recommendation-based source selection, see below.

## Ask This Resource — Phase 2 — ✅ DONE

Resource-grounded conversational agent built on top of Phase 1 — see
`docs/architecture.md`'s dedicated section and `docs/api.md`'s
"Ask This Resource" section.

Implemented:

- `POST /api/v1/resources/:resourceId/agent/sessions`,
  `GET`/`POST /api/v1/resources/:resourceId/agent/sessions/:sessionId/messages`,
  `DELETE /api/v1/resources/:resourceId/agent/sessions/:sessionId`,
  `GET /api/v1/resources/:resourceId/agent/suggestions`.
- OpenAI Responses API tool-calling loop (`openaiAgentService`) with 3
  strict, read-only function tools (`get_current_resource_summary`,
  `search_current_resource`, `read_current_resource_sections`) — no
  web search, no hosted File Search, no vector DB.
- PostgreSQL full-text search over heading-aware resource chunks
  (migration 033, `resource_ai_chunks`, generated `tsvector` + GIN
  index), built lazily and cached by source hash, reusing Phase 1's
  text extraction.
- Conversation persistence in JomDekan's own database
  (`resource_agent_sessions`, `resource_agent_messages`) —
  `previous_response_id` is never used; bounded context window
  (`AI_AGENT_CONTEXT_TURNS`) resent per turn.
- Cost controls: per-user daily limit and per-session message cap
  (both excluding cache hits/replays from the count), exact-answer
  cache keyed by resource+source-hash+normalized-question,
  idempotency-key replay for retried submissions, and hard caps on
  output tokens/tool calls/chunk sizes.
- Citation validation against a per-turn tool-execution ledger — a
  well-formed but invented `chunkId` from the model is dropped rather
  than trusted.
- Frontend `ResourceAgentChat` on the resource-detail page: session
  bootstrap, suggested starter questions, optimistic user bubble,
  citation chips with expandable excerpts, NOT_FOUND/PARTIAL states,
  daily-limit messaging, stale-source banner, clear-conversation
  action.
- Backend: 3 test files (unit: chunking algorithm against string
  fixtures, OpenAI request/response mapping against a mocked `openai`
  SDK; integration: the full API against a real Postgres with both
  `openaiSummaryService` and `openaiAgentService` mocked — including
  prompt-injection, cross-user isolation, and cost-control scenarios).
  Frontend: originally `ResourceAgentChat.test.tsx`, superseded by
  `ResourceAgentPanel.test.tsx` once the agent moved into the right-side
  panel (see below).

Not in Phase 2 scope (explicitly deferred by the feature spec):

- Character-offset-precise citations (chunk/page-level only).
- Image-only and scanned/OCR'd-PDF resources (inherits Phase 1's
  `UNSUPPORTED` gating — the agent requires a READY Phase 1 summary).
- Any tool capable of writing to a resource, moderating content, or
  browsing the web.

## Ask This Resource — right-side panel redesign — ✅ DONE

Replaced the always-inline agent conversation with a browser-extension-
style panel sliding in from the right, without changing any backend
API. New: `ResourceAgentPanel.tsx` (portal-rendered, focus/Escape/mobile-
scroll-lock management, lazy session fetch on first open),
`ResourceAgentHeader.tsx`, `ResourceAgentSummaryContext.tsx`,
`ResourceAgentConversation.tsx`, `ResourceAgentMessage.tsx`,
`ResourceAgentComposer.tsx`. `AiSummarySection.tsx` gained the "Ask AI
about this resource" launcher button. Fixed two real bugs found in the
process: a `??`-based staleness check that could let a `false` mask a
real `true`, and a missing `Idempotency-Key` entry in the backend's CORS
`allowedHeaders` that silently blocked the ask-question request in a
real browser (preflight-only failure, invisible to any non-browser
test). Tests: `ResourceAgentPanel.test.tsx` (25 cases).

## Multi-file resources: badges, file list, and AI source selection — ✅ DONE

Resources can already hold multiple uploaded files (Milestone 3). This
slice makes that explicit and deterministic wherever it previously
wasn't:

- Resource-card badge aggregates every READY file
  (`readyFileCount`/`readyFileTypes`/`fileTypeDisplay` in
  `resourceModel.list`'s response) — `TEXT` / a single normalized type /
  `TYPE · N files` / `MULTI-FILE · N files`, computed via one aggregate
  LATERAL join (no N+1).
- Resource-detail page gained `ResourceFileList.tsx` — every READY
  file's icon, normalized type, size, and an authenticated download
  button, reusing the existing `useDownloadUrl` hook.
- AI Summary and Ask This Resource now share one explicit,
  server-validated source selection (`resourceSourceSelectionService`):
  an optional `resourceFileId` on every affected endpoint, a
  deterministic MIME-priority recommendation for a resource with several
  READY files (never all of them, never an OpenAI call to decide), and
  an accessible radio-group selector (`AiSourceSelector.tsx`) shown only
  when there's a genuine choice to make.
- No new migration was needed for `resource_ai_summaries`' cache safety
  (its existing `(resource_id, source_hash)` uniqueness was already
  file-content-scoped); migration 034 added a nullable
  `resource_file_id` column to `resource_agent_sessions` so a session
  re-resolves the exact file it was created for, not a possibly-
  different "recommended" default, on every later action.
- Tests: `resourceMultiFileSource.test.ts` (21 backend integration
  cases — badges, recommendation/tie-breaking, selection validation,
  per-file cache isolation, concurrent-generation protection, download
  binding, and agent session/chunk isolation across files) plus
  `fileTypeBadge.test.ts`, `ResourceFileList.test.tsx`,
  `AiSourceSelector.test.tsx`, and new cases in `AiSummarySection.test.tsx`.

---

## Exact next vertical slice (continue here)

**Milestone 1 completion — password reset flow**, because it's the
highest-risk remaining auth gap (account-recovery is a common attack
surface) and it's self-contained:

1. `password_reset_tokens` table already exists (migration 001) —
   confirm indexes are sufficient once request volume is known.
2. `POST /api/v1/auth/forgot-password` — always returns a generic
   "if that email exists, we sent a link" response; internally: find
   user by email, if found generate a random token, store its SHA-256
   hash + expiry, queue/console-log the email (using
   `EMAIL_PROVIDER=console` for now).
3. `POST /api/v1/auth/reset-password` — validates the token hash +
   expiry + unused, hashes and sets the new password, marks the token
   used, revokes all existing sessions for that user (force re-login
   everywhere).
4. Zod validators, Supertest coverage (valid token, expired token,
   reused token, non-existent email still returns 200).
5. Frontend `ForgotPassword.tsx` / `ResetPassword.tsx` pages + service
   methods + hook.
6. Update this file and `docs/requirements-traceability.md`.

After that: Milestone 2 (taxonomy CRUD), unblocking real onboarding
and, later, Milestone 3's resource metadata.

## Continuation prompt

```text
Continue building JomDekan in the existing repository. Before editing, invoke and read the Project Structure and Architecture Guide Claude Skill, then read README.md, docs/implementation-plan.md, docs/requirements-traceability.md, the JomDekan proposal PDF, and the endpoint Markdown. Inspect the repository and git diff, and run relevant verification commands. Confirm that the project still uses the mandatory frontend/, backend/, and database/ structure and the flow React component → hook → frontend service → Axios → Express route → middleware → controller → service → model → PostgreSQL. Resume the first incomplete vertical slice. Preserve completed and unrelated work. Implement it end-to-end with SQL, backend, frontend, authorization, tests, Swagger, and docs. Fix failures before proceeding. Keep future features outside the MVP until the core definition of done passes. End with changed files, migration notes, commands/results, manual test steps, limitations, and the next slice.
```
