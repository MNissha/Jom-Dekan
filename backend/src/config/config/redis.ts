import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../../utils/logger";

/**
 * Redis is optional for local/single-instance development (REDIS_URL
 * empty => every Redis-backed feature falls back to its own in-process
 * default — see rateLimitStore.ts). This module owns the single shared
 * client so nothing else in the app ever calls `new Redis(...)`
 * directly, keeping the connection count to at most one regardless of
 * how many features (rate limiting today, others later) use it.
 */
export function isRedisConfigured(): boolean {
  return Boolean(env.redisUrl);
}

let client: Redis | null = null;
let loggedFirstError = false;

/**
 * Returns the shared Redis client, creating it on first use. Throws if
 * REDIS_URL isn't configured — callers must check isRedisConfigured()
 * first and apply their own fallback policy (rateLimitStore.ts does).
 */
export function getRedisClient(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_NOT_CONFIGURED: REDIS_URL is not set.");
  }
  if (!client) {
    client = new Redis(env.redisUrl, {
      // Never buffer commands forever waiting on a dead connection, and
      // never let a Redis outage block/crash the request that triggered
      // it — callers decide how to degrade (see rateLimitStore.ts).
      maxRetriesPerRequest: 2,
      retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
      lazyConnect: false,
    });
    client.on("error", (err) => {
      // ioredis emits 'error' on every failed reconnect attempt, which
      // would otherwise flood logs during a real outage — log only the
      // first occurrence in detail, and never the connection string or
      // `err.message` (some ioredis error variants echo the connect
      // target, which may carry a password) — just the error's type.
      if (!loggedFirstError) {
        loggedFirstError = true;
        logger.error({ errorName: err.name }, "Redis client error (further errors suppressed until reconnected)");
      }
    });
    client.on("ready", () => {
      loggedFirstError = false;
    });
  }
  return client;
}

/**
 * True if Redis actually answers a PING within a short budget — used
 * only for the production startup fail-fast check (rateLimitStore.ts /
 * index.ts), never on the request path. Never throws.
 */
export async function verifyRedisConnection(timeoutMs = 3000): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const result = await Promise.race([
      getRedisClient().ping(),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error("Redis ping timed out")), timeoutMs),
      ),
    ]);
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Closes the shared client if one was ever created — a no-op otherwise.
 * Called at process shutdown and by the test suite so `npm test` can
 * exit without a lingering open socket.
 */
export async function closeRedisClient(): Promise<void> {
  const toClose = client;
  client = null;
  if (!toClose) return;
  try {
    await toClose.quit();
  } catch {
    toClose.disconnect();
  }
}
