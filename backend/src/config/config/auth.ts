import jwt from 'jsonwebtoken';
import { env } from './env';

export interface AccessTokenPayload {
  sub: string; // user id
  role: 'USER' | 'ADMIN';
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  sid: string; // session (user_sessions.id) this refresh token belongs to
}

// Stamped on every newly-signed token so a future move to multiple
// issuers/audiences (e.g. a separate service sharing infra) can't have
// its tokens cross-accepted here by mistake. Deliberately NOT required
// on verify yet — enforcing it there would reject every token already
// issued before this change (up to 30 days of still-valid refresh
// tokens), forcing every logged-in user to re-authenticate. Once enough
// time has passed that no pre-change token can still be valid, add
// `issuer`/`audience` to the verify calls below too.
const TOKEN_ISSUER = 'jomdekan-api';
const TOKEN_AUDIENCE = 'jomdekan-frontend';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}
