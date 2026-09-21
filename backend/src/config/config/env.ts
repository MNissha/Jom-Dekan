import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

function booleanString(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? defaultValue
        : v.trim().toLowerCase() === "true",
    );
}

/**
 * All process.env access in the application must go through this module.
 * Fail fast at startup if a required variable is missing or malformed —
 * never surface a config error mid-request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  CORS_ORIGINS: z
    .string()
    .min(1, "CORS_ORIGINS must list at least one allowed origin"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().min(1),
  DB_SSL: booleanString(false),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  REFRESH_COOKIE_NAME: z.string().default("jomdekan_rt"),
  COOKIE_SECRET: z
    .string()
    .min(16, "COOKIE_SECRET must be at least 16 characters"),

  STORAGE_PROVIDER: z
    .enum(["local-stub", "local-fs", "s3", "supabase"])
    .default("local-stub"),
  STORAGE_BUCKET: z.string().default("jomdekan-resources"),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_ACCESS_KEY_ID: z.string().optional().default(""),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(""),
  // "auto" works for some S3-compatible providers (e.g. R2); Supabase
  // Storage expects its actual project region here instead.
  STORAGE_REGION: z.string().default("auto"),
  // Local-fs adapter only (dev-only storage backend, no cloud account needed).
  STORAGE_LOCAL_ROOT: z.string().default("./storage/resources"),
  STORAGE_SIGNING_SECRET: z
    .string()
    .min(32, "STORAGE_SIGNING_SECRET must be at least 32 characters"),

  RESOURCE_MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 1024 * 1024),
  RESOURCE_UPLOAD_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  RESOURCE_DOWNLOAD_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  REDIS_URL: z.string().optional().default(""),

  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend", "sendgrid"]).default("console"),
  EMAIL_FROM: z.string().email().default("no-reply@jomdekan.app"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  SENDGRID_API_KEY: z.string().optional().default(""),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  // Backend callback URL for the tutor "Connect Google Calendar" OAuth
  // flow (distinct from login OAuth — needs its own redirect URI
  // registered on the OAuth client in Google Cloud Console, with the
  // Calendar API enabled for the project). Left empty in environments
  // that haven't set up Calendar integration yet — googleCalendarService
  // only errors when the connect flow is actually invoked, the same
  // "optional until used" pattern as OPENAI_API_KEY above.
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().optional().default(""),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().int().positive().default(20),
  // "auto" (default) uses Redis when REDIS_URL is set and falls back to
  // the in-memory store when it isn't — this is what makes local dev
  // (no REDIS_URL) and the Docker Compose stack (REDIS_URL always set)
  // both work with zero extra configuration. "memory"/"redis" force a
  // specific store regardless of REDIS_URL. See rateLimitStore.ts.
  RATE_LIMIT_STORE: z.enum(["memory", "redis", "auto"]).default("auto"),
  // Left as an optional raw string (not booleanString(...)) because its
  // *default* depends on NODE_ENV, not a fixed value — resolved below
  // once NODE_ENV is known. true = a production instance that can't
  // reach Redis for rate limiting must fail fast at startup rather than
  // silently degrading to a single-instance in-memory store.
  RATE_LIMIT_REDIS_REQUIRED: z.string().optional(),
  RATE_LIMIT_KEY_PREFIX: z.string().min(1).default("jomdekan:rate-limit:"),

  // --- Malware scanning (uploaded files) -----------------------------
  // "stub" never provides real protection — see
  // src/services/malwareScanner/stubScanner.ts. It's the only allowed
  // provider in test, and the only one that requires no external
  // infrastructure for local development.
  MALWARE_SCAN_PROVIDER: z.enum(["stub", "clamav"]).default("stub"),
  // Same NODE_ENV-dependent-default reasoning as RATE_LIMIT_REDIS_REQUIRED.
  MALWARE_SCAN_REQUIRED: z.string().optional(),
  CLAMAV_HOST: z.string().default("clamav"),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  MALWARE_SCAN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  // --- AI resource summaries -------------------------------------------
  // Never exposed to the frontend, never logged, never read from a
  // VITE_ variable — see backend/src/services/openaiSummaryService.ts.
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_SUMMARY_MODEL: z.string().default("gpt-5.6-luna"),
  // A full structured summary (up to 8 study sections, 12 glossary
  // entries, etc.) for a real multi-page document routinely needs more
  // than 1000 tokens once the model's own reasoning-token overhead is
  // included, or the response is cut off mid-JSON.
  OPENAI_SUMMARY_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),
  AI_SUMMARY_ENABLED: booleanString(true),
  AI_SUMMARY_MAX_INPUT_CHARACTERS: z.coerce
    .number()
    .int()
    .positive()
    .default(80000),
  AI_SUMMARY_DAILY_USER_LIMIT: z.coerce.number().int().positive().default(10),
  AI_SUMMARY_MAX_IMAGE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),

  // --- "Ask This Resource" agent (Phase 2) ------------------------------
  // Reuses OPENAI_API_KEY above. If OPENAI_AGENT_MODEL is left empty, the
  // agent reuses the already-validated OPENAI_SUMMARY_MODEL — one model
  // ID is never hardcoded in more than this one config module.
  AI_AGENT_ENABLED: booleanString(true),
  OPENAI_AGENT_MODEL: z.string().optional().default(""),
  // The structured-output schema alone allows an answer up to ~600
  // tokens (answerMaxChars in resourceAgent.ts), before citations (up
  // to 5, each with its own label/title/excerpt text), suggested
  // questions, and JSON structural overhead are added on top — a
  // 600-token ceiling leaves no room for any of that and truncates the
  // response mid-JSON on any non-trivial answer (confirmed live: a
  // real request came back with status "incomplete", reason
  // "max_output_tokens", and an unparseable cut-off string). 2000
  // comfortably covers the schema's real worst case with headroom.
  AI_AGENT_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2000),
  AI_AGENT_MAX_TOOL_CALLS: z.coerce.number().int().positive().max(10).default(2),
  AI_AGENT_MAX_CHUNKS_PER_SEARCH: z.coerce.number().int().positive().max(20).default(5),
  AI_AGENT_MAX_CHUNK_CHARACTERS: z.coerce.number().int().positive().default(1500),
  AI_AGENT_CONTEXT_TURNS: z.coerce.number().int().positive().max(20).default(4),
  AI_AGENT_DAILY_USER_LIMIT: z.coerce.number().int().positive().default(10),
  AI_AGENT_SESSION_MESSAGE_LIMIT: z.coerce.number().int().positive().default(30),
  AI_AGENT_MAX_QUESTION_CHARACTERS: z.coerce.number().int().positive().default(1000),
  AI_AGENT_SESSION_EXPIRY_DAYS: z.coerce.number().int().positive().default(30),
}).superRefine((data, ctx) => {
  if (data.EMAIL_PROVIDER === "smtp") {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"] as const;
    for (const key of required) {
      if (!data[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when EMAIL_PROVIDER=smtp`,
        });
      }
    }
  }
  if (data.EMAIL_PROVIDER === "resend" && !data.RESEND_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
    });
  }
  if (data.EMAIL_PROVIDER === "sendgrid" && !data.SENDGRID_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["SENDGRID_API_KEY"],
      message: "SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid",
    });
  }

  // Same NODE_ENV-dependent default used below when assembling `env` —
  // duplicated here (not read back from it) because this runs before
  // that object exists.
  const malwareScanRequired =
    data.MALWARE_SCAN_REQUIRED === undefined || data.MALWARE_SCAN_REQUIRED === ""
      ? data.NODE_ENV === "production"
      : data.MALWARE_SCAN_REQUIRED.trim().toLowerCase() === "true";
  if (data.NODE_ENV === "production" && data.MALWARE_SCAN_PROVIDER === "stub" && malwareScanRequired) {
    ctx.addIssue({
      code: "custom",
      path: ["MALWARE_SCAN_PROVIDER"],
      message:
        "MALWARE_SCAN_PROVIDER=stub provides no real malware protection and is not allowed in " +
        "production while scanning is required (MALWARE_SCAN_REQUIRED=true, the production default). " +
        "Set MALWARE_SCAN_PROVIDER=clamav, or explicitly set MALWARE_SCAN_REQUIRED=false to accept " +
        "unscanned uploads (not recommended).",
    });
  }
});

type RawEnv = z.infer<typeof envSchema>;

function parseEnv(): RawEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Environment validation failed. See errors above.");
  }
  return parsed.data;
}

const raw = parseEnv();

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  port: raw.PORT,

  corsOrigins: raw.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host: raw.DB_HOST,
    port: raw.DB_PORT,
    user: raw.DB_USER,
    password: raw.DB_PASSWORD,
    database: raw.DB_NAME,
    ssl: raw.DB_SSL,
    poolMax: raw.DB_POOL_MAX,
  },

  jwt: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    accessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN,
    refreshCookieName: raw.REFRESH_COOKIE_NAME,
  },
  cookieSecret: raw.COOKIE_SECRET,

  storage: {
    provider: raw.STORAGE_PROVIDER,
    bucket: raw.STORAGE_BUCKET,
    endpoint: raw.STORAGE_ENDPOINT,
    region: raw.STORAGE_REGION,
    accessKeyId: raw.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: raw.STORAGE_SECRET_ACCESS_KEY,
    localRoot: raw.STORAGE_LOCAL_ROOT,
    signingSecret: raw.STORAGE_SIGNING_SECRET,
  },

  resources: {
    maxFileSizeBytes: raw.RESOURCE_MAX_FILE_SIZE_BYTES,
    uploadTokenTtlSeconds: raw.RESOURCE_UPLOAD_TOKEN_TTL_SECONDS,
    downloadTokenTtlSeconds: raw.RESOURCE_DOWNLOAD_TOKEN_TTL_SECONDS,
  },

  redisUrl: raw.REDIS_URL,

  email: {
    provider: raw.EMAIL_PROVIDER,
    from: raw.EMAIL_FROM,
    smtp: {
      host: raw.SMTP_HOST,
      port: raw.SMTP_PORT ?? 587,
      user: raw.SMTP_USER,
      password: raw.SMTP_PASSWORD,
    },
    resendApiKey: raw.RESEND_API_KEY,
    sendgridApiKey: raw.SENDGRID_API_KEY,
  },

  google: {
    clientId: raw.GOOGLE_CLIENT_ID,
    clientSecret: raw.GOOGLE_CLIENT_SECRET,
    calendarRedirectUri: raw.GOOGLE_CALENDAR_REDIRECT_URI,
  },

  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    maxAuth: raw.RATE_LIMIT_MAX_AUTH,
    store: raw.RATE_LIMIT_STORE,
    // Defaults to "required" in production (fail fast if Redis-backed
    // limiting is wanted but unreachable) and "not required" elsewhere.
    // Explicitly setting this is how an operator permits a production
    // instance to run with single-instance in-memory limiting instead —
    // see rateLimitStore.ts.
    redisRequired:
      raw.RATE_LIMIT_REDIS_REQUIRED === undefined || raw.RATE_LIMIT_REDIS_REQUIRED === ""
        ? raw.NODE_ENV === "production"
        : raw.RATE_LIMIT_REDIS_REQUIRED.trim().toLowerCase() === "true",
    keyPrefix: raw.RATE_LIMIT_KEY_PREFIX,
  },

  malwareScan: {
    provider: raw.MALWARE_SCAN_PROVIDER,
    required:
      raw.MALWARE_SCAN_REQUIRED === undefined || raw.MALWARE_SCAN_REQUIRED === ""
        ? raw.NODE_ENV === "production"
        : raw.MALWARE_SCAN_REQUIRED.trim().toLowerCase() === "true",
    clamav: {
      host: raw.CLAMAV_HOST,
      port: raw.CLAMAV_PORT,
    },
    timeoutMs: raw.MALWARE_SCAN_TIMEOUT_MS,
  },

  aiSummary: {
    openaiApiKey: raw.OPENAI_API_KEY,
    model: raw.OPENAI_SUMMARY_MODEL,
    maxOutputTokens: raw.OPENAI_SUMMARY_MAX_OUTPUT_TOKENS,
    enabled: raw.AI_SUMMARY_ENABLED,
    maxInputCharacters: raw.AI_SUMMARY_MAX_INPUT_CHARACTERS,
    dailyUserLimit: raw.AI_SUMMARY_DAILY_USER_LIMIT,
    maxImageSizeBytes: raw.AI_SUMMARY_MAX_IMAGE_SIZE_BYTES,
  },

  aiAgent: {
    openaiApiKey: raw.OPENAI_API_KEY,
    // Falls back to the Phase 1 summary model when left unset — the one
    // place this fallback happens; every other module reads env.aiAgent.model.
    model: raw.OPENAI_AGENT_MODEL || raw.OPENAI_SUMMARY_MODEL,
    enabled: raw.AI_AGENT_ENABLED,
    maxOutputTokens: raw.AI_AGENT_MAX_OUTPUT_TOKENS,
    maxToolCalls: raw.AI_AGENT_MAX_TOOL_CALLS,
    maxChunksPerSearch: raw.AI_AGENT_MAX_CHUNKS_PER_SEARCH,
    maxChunkCharacters: raw.AI_AGENT_MAX_CHUNK_CHARACTERS,
    contextTurns: raw.AI_AGENT_CONTEXT_TURNS,
    dailyUserLimit: raw.AI_AGENT_DAILY_USER_LIMIT,
    sessionMessageLimit: raw.AI_AGENT_SESSION_MESSAGE_LIMIT,
    maxQuestionCharacters: raw.AI_AGENT_MAX_QUESTION_CHARACTERS,
    sessionExpiryDays: raw.AI_AGENT_SESSION_EXPIRY_DAYS,
  },
};
