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

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().int().positive().default(20),
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
  },

  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    maxAuth: raw.RATE_LIMIT_MAX_AUTH,
  },
};
