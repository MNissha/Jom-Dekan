import { RedisStore } from "rate-limit-redis";

jest.mock("../../src/config/config/redis", () => ({
  isRedisConfigured: jest.fn(),
  getRedisClient: jest.fn(),
}));

import { resolveRateLimitStore } from "../../src/config/middleware/rateLimitStore";
import { env } from "../../src/config/config/env";
import { isRedisConfigured, getRedisClient } from "../../src/config/config/redis";

const mockIsRedisConfigured = isRedisConfigured as jest.Mock;
const mockGetRedisClient = getRedisClient as jest.Mock;

// env is a plain singleton object (not frozen) — mutating it directly
// per-test is the simplest way to exercise every store/production/
// redisRequired combination without a config DI layer the rest of the
// codebase doesn't have. Every test restores the original values.
type MutableEnv = typeof env;
const original = {
  isTest: env.isTest,
  isProduction: env.isProduction,
  store: env.rateLimit.store,
  redisRequired: env.rateLimit.redisRequired,
  keyPrefix: env.rateLimit.keyPrefix,
};

function setEnv(overrides: Partial<{ isTest: boolean; isProduction: boolean; store: "memory" | "redis" | "auto"; redisRequired: boolean }>) {
  const mutable = env as MutableEnv;
  if (overrides.isTest !== undefined) (mutable as { isTest: boolean }).isTest = overrides.isTest;
  if (overrides.isProduction !== undefined) (mutable as { isProduction: boolean }).isProduction = overrides.isProduction;
  if (overrides.store !== undefined) mutable.rateLimit.store = overrides.store;
  if (overrides.redisRequired !== undefined) mutable.rateLimit.redisRequired = overrides.redisRequired;
}

afterEach(() => {
  setEnv(original);
  jest.clearAllMocks();
});

describe("resolveRateLimitStore", () => {
  it("always uses the in-memory store in test mode, regardless of RATE_LIMIT_STORE", () => {
    setEnv({ isTest: true, store: "redis", redisRequired: true });
    mockIsRedisConfigured.mockReturnValue(true);

    const store = resolveRateLimitStore("auth");

    expect(store).toBeUndefined();
    expect(mockGetRedisClient).not.toHaveBeenCalled();
  });

  it("uses the in-memory store when RATE_LIMIT_STORE=memory, even if Redis is configured", () => {
    setEnv({ isTest: false, store: "memory" });
    mockIsRedisConfigured.mockReturnValue(true);

    const store = resolveRateLimitStore("login");

    expect(store).toBeUndefined();
    expect(mockGetRedisClient).not.toHaveBeenCalled();
  });

  it('auto mode falls back to memory when REDIS_URL is empty (isRedisConfigured() is false)', () => {
    setEnv({ isTest: false, store: "auto" });
    mockIsRedisConfigured.mockReturnValue(false);

    const store = resolveRateLimitStore("default");

    expect(store).toBeUndefined();
  });

  it("auto mode selects the Redis-backed store when REDIS_URL is configured", () => {
    setEnv({ isTest: false, store: "auto" });
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue({ call: jest.fn().mockResolvedValue("0".repeat(40)) });

    const store = resolveRateLimitStore("refresh");

    expect(store).toBeInstanceOf(RedisStore);
    expect(mockGetRedisClient).toHaveBeenCalledTimes(1);
  });

  it("RATE_LIMIT_STORE=redis selects the Redis-backed store outright", () => {
    setEnv({ isTest: false, store: "redis" });
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue({ call: jest.fn().mockResolvedValue("0".repeat(40)) });

    const store = resolveRateLimitStore("auth");

    expect(store).toBeInstanceOf(RedisStore);
  });

  it("each limiter gets its own store instance so counters can't collide across policies", () => {
    setEnv({ isTest: false, store: "redis" });
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetRedisClient.mockReturnValue({ call: jest.fn().mockResolvedValue("0".repeat(40)) });

    const authStore = resolveRateLimitStore("auth");
    const loginStore = resolveRateLimitStore("login");

    expect(authStore).not.toBe(loginStore);
    // Both wrap the *same* underlying Redis connection — never a second client.
    expect(mockGetRedisClient).toHaveBeenCalledTimes(2);
  });

  describe("when Redis is wanted but unavailable", () => {
    it("throws in production when RATE_LIMIT_REDIS_REQUIRED is true (fail fast)", () => {
      setEnv({ isTest: false, isProduction: true, store: "redis", redisRequired: true });
      mockIsRedisConfigured.mockReturnValue(false);

      expect(() => resolveRateLimitStore("auth")).toThrow(/RATE_LIMIT_REDIS_REQUIRED/);
    });

    it("throws in production when the Redis client itself fails to construct", () => {
      setEnv({ isTest: false, isProduction: true, store: "redis", redisRequired: true });
      mockIsRedisConfigured.mockReturnValue(true);
      mockGetRedisClient.mockImplementation(() => {
        throw new Error("ECONNREFUSED");
      });

      expect(() => resolveRateLimitStore("auth")).toThrow(/ECONNREFUSED/);
    });

    it("falls back to memory (does not throw) when RATE_LIMIT_REDIS_REQUIRED is explicitly false, even in production", () => {
      setEnv({ isTest: false, isProduction: true, store: "redis", redisRequired: false });
      mockIsRedisConfigured.mockReturnValue(false);

      const store = resolveRateLimitStore("auth");

      expect(store).toBeUndefined();
    });

    it("falls back to memory (does not throw) outside production by default", () => {
      setEnv({ isTest: false, isProduction: false, store: "redis", redisRequired: false });
      mockIsRedisConfigured.mockReturnValue(false);

      const store = resolveRateLimitStore("auth");

      expect(store).toBeUndefined();
    });
  });
});
