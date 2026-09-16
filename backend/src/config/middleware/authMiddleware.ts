import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../config/auth';
import { AppError } from '../../types/errors';
import { userModel } from '../../models/userModel';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Requires a valid, short-lived access token in the Authorization
 * header. The access token is kept in frontend memory (never
 * localStorage); the refresh token lives in an HTTP-only cookie and is
 * only ever sent to POST /api/v1/auth/refresh.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(AppError.unauthorized('Authentication required. Provide a valid access token.'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = verifyAccessToken(token);
    const user = await userModel.findById(decoded.sub);
    if (!user || user.status !== 'ACTIVE') {
      next(AppError.unauthorized('This account is not active.'));
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired access token.'));
  }
}

/**
 * Attaches req.user if a valid token is present, but never rejects —
 * anonymous callers just get req.user left undefined. Re-checks
 * `status === 'ACTIVE'` the same way `authenticate` does (a suspended/
 * disabled account shouldn't keep its personalized view — e.g. "my
 * application status" on a public listing — for the rest of its access
 * token's life just because this path doesn't require login at all).
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(header.slice('Bearer '.length).trim());
      const user = await userModel.findById(decoded.sub);
      if (user && user.status === 'ACTIVE') {
        req.user = { id: user.id, email: user.email, role: user.role };
      }
    } catch {
      // Ignore invalid tokens for optional auth — treat as anonymous.
    }
  }
  next();
}
