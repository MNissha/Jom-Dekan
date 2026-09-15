# JomDekan — API Reference (Milestone 0/1 scope)

Full interactive docs (Swagger/OpenAPI, generated from JSDoc comments
in `backend/src/routes/*.ts`) are served at
`http://localhost:3000/api/v1/docs` in development. This file is a
plain-text summary for quick reference; keep it in sync as routes are
added.

Base URL: `/api/v1`

## Error shape (all endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "email", "message": "Enter a valid email." }],
    "requestId": "req_..."
  }
}
```

Status codes: `400` validation, `401` unauthenticated, `403`
forbidden, `404` not found / concealed, `409` conflict, `429` rate
limited, `500` internal.

## System

| Method | Path            | Auth | Description                          |
|--------|-----------------|------|---------------------------------------|
| GET    | `/health`       | none | Basic liveness                        |
| GET    | `/health/live`  | none | Liveness probe                        |
| GET    | `/health/ready` | none | Readiness (checks DB connectivity)    |
| GET    | `/version`      | none | API version                           |

## Auth

| Method | Path                    | Auth        | Description |
|--------|-------------------------|-------------|-------------|
| POST   | `/api/v1/auth/register` | none        | Create a `USER` account. Body: `{ email, password, displayName }`. Rate-limited. Rejects unknown fields (e.g. `role`). |
| POST   | `/api/v1/auth/login`    | none        | Body: `{ email, password }`. Rate-limited. `401` on any mismatch (never reveals which field). |
| POST   | `/api/v1/auth/refresh`  | refresh cookie | Rotates the refresh token, returns a new access token + user. |
| POST   | `/api/v1/auth/logout`   | refresh cookie (optional) | Revokes the current session. Idempotent. |
| GET    | `/api/v1/auth/me`       | Bearer access token | Returns the current user. |

### Response shapes

`POST /auth/register`, `POST /auth/login` → `201`/`200`:
```json
{
  "message": "...",
  "user": { "id": "uuid", "email": "student@example.com", "role": "USER", "createdAt": "..." },
  "accessToken": "eyJ..."
}
```
A `Set-Cookie` header also carries the HttpOnly refresh token
(`jomdekan_rt`, path `/api/v1/auth`) — never present in the JSON body.

`POST /auth/refresh` → `200`:
```json
{ "user": { ... }, "accessToken": "eyJ..." }
```

`GET /auth/me` → `200`:
```json
{ "user": { "id": "uuid", "email": "...", "role": "USER", "createdAt": "..." } }
```

## Resource list file-type badges

`GET /api/v1/resources` (and any other endpoint returning a resource
list item — e.g. `mine=true`) includes, per resource, an aggregation
over every READY file (not just the first upload):

```json
{ "readyFileId": "uuid|null", "readyFileMimeType": "string|null",
  "readyFileCount": 3, "readyFileTypes": ["PDF"], "fileTypeDisplay": "PDF" }
