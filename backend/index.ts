import { createApp } from "./src/app";
import { env } from "./src/config/config/env";
import { logger } from "./src/utils/logger";
import { checkDatabaseConnection } from "./src/config/config/db";
import { isRedisConfigured, verifyRedisConnection, closeRedisClient } from "./src/config/config/redis";

/**
 * True fail-fast for Redis-backed rate limiting: rateLimitStore.ts's
 * synchronous checks catch "REDIS_URL isn't set", but ioredis's client
 * constructor never throws synchronously just because the server is
 * unreachable (it retries in the background) — verifying an actual PING
 * here, before the app starts accepting traffic, is the only way to
 * honor "fail fast if Redis is unavailable" for that case specifically.
 */
async function assertRateLimitInfrastructureReady(): Promise<void> {
  const wantsRedis =
    env.rateLimit.store === "redis" || (env.rateLimit.store === "auto" && isRedisConfigured());
  if (!wantsRedis || !env.rateLimit.redisRequired) return;

  const reachable = await verifyRedisConnection();
  if (!reachable) {
    throw new Error(
      "RATE_LIMIT_REDIS_REQUIRED is true but Redis is not reachable at REDIS_URL. Fix the Redis " +
        "connection, or set RATE_LIMIT_REDIS_REQUIRED=false to explicitly allow starting with a " +
        "single-instance in-memory rate-limit store instead.",
    );
  }
}

async function main(): Promise<void> {
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error(
      "Could not connect to PostgreSQL at startup. Check DB_* environment variables.",
    );
  }

  await assertRateLimitInfrastructureReady();

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`JomDekan API listening on port ${env.port} (${env.nodeEnv})`);
    if (!env.isProduction) {
      logger.info(`Swagger docs: http://localhost:${env.port}/api/v1/docs`);
    }
  });

  // Ensure a Redis connection (opened lazily by the rate limiter, if
  // Redis-backed limiting is in use) never keeps the process alive on
  // shutdown — never a no-op when Redis was never used, since
  // closeRedisClient() only acts on a client that actually exists.
  const shutdown = () => {
    server.close();
    void closeRedisClient();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", err);
  process.exit(1);
});
