# Security

This document describes JomDekan's current security controls, what's
optional/production-only, what's an honest development-only substitute,
and known limitations. It exists to be accurate, not reassuring — where
a control isn't implemented, or only partially is, that's stated
plainly below rather than implied away.

## Reporting a vulnerability

**TODO (repository owner):** replace this with a real contact — a
private email address, or a GitHub [private security
advisory](https://docs.github.com/en/code-security/security-advisories)
link for this repository. Until this is filled in, do not open a public
issue for a suspected vulnerability.

---

## Authentication

- Password auth via `authService.ts`, passwords hashed with bcrypt.
- Login is protected two ways: a per-account lockout (10 wrong
  attempts → 15 minute lockout, `AppError.locked`) is the real
  brute-force defense; a looser IP-keyed rate limit (see below) is only
  a backstop against a script hammering the endpoint, not a substitute
  for the per-account lockout.
- Google OAuth is also supported (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`).

### Access & refresh tokens

- **Access token**: short-lived JWT (`JWT_ACCESS_EXPIRES_IN`, default
  15m), returned in the JSON response body only, held in frontend
  memory (`useAuthStore`) — never `localStorage`, never a cookie.
- **Refresh token**: a separate JWT, stored **hashed** (SHA-256) server-side
  (`user_sessions.refresh_token_hash`) — the plaintext token is never
  persisted. Delivered to the browser only as an `HttpOnly;
  Secure (prod); SameSite=Strict` cookie scoped to `/api/v1/auth`, so
  page JavaScript can never read it.
- **Rotation & reuse detection**: every `/auth/refresh` call issues a
  new refresh token and revokes the old session row. Presenting an
  already-revoked refresh token revokes the *entire* session family for
  that user — a strong signal the token was stolen and the session
  chain should be cut, not just the one request denied.

See `docs/architecture.md` → "Auth token design" for more detail.

## Rate limiting

Four independent `express-rate-limit` policies (`backend/src/config/middleware/rateLimitMiddleware.ts`):
registration/sensitive-auth, login, token refresh, and everything else
— each with its own budget, so refreshing a tab on page load can never
exhaust the same budget as a login-brute-force script, and login itself
stays looser than registration since the real brute-force defense is
the per-account lockout above, not this limiter.

**Store selection** (`RATE_LIMIT_STORE`, default `auto`):

| Value | Behavior |
|---|---|
| `auto` (default) | Redis-backed if `REDIS_URL` is set, in-memory otherwise. |
| `memory` | Always in-memory, regardless of `REDIS_URL`. |
| `redis` | Always Redis-backed. |

- **In-memory** is correct and sufficient for local development and a
  single backend instance — it's not a weaker fallback, just scoped to
  one process.
- **Redis** is required once you run more than one backend instance
  behind a load balancer — an in-memory store's counters are per-process,
  so with N instances a client could get up to N× the intended budget
  without a shared store. Every rate-limit key is written under
  `RATE_LIMIT_KEY_PREFIX` (default `jomdekan:rate-limit:`) so this data
  can never collide with unrelated keys in a shared Redis instance, and
  each of the four limiters gets its own sub-prefix so their counters
  can't collide with each other either — all four still share the one
  underlying Redis connection (see `backend/src/config/config/redis.ts`),
  never one connection per limiter.
- **`RATE_LIMIT_REDIS_REQUIRED`** (default: `true` in production, `false`
  elsewhere) — when Redis-backed limiting is wanted but Redis is
  unreachable/unconfigured, this decides whether the backend **fails
  fast at startup** (the production default — a multi-instance
  deployment silently downgrading to per-instance limiting is a security
  regression, not a graceful degradation) or logs a warning and falls
  back to the in-memory store. Set it explicitly to `false` to permit
  that fallback in production (e.g. you're intentionally running a
  single instance there).
- Test runs (`NODE_ENV=test`) always use the in-memory store,
  unconditionally — `npm test` never depends on a real Redis connection.

See `backend/tests/unit/rateLimitStore.test.ts` for the store-selection
behavior under test, and `docs/setup.md` for local configuration.

## File upload security pipeline

Every upload path — academic resource files, report screenshot
evidence, tutor resumes, and opportunity CV/portfolio attachments — goes
through the same shape, in this order, before anything is persisted or
made visible/downloadable:

```
Client upload
  -> authentication
  -> request-size limit (Multer)
  -> content-based MIME detection (magic bytes, never file.mimetype)
  -> declared vs. detected MIME comparison
  -> allowed-format validation
  -> malware scan
  -> persistence / READY transition
```

**MIME validation vs. malware scanning — these are two different
questions.** MIME/content-type checking (`backend/src/utils/fileSniffer.ts`)
only answers "is this really the file *format* it claims to be" (a PDF's
magic bytes, an OOXML document's internal structure) — it says nothing
about whether that PDF/DOCX/image *contains* a malicious payload. Malware
scanning is the separate, dedicated step that actually answers that
question. A file can pass MIME validation and still be infected; both
checks run on every path, never just one.

**Why `file.mimetype` is never trusted alone.** A browser sets
`Content-Type` from the file's extension/OS metadata — trivially
spoofable (rename `evil.exe` to `resume.pdf`, or just edit the
multipart form field directly). Every upload path detects the real type
from the file's own bytes (magic-byte signatures — see
`fileSniffer.ts`) and uses *that* value everywhere downstream, including
what's later served back as `Content-Type`.

### Malware scanning

Provider-neutral interface (`backend/src/services/malwareScanner/`):

```ts
interface MalwareScanResult {
  clean: boolean;
  threatName?: string; // only set when clean is false
  scanner: string;
}
interface MalwareScanner {
  scan(input: { buffer: Buffer; filename: string; mimeType: string }): Promise<MalwareScanResult>;
}
```

**⚠️ Development stub scanner (`MALWARE_SCAN_PROVIDER=stub`, the
default) provides NO real malware protection.** It only recognizes the
industry-standard [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/)
deterministically, so tests can exercise the "infected" branch of every
upload path without any real malware ever existing in this repository
or its test fixtures. It is refused outright at startup if
`NODE_ENV=production` and scanning is required (see env.ts's config
validation) — a production deployment cannot silently run on the stub.

**ClamAV adapter (`MALWARE_SCAN_PROVIDER=clamav`)** scans through a real
`clamd` daemon over `CLAMAV_HOST:CLAMAV_PORT`, using clamd's INSTREAM
protocol directly over a raw TCP socket
(`backend/src/services/malwareScanner/clamavScanner.ts`) — not a
third-party npm wrapper (most shell out to the `clamscan` CLI, which
means either a temp file or an untrusted filename reaching a
subprocess), and not the CLI. INSTREAM takes the file as a raw
length-prefixed byte stream on an existing connection — there is no
filename argument and no shell involved, so there is no filename-based
command-injection surface in the first place, and no temp file is ever
written. Both a connection and an overall scan timeout apply
(`MALWARE_SCAN_TIMEOUT_MS`, default 15s); an unrecognized or malformed
reply from clamd is treated as a scan failure, never guessed as "clean".

**`MALWARE_SCAN_REQUIRED`** (default: `true` in production, `false`
elsewhere) governs what happens when the scanner itself fails
(unreachable, timed out, malformed reply — distinct from a confident
"infected" verdict):

- `true`: **fail closed** — the upload is rejected with a temporary
  503, and (for the resource-file path specifically, which already has
  a pending state) the file simply stays un-confirmed rather than
  reaching `READY`. A file never becomes `READY`, visible, or
  downloadable off the back of a scanner failure.
- `false` (the non-production default): **fail open** — the upload is
  accepted unscanned, and a warning is logged. This is only appropriate
  because it is never the production default.

**On a confirmed infection:** the upload is rejected with a generic
message ("this file was rejected by malware scanning") — the exact
threat name is never returned to the uploader, only recorded in a
structured audit-log entry (`MALWARE_SCAN_INFECTED` /
`MALWARE_SCAN_FAILED`, via `auditLogModel`) for admins. For the resource
file path, an already-persisted infected object is also deleted from
storage, not just marked failed in the database.

### Upload paths and what protects them

| Path | Content-sniffing | Malware scan | Persisted as |
|---|---|---|---|
| Academic resource files | Yes (`resourceService.receiveUpload`) | Yes, at confirm-time | Storage adapter (local-fs/S3), state machine PENDING→UPLOADED→READY/FAILED |
| Report screenshot evidence | Yes (added — previously trusted `file.mimetype` only) | Yes, before the report row is created | Postgres `bytea` |
| Tutor resumes | Yes (pre-existing) | Yes (added), before storage | Storage adapter, no pending state — persisted only after a clean scan |
| Opportunity CV/portfolio | Yes (added — previously trusted `file.mimetype` only) | Yes (added), before the application row is created | Postgres `bytea` |

## Known limitations

- The stub scanner is exactly what its name says — a deterministic dev
  fixture, not protection. Real protection requires actually running
  ClamAV (or another `MalwareScanner` implementation) with
  `MALWARE_SCAN_PROVIDER=clamav`.
- Report screenshots and opportunity CV/portfolio files are stored as
  Postgres `bytea`, not through the same `StorageAdapter`/pending-state
  pipeline resource files use — they have no separate storage object to
  delete on rejection, but they also don't get the same
  PENDING→READY lifecycle. Unifying every upload path onto one storage
  lifecycle would need a schema migration for those two tables; this
  wasn't done here to avoid an unreviewed, unsafe partial data
  migration — the validation/scanning step itself is still shared and
  safe as implemented (rejection happens before either table is ever
  written to).
- ClamAV's own virus-definition freshness is an operational concern
  outside this codebase (the `clamav/clamav` Docker image runs
  `freshclam` automatically, but a stale/offline deployment is still
  possible).
- Malware scanning covers the four Multer-based file uploads listed
  above. It does not scan URLs a user pastes in as a link (e.g. a
  portfolio URL) — those are never downloaded/executed server-side, so
  there is no equivalent byte stream to scan.

## External requirements for a real production deployment

- A reachable Redis instance if running more than one backend instance
  (`RATE_LIMIT_STORE=auto` or `redis`, `RATE_LIMIT_REDIS_REQUIRED=true`).
- A running ClamAV daemon (`MALWARE_SCAN_PROVIDER=clamav`,
  `MALWARE_SCAN_REQUIRED=true`) — the stub is refused at startup in
  production when scanning is required, so this isn't optional there.
- Real object storage (`STORAGE_PROVIDER=s3` or `supabase`) — `local-fs`
  is a dev-only adapter.
- A real SMTP/Resend/SendGrid provider for `EMAIL_PROVIDER` — `console`
  only logs emails, it never sends them.
- `.env` secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `COOKIE_SECRET`, `STORAGE_SIGNING_SECRET`) generated fresh per
  environment — never reused from this repo's `.env.example` defaults.
