import type { Store } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { env } from "../config/env";
import { getRedisClient, isRedisConfigured } from "../config/redis";
import { logger } from "../../utils/logger";

/**
 * Picks the express-rate-limit store for one named limiter (auth/login/
 * refresh/default — see rateLimitMiddleware.ts). Each limiter gets its
 * own RedisStore *instance* (so its counters live under their own key
 * prefix and never collide with another limiter's), but every instance
 * shares the one underlying Redis connection from getRedisClient() —
 * never a new `new Redis(...)` per limiter.
 *
 * Resolution order:
 * 1. Test env always uses the in-memory store (express-rate-limit's own
 *    default, `undefined` here), regardless of RATE_LIMIT_STORE — a
 *    test run must never depend on a real Redis connection, and must be
 *    able to exit immediately with no lingering socket.
 * 2. RATE_LIMIT_STORE=memory => in-memory, always.
 * 3. RATE_LIMIT_STORE=redis => Redis-backed, always (see fail/fallback
 *    below if that's not actually possible).
 * 4. RATE_LIMIT_STORE=auto (default) => Redis-backed if REDIS_URL is
 *    set, in-memory otherwise — this is what makes local dev (no
 *    REDIS_URL) and the Docker Compose stack (REDIS_URL always set)
 *    both work with zero extra configuration.
 *
 * When Redis is wanted (3 or 4-with-REDIS_URL-set) but not actually
 * configured/reachable: RATE_LIMIT_REDIS_REQUIRED (defaults to `true`
 * in production, `false` elsewhere — see env.ts) decides whether that
 * throws (fail fast, the production default) or logs a warning and
 * falls back to the in-memory store (dev default, or an explicit
 * RATE_LIMIT_REDIS_REQUIRED=false opt-out in production).
 */
export function resolveRateLimitStore(limiterName: string): Store | undefined {
  if (env.isTest) return undefined;

  const wantsRedis =
    env.rateLimit.store === "redis" || (env.rateLimit.store === "auto" && isRedisConfigured());
  if (!wantsRedis) return undefined;

  if (!isRedisConfigured()) {
    return failOrFallBackToMemory(limiterName, "REDIS_URL is not set");
  }

  try {
    const client = getRedisClient();
    return new RedisStore({
      sendCommand: (command: string, ...rest: string[]) =>
        client.call(command, rest) as Promise<RedisReply>,
      prefix: `${env.rateLimit.keyPrefix}${limiterName}:`,
    });
  } catch (err) {
    return failOrFallBackToMemory(limiterName, `Redis client could not be created (${(err as Error).message})`);
  }
}

function failOrFallBackToMemory(limiterName: string, reason: string): undefined {
  const message =
    `Redis-backed rate limiting was requested for the "${limiterName}" limiter, but ${reason}.`;
  if (env.rateLimit.redisRequired) {
    throw new Error(
      `${message} Set REDIS_URL to a reachable Redis instance, or set RATE_LIMIT_REDIS_REQUIRED=false ` +
        "to explicitly allow falling back to a single-instance in-memory store.",
    );
  }
  logger.warn(`${message} Falling back to the in-memory store (single-instance only).`);
  return undefined;
}
