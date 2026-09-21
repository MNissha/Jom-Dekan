# JomDekan — Setup Guide (beginner-friendly)

This walks through running JomDekan on your own machine from a clean
checkout. It assumes no prior knowledge of this specific project.

## 1. Software you need

- **Node.js 20+** and **npm** — check with `node -v` (should print
  `v20.x` or newer).
- **PostgreSQL 16** — either installed locally, or via Docker (see
  step 2).
- **Docker Desktop** (optional but recommended) — makes step 2 a
  single command.
- **Git**.

## 2. Choose how to run the stack

### Option A: run everything in Docker

From the repository root, optionally copy the Docker environment
template and add your own development secrets/OpenAI key:

```bash
cp .env.docker.example .env
docker compose up --build -d
```

This starts the frontend on `http://localhost:5173`, the backend on
`http://localhost:3000`, PostgreSQL on `localhost:5432`, and Redis on
`localhost:6379`. The backend waits for PostgreSQL, applies pending
migrations, and then starts automatically. Follow logs with
`docker compose logs -f backend frontend`.

When using this option, skip steps 3 and 4 below unless you need to
run a one-off command. You can seed the container database with:

```bash
docker compose exec backend npm run seed
```

### Option B: run Node locally and infrastructure in Docker

From the repository root:

```bash
docker compose up -d postgres redis
```

This starts only Postgres on `localhost:5432` (user `postgres`, password
`postgres`, database `jomdekan`) and Redis on `localhost:6379`. Continue
with steps 3 and 4 to run the backend and frontend directly with Node.

Don't have Docker? Install PostgreSQL 16 yourself and create a
database:

```bash
createdb jomdekan
```

## 3. Backend: install, configure, migrate, seed

```bash
cd backend
cp .env.example .env
npm install
npm run migrate   # applies database/migrations/*.sql
npm run seed      # optional: sample universities/subjects for local testing
```

Open `.env` and adjust values if your Postgres isn't using the
defaults above. At minimum, set real random values for
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` — e.g.:

```bash
openssl rand -hex 32
```

Start the API:

```bash
npm run dev
```

You should see `JomDekan API listening on port 3000 (development)`.
Visit `http://localhost:3000/api/v1/docs` for interactive Swagger
docs, or `http://localhost:3000/health` for a quick liveness check.

## 4. Frontend: install, configure, run

In a **second terminal**:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173`. You should see the JomDekan landing
page. Register an account — it logs you straight into a dashboard
shell.

## 5. Create the first admin account

Public registration can never create an `ADMIN` — this is
intentional. To promote an account you've already registered:

```bash
cd backend
npm run create-admin -- --email you@example.com
```

## 6. AI Resource Summaries (optional)

The AI Study Summary feature (resource detail page) calls OpenAI's
Responses API on the backend only. It works out of the box with
`.env.example`'s defaults **except** it needs a real `OPENAI_API_KEY`
to actually reach OpenAI — without one, generation attempts fail
safely (a `FAILED` status with a generic error message and a working
Retry button), which is a perfectly fine way to develop/demo the
feature's UI without spending any API credit.

```bash
# backend/.env
OPENAI_API_KEY=sk-...              # leave blank/fake to develop without spending credit
OPENAI_SUMMARY_MODEL=gpt-5.6-luna
OPENAI_SUMMARY_MAX_OUTPUT_TOKENS=4000        # 1000 truncates real multi-page documents mid-JSON
AI_SUMMARY_ENABLED=true            # false disables the feature everywhere (GET shows "DISABLED", POST returns 403)
AI_SUMMARY_MAX_INPUT_CHARACTERS=80000
AI_SUMMARY_DAILY_USER_LIMIT=10     # per user, per calendar day — only counts attempts that reach OpenAI
AI_SUMMARY_MAX_IMAGE_SIZE_BYTES=5242880
```

To try the full READY state (rendered summary + PDF/DOCX downloads)
without a real key, generate a resource + summary as usual (it will
land on `FAILED`), then insert a fake `READY` row directly:

```sql
-- source_hash must match resourceTextExtractionService.hashTextResource(title, description)
-- for a text-only resource, or the file's checksum_sha256 for a file-based one.
UPDATE resource_ai_summaries
SET status = 'READY',
    content = '{"overview":"...","keyPoints":["..."],"studySections":[],"topics":[],"glossary":[],"limitations":[],"language":"English"}'::jsonb