```

`fileTypeDisplay` is `"TEXT"` for a resource with no READY file, the
single normalized type (`PDF`/`DOCX`/`PPTX`/`XLSX`/`PNG`/`JPEG`) for one
or more READY files that all share a type, or `"MULTI-FILE"` when they
don't — the frontend appends `· N files` itself when `readyFileCount >
1`. PENDING/FAILED files never affect this. `readyFileCount`/
`readyFileTypes`/`fileTypeDisplay` are optional in the response type so
older cached list data (missing these fields) still renders sensibly
via a legacy single-file fallback.

## AI Resource Summaries (Phase 1)

AI-generated study-note summaries for a resource's uploaded file (PDF,
DOCX, PNG, JPEG) or, for a text-only resource, its title+description.
Backend-only OpenAI integration — see `docs/architecture.md` for the
caching/cost-control design and `docs/setup.md` for environment
variables and how to enable/disable the feature.

| Method | Path                                              | Auth | Description |
|--------|---------------------------------------------------|------|-------------|
| GET    | `/api/v1/resources/:resourceId/ai-summary?resourceFileId=<uuid>`         | Bearer | Current cached summary/status for this resource (and, for a multi-file resource, its source-selection options). **Never calls OpenAI.** |
| POST   | `/api/v1/resources/:resourceId/ai-summary`         | Bearer | Generate (or reuse the cached) summary for the selected file. Body: `{ "resourceFileId"?: "uuid" }`. Enforces the daily per-user limit and READY-resource/visibility rules. |
| GET    | `/api/v1/resources/:resourceId/ai-summary/download?format=pdf\|docx&resourceFileId=<uuid>` | Bearer | Download the cached summary (for the selected file) as a generated PDF or DOCX. Requires an existing READY summary for that exact selection. **Never calls OpenAI.** |

`resourceFileId` is optional everywhere above. Omitted, the backend
picks a source deterministically: the resource's only READY file when
there's exactly one, or — for a resource with several READY files —
the highest-priority *supported* one (see "AI source selection" in
`docs/architecture.md`), never an arbitrary/ambiguous choice. When
supplied, it must be a READY file belonging to this exact resource
(`AI_SOURCE_FILE_NOT_FOUND` / `AI_SOURCE_FILE_NOT_READY` otherwise) —
the frontend never needs to know or send a checksum.

`GET`/`POST` response shape:
```json
{
  "data": {
    "status": "NOT_GENERATED | PROCESSING | READY | FAILED | UNSUPPORTED | DISABLED",
    "sourceType": "TEXT_RESOURCE | EXTRACTED_DOCUMENT | IMAGE",
    "summary": {
      "overview": "string",
      "keyPoints": ["string"],
      "studySections": [{ "heading": "string", "content": "string" }],
      "topics": ["string"],
      "glossary": [{ "term": "string", "definition": "string" }],
      "limitations": ["string"],
      "language": "string"
    },
    "model": "gpt-5.6-luna",
    "errorCode": "string | null",
    "errorMessage": "string | null",
    "generatedAt": "ISO 8601 | null",
    "updatedAt": "ISO 8601 | null",
    "selectedSource": { "resourceFileId": "uuid", "filename": "string", "fileType": "PDF", "supported": true } ,
    "availableSources": [
      { "resourceFileId": "uuid", "filename": "string", "fileType": "PDF", "supported": true, "recommended": true }
    ]
  }
}
```
`summary` is only present when `status` is `READY`. `errorCode`/`errorMessage`
are sanitized — never the raw OpenAI error. `selectedSource` is `null`
and `availableSources` is `[]` for a text-only resource (nothing to
choose between). Neither field ever includes a storage key or checksum.

Error codes worth branching on: `AI_SUMMARY_DISABLED` (403),
`AI_SUMMARY_DAILY_LIMIT_REACHED` (429), `AI_SUMMARY_GENERATION_FAILED`
(502, OpenAI request/response failure — the row itself is marked
`FAILED` and a later retry is allowed), `CONFLICT` (409, a generation
for the same resource/content is already in progress).

`errorCode` values seen on an `UNSUPPORTED` status: `UNSUPPORTED_MIME_TYPE`,
`INSUFFICIENT_CONTENT`, `IMAGE_TOO_LARGE`, `AI_INSUFFICIENT_CONTENT` (the
model itself found nothing summarizable).

The download endpoint returns the file as an `attachment` with
`Content-Type: application/pdf` or
`.../wordprocessingml.document`, `X-Content-Type-Options: nosniff`,
and a sanitized filename (`JomDekan-{resource-title}-AI-Summary.pdf`).

## Ask This Resource (Phase 2 agent)

A resource-grounded, read-only conversational agent. It answers
questions about one specific resource by calling bounded tools that
search/read that resource's own chunked text and its cached Phase 1
summary — it never browses the web, never uses a vector DB, and can
never write anything back to the resource. See
`docs/architecture.md`'s dedicated section for the tool-calling loop,
chunking, and cost-control design.

A resource must already have a `READY` Phase 1 AI summary
(`POST /api/v1/resources/:resourceId/ai-summary`) before a session can
be created — otherwise session creation fails with
`AGENT_UNSUPPORTED_SOURCE` (409).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/v1/resources/:resourceId/agent/sessions` | Bearer | Get or create the caller's own session for this resource+file. Body: `{ "resourceFileId"?: "uuid" }`. **Never calls OpenAI.** |
| GET    | `/api/v1/resources/:resourceId/agent/sessions/:sessionId/messages` | Bearer | Paginated conversation history. **Never calls OpenAI.** |
| POST   | `/api/v1/resources/:resourceId/agent/sessions/:sessionId/messages` | Bearer | Ask a question; returns the assistant's structured answer. |
| DELETE | `/api/v1/resources/:resourceId/agent/sessions/:sessionId` | Bearer | Clear (soft-delete) the caller's own conversation. **Never calls OpenAI.** |
| GET    | `/api/v1/resources/:resourceId/agent/suggestions?resourceFileId=<uuid>` | Bearer | Deterministic starter questions derived from the cached Phase 1 summary. **Never calls OpenAI.** |

