import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../../types/errors';
import { resolveRateLimitStore } from './rateLimitStore';
import type { Request, Response } from 'express';

function rateLimitedResponse(_req: Request, res: Response): void {
  const err = AppError.tooManyRequests();
  res.status(err.status).json({
    error: { code: err.code, message: err.message, details: [], requestId: res.req.requestId },
  });
}

/** Stricter limiter for rarely-hit, sensitive auth endpoints (register, password reset, email verification). */
export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxAuth,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
  store: resolveRateLimitStore('auth'),
});

/**
 * Looser, IP-keyed limiter for /auth/login. Real brute-force protection
 * lives per-account in authService (10 wrong attempts -> 15 min lockout);
 * this is just a backstop against a script hammering the endpoint, so it
 * must not punish a whole campus NAT/shared-WiFi IP for normal traffic.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxAuth * 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
  store: resolveRateLimitStore('login'),
});

/**
 * /auth/refresh fires silently in the background on every page load/tab
 * switch (see useSessionBootstrap + the axios 401 interceptor) — it is
 * not a user-initiated "attempt" and must not share the strict auth
 * budget, or ordinary reloading can lock a legitimate session out.
 */
export const refreshRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxAuth * 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
  store: resolveRateLimitStore('refresh'),
});

/** General-purpose, more permissive limiter for the rest of the API. */
export const defaultRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxAuth * 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
  store: resolveRateLimitStore('default'),
});
