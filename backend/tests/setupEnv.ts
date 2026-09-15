// Provides safe, non-secret defaults so `npm test` works without a
// developer having to hand-craft a .env for CI/local test runs.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'jomdekan_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-that-is-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-that-is-at-least-32-chars';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-cookie-secret';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local-fs';
process.env.STORAGE_LOCAL_ROOT = process.env.STORAGE_LOCAL_ROOT || './storage/resources-test';
process.env.STORAGE_SIGNING_SECRET =
  process.env.STORAGE_SIGNING_SECRET || 'test-storage-signing-secret-that-is-at-least-32-chars';
// Force-safe regardless of a developer's local .env: tests must never send
// real email (EMAIL_PROVIDER=smtp there would attempt live SMTP delivery)
// and must not trip auth rate limiting just from running the suite once.
process.env.EMAIL_PROVIDER = 'console';
process.env.RATE_LIMIT_MAX_AUTH = process.env.RATE_LIMIT_MAX_AUTH || '1000';

// AI summaries: the feature flag defaults on so its own integration tests
// can exercise the real code path, but the OpenAI client itself is always
// mocked (see tests/integration/resourceAiSummary.test.ts) — no test may
// ever hold a real OPENAI_API_KEY or spend real API credit.
process.env.AI_SUMMARY_ENABLED = process.env.AI_SUMMARY_ENABLED || 'true';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.OPENAI_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL || 'gpt-5.6-luna';
process.env.OPENAI_SUMMARY_MAX_OUTPUT_TOKENS = process.env.OPENAI_SUMMARY_MAX_OUTPUT_TOKENS || '1000';
process.env.AI_SUMMARY_MAX_INPUT_CHARACTERS = process.env.AI_SUMMARY_MAX_INPUT_CHARACTERS || '80000';
process.env.AI_SUMMARY_DAILY_USER_LIMIT = process.env.AI_SUMMARY_DAILY_USER_LIMIT || '10';
process.env.AI_SUMMARY_MAX_IMAGE_SIZE_BYTES = process.env.AI_SUMMARY_MAX_IMAGE_SIZE_BYTES || '5242880';

// Ask This Resource agent (Phase 2): same reasoning as above — the flag
// defaults on so its integration tests exercise the real code path, but
// openaiAgentService is always mocked (see
// tests/integration/resourceAgent.test.ts).
process.env.AI_AGENT_ENABLED = process.env.AI_AGENT_ENABLED || 'true';
process.env.OPENAI_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || '';
process.env.AI_AGENT_MAX_OUTPUT_TOKENS = process.env.AI_AGENT_MAX_OUTPUT_TOKENS || '600';
process.env.AI_AGENT_MAX_TOOL_CALLS = process.env.AI_AGENT_MAX_TOOL_CALLS || '2';
process.env.AI_AGENT_MAX_CHUNKS_PER_SEARCH = process.env.AI_AGENT_MAX_CHUNKS_PER_SEARCH || '5';
process.env.AI_AGENT_MAX_CHUNK_CHARACTERS = process.env.AI_AGENT_MAX_CHUNK_CHARACTERS || '1500';
process.env.AI_AGENT_CONTEXT_TURNS = process.env.AI_AGENT_CONTEXT_TURNS || '4';
process.env.AI_AGENT_DAILY_USER_LIMIT = process.env.AI_AGENT_DAILY_USER_LIMIT || '10';
process.env.AI_AGENT_SESSION_MESSAGE_LIMIT = process.env.AI_AGENT_SESSION_MESSAGE_LIMIT || '30';
process.env.AI_AGENT_MAX_QUESTION_CHARACTERS = process.env.AI_AGENT_MAX_QUESTION_CHARACTERS || '1000';
process.env.AI_AGENT_SESSION_EXPIRY_DAYS = process.env.AI_AGENT_SESSION_EXPIRY_DAYS || '30';