`resourceFileId` follows the same rules as the AI Summary endpoints
above — optional, validated against this exact resource, must be
READY. A session created for one file is bound to it: `resourceFileId`
is stored on the session row and used to re-resolve that same source on
every later action against that session (message list, ask, clear) —
the caller never has to keep resending it. Creating a new session for a
*different* file automatically clears the caller's previous ACTIVE
session for this resource (see "Ask This Resource" in
`docs/architecture.md`).

`POST /agent/sessions` → `200`:
```json
{ "data": { "session": { "id": "uuid", "resourceId": "uuid", "resourceFileId": "uuid|null", "status": "ACTIVE", "title": "string|null", "createdAt": "...", "updatedAt": "..." }, "sourceChanged": false } }
```
`sourceChanged: true` means the resource's content (or the selected
file) changed since the caller's previous session and a fresh one was
started — the frontend uses this to show a "this resource has changed"
banner.

`GET /agent/.../messages` → `200`:
```json
{
  "data": [
    { "id": "uuid", "role": "USER | ASSISTANT", "content": "string",
      "citations": [{ "chunkId": "uuid", "pageNumber": 3, "sectionTitle": "string|null",
                       "sourceLabel": "string", "supportingExcerpt": "string" }],
      "suggestedQuestions": ["string"], "createdAt": "..." }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 4 },
  "session": { "...": "as above" },
  "sourceChanged": false
}
```

`POST /agent/.../messages` request body: `{ "question": "string (1–1000 chars)", "idempotencyKey": "string (optional)" }`.
An `Idempotency-Key` header is equivalent and takes precedence over
the body field if both are sent — retrying the same key returns the
original answer without a second OpenAI call. Response → `200`:
returns a single message object shaped like one entry of the messages
array above, with `role: "ASSISTANT"`.

Internally the model classifies each answer as `ANSWERED`, `PARTIAL`
(some but not complete evidence found — never cached), or `NOT_FOUND`
(nothing relevant in this resource — citations always empty); this
status itself is not returned in the API response, it only governs
server-side caching and citation filtering. Every citation's
`chunkId` is guaranteed to correspond to a chunk actually returned by
a tool call during that same turn; the model cannot fabricate one.

`GET /agent/suggestions` → `200`: `{ "data": { "suggestions": ["string", ...] } }` (0–5 items).

Error codes worth branching on: `AI_AGENT_DISABLED` (403),
`AGENT_UNSUPPORTED_SOURCE` (409, no READY Phase 1 summary yet, or the
resource's content type isn't supported), `AGENT_SESSION_NOT_FOUND`
(404), `AGENT_SESSION_FORBIDDEN` (403, not the session owner),
`AGENT_SESSION_STALE` (409, the resource changed or the session was
cleared — start a new session), `AGENT_QUESTION_TOO_LONG` (400),
`AGENT_REQUEST_IN_PROGRESS` (409, a concurrent request with the same
idempotency key is still being answered), `AGENT_SESSION_LIMIT_REACHED`
/ `AGENT_DAILY_LIMIT_REACHED` (429), `AGENT_PROVIDER_UNAVAILABLE` /
`AGENT_RESPONSE_INVALID` (502, sanitized — never the raw OpenAI
error).

## Long-term endpoint catalogue

The build prompt references a `Pasted markdown(7).md` REST endpoint
catalogue as the long-term authority for route names and
implementation order across all milestones. That file was not
provided in this session's attachments — only the architecture guide
skill and the system-proposal PDF were available. Milestone 0/1 routes
above were designed directly from the proposal PDF's role/permission
and system-flow sections instead. **Before implementing Milestone 2
onward, obtain that endpoint catalogue (or confirm route names with
the team) so naming stays consistent with the long-term plan** — see
`docs/requirements-traceability.md` for the same caveat.