WHERE resource_id = '<uuid>';
```

Downloading (PDF/DOCX) and re-viewing a `READY` summary never call
OpenAI, regardless of how it got there — see `docs/architecture.md`.

Automated tests never touch the real OpenAI SDK — see "Running tests
and builds" below and `backend/tests/integration/resourceAiSummary.test.ts`,
which mocks `openaiSummaryService.generateStructuredSummary` directly.

## 7. Ask This Resource (optional, needs an AI summary first)

The "Ask This Resource" chat (also on the resource detail page) reuses
`OPENAI_API_KEY` — there is no second key to configure. It only
activates once that resource has a `READY` Phase 1 AI summary (see
step 6); until then, opening the chat shows a "generate the AI summary
first" message rather than an error.

```bash
# backend/.env
AI_AGENT_ENABLED=true              # false disables the feature everywhere (403 on every route)
OPENAI_AGENT_MODEL=                # leave blank to reuse OPENAI_SUMMARY_MODEL — never a second model config to keep in sync
AI_AGENT_MAX_OUTPUT_TOKENS=600
AI_AGENT_MAX_TOOL_CALLS=2          # read-only search/read calls allowed per question
AI_AGENT_MAX_CHUNKS_PER_SEARCH=5
AI_AGENT_MAX_CHUNK_CHARACTERS=1500
AI_AGENT_CONTEXT_TURNS=4           # recent Q&A pairs resent as context per question
AI_AGENT_DAILY_USER_LIMIT=10       # per user, per calendar day — cache hits/replays don't count
AI_AGENT_SESSION_MESSAGE_LIMIT=30  # per conversation, user+assistant combined
AI_AGENT_MAX_QUESTION_CHARACTERS=1000
AI_AGENT_SESSION_EXPIRY_DAYS=30    # idle sessions beyond this are treated as expired and replaced
```

To pick a different OpenAI model, set `OPENAI_AGENT_MODEL` (any model
your OpenAI project has access to that supports the Responses API,
Structured Outputs, and function tools) — no code changes needed. To
turn the feature off entirely (e.g. to guarantee zero OpenAI spend in
a shared/demo environment), set `AI_AGENT_ENABLED=false`; every agent
route then returns `403 AI_AGENT_DISABLED` immediately, before any
database or OpenAI call.

**Automated tests never call the real OpenAI API.** Unit tests
(`backend/tests/unit/openaiAgentService.test.ts`,
`resourceChunkService.test.ts`) mock the `openai` package's SDK client
directly; the integration suite
(`backend/tests/integration/resourceAgent.test.ts`) mocks
`openaiAgentService.runAgentTurn` and `openaiSummaryService.generateStructuredSummary`
at the module boundary, so `npm test` never spends real API credit
even with a real `OPENAI_API_KEY` configured.

## 8. Rate limiting and malware scanning (optional)

Both default to working with zero extra configuration — this section is
only for tuning them or turning on the real (non-Docker-Compose-default)
backends. Full explanation of the security reasoning: **`SECURITY.md`**.

**Rate limiting** picks its store automatically: in-memory if
`REDIS_URL` is empty, Redis-backed if it's set (the Docker Compose
stack always sets it, so `docker compose up` already exercises the
Redis-backed path with no extra steps).

```bash
# backend/.env
RATE_LIMIT_STORE=auto              # auto (default) | memory | redis
RATE_LIMIT_REDIS_REQUIRED=         # blank = true in production, false elsewhere
RATE_LIMIT_KEY_PREFIX=jomdekan:rate-limit:
```

`npm test` always uses the in-memory store regardless of these values —
a test run never depends on a real Redis connection.

**Malware scanning** defaults to a dev-only stub that provides **no
real protection** — see `SECURITY.md` before relying on it for
anything. It deterministically flags the industry-standard [EICAR test
string](https://www.eicar.org/download-anti-malware-testfile/) as
infected, which is how `backend/tests/unit/malwareScanner.test.ts` and
`backend/tests/integration/malwareScan.test.ts` exercise the "rejected"
path for every upload route without any real malware ever touching this
repo.

To scan against a real ClamAV instance instead:

```bash
docker compose --profile security up -d clamav   # not part of the default stack
```

```bash
# backend/.env
MALWARE_SCAN_PROVIDER=clamav
CLAMAV_HOST=clamav          # matches the compose service name
CLAMAV_PORT=3310
MALWARE_SCAN_TIMEOUT_MS=15000
MALWARE_SCAN_REQUIRED=      # blank = true in production, false elsewhere
```

Restart the backend after changing `MALWARE_SCAN_PROVIDER` (it's read
once at process startup). The ClamAV container has no `ports:` mapping
to the host — it's reachable only from other containers on the compose
network, never from your browser or host machine directly.

## 9. Running tests and builds

Backend:

```bash
cd backend
npm run lint
npm run typecheck
createdb jomdekan_test          # once, if you haven't already
DB_NAME=jomdekan_test npm run migrate
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

Frontend E2E (both servers must already be running against a migrated
database, from steps 3–4):

```bash
cd frontend
npx playwright install --with-deps chromium   # first time only
npm run test:e2e
```

## 10. Opening this project in VS Code

See the root `README.md`'s "Open in VS Code" section for editor setup,
recommended extensions, and a two-terminal launch routine.

## 11. Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend crashes immediately with "Environment validation failed" | A required `.env` value is missing/too short | Re-check `backend/.env` against `backend/.env.example`; secrets must be ≥32 chars |
| `ECONNREFUSED` connecting to Postgres | Postgres isn't running, or wrong host/port | `docker compose up -d`, or check `DB_HOST`/`DB_PORT` in `backend/.env` |
| CORS error in the browser console | Frontend origin doesn't match `CORS_ORIGINS` | Ensure `backend/.env`'s `CORS_ORIGINS` includes `http://localhost:5173` |
| Login works but a page refresh logs you out | Expected for the access token (by design, kept in memory) — but if `useSessionBootstrap` doesn't restore it | Check the `jomdekan_rt` cookie exists (DevTools → Application → Cookies) and that the backend and frontend are both on `localhost` (cookies won't cross to a different host/IP) |
| `npm install` fails on Windows with native build errors | Some transitive dependency needs build tools | Install "Desktop development with C++" (Windows) or use WSL2 (recommended) — see below |
| Using WSL2 | Files on the Windows filesystem (`/mnt/c/...`) are slow for `npm` | Clone the repo inside the WSL2 filesystem (e.g. `~/projects/jomdekan`), not under `/mnt/c` |
| Docker Desktop won't start on Windows | WSL2 backend not enabled | Enable WSL2 in Docker Desktop settings, or install PostgreSQL natively instead (see step 2) |
| `pg_isready`/migrate hangs | Postgres container still starting | Wait a few seconds and retry; `docker compose ps` shows health status |
| Swagger UI shows no routes | You're in `NODE_ENV=production` | Swagger is dev-only by design; run with `npm run dev` |
