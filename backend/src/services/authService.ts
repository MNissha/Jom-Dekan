import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { userModel, toSafeUser, type UserRow } from '../models/userModel';
import { sessionModel } from '../models/sessionModel';
import { auditLogModel } from '../models/auditLogModel';
import { passwordResetTokenModel } from '../models/passwordResetTokenModel';
import { emailVerificationTokenModel } from '../models/emailVerificationTokenModel';
import { taxonomyModel } from '../models/taxonomyModel';
import { notificationModel } from '../models/notificationModel';
import { emailService } from './emailService';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/config/auth';
import { env } from '../config/config/env';
import { AppError } from '../types/errors';
import { logger } from '../utils/logger';
import { parseDurationMs } from '../utils/duration';

const BCRYPT_COST = 12;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Per-account brute-force lockout (independent of the IP-based rate
// limiter — see rateLimitMiddleware.ts for why both exist).
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
// Only start warning the user once they're a few wrong guesses in — two
// generic "invalid email or password" tries first, so the message
// doesn't confirm the account exists on the very first typo.
const ATTEMPTS_WARNING_THRESHOLD = 3;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function refreshExpiryDate(): Date {
  // JWT_REFRESH_EXPIRES_IN is a jsonwebtoken duration string (e.g. "30d").
  // We independently compute the DB expiry so revocation doesn't depend
  // on trusting the token's own exp claim.
  return new Date(Date.now() + parseDurationMs(env.jwt.refreshExpiresIn));
}

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(user: UserRow, ctx: { userAgent?: string; ipAddress?: string }): Promise<IssuedTokens> {
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, sid: sessionId });

  await sessionModel.create({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
    expiresAt: refreshExpiryDate(),
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(params: {
    email: string;
    password: string;
    displayName: string;
    academicRole: 'STUDENT' | 'TUTOR';
    universityId: string;
    fieldOfStudy: string;
    currentYear: number;
    currentSemester: number;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existing = await userModel.findByEmail(params.email);
    if (existing) {
      // Do not reveal whether the specific account exists beyond this
      // point in flows where that matters (password reset); for
      // registration itself, a 409 is standard and acceptable.
      throw AppError.conflict('An account with this email already exists.');
    }

    const university = await taxonomyModel.universities.findById(params.universityId);
    if (!university || !university.is_active) {
      throw AppError.badRequest('Select a valid university.');
    }

    const passwordHash = await bcrypt.hash(params.password, BCRYPT_COST);
    const user = await userModel.create({
      email: params.email,
      passwordHash,
      displayName: params.displayName,
      academicRole: params.academicRole,
      universityId: params.universityId,
      fieldOfStudy: params.fieldOfStudy,
      currentYear: params.currentYear,
      currentSemester: params.currentSemester,
    });

    const tokens = await issueTokenPair(user, { userAgent: params.userAgent, ipAddress: params.ipAddress });

    await auditLogModel.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      targetType: 'user',
      targetId: user.id,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    try {
      await authService.sendVerificationEmail(user);
    } catch (err) {
      // Email delivery is best-effort — a provider outage must not
      // prevent account creation. The user can request another link
      // later (once a resend endpoint exists) or verify never and stay
      // functionally a USER either way.
      logger.warn({ userId: user.id, err }, 'Failed to send verification email');
    }

    try {
      // In-app notification, independent of email deliverability — the
      // user sees "account created" the moment they land in the app even
      // if the verification email above got delayed or dropped by the
      // provider.
      await notificationModel.notifyUser(user.id, 'ACCOUNT_CREATED', {
        title: 'Welcome to JomDekan!',
        message: `Hi ${params.displayName}, your account has been created successfully. Check your email to verify your address and unlock full access.`,
      });
    } catch (err) {
      logger.warn({ userId: user.id, err }, 'Failed to create account-created notification');
    }

    logger.info({ userId: user.id }, 'User registered');

    return { user: toSafeUser(user), ...tokens };
  },

  async sendVerificationEmail(user: UserRow): Promise<void> {
    await emailVerificationTokenModel.invalidateAllForUser(user.id);

    const rawToken = generateRawToken();
    await emailVerificationTokenModel.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    });

    const verifyUrl = `${env.corsOrigins[0]}/verify-email?token=${rawToken}`;
    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify your JomDekan email',
      text: `Welcome to JomDekan! Confirm your email address here (expires in 24 hours, single use):\n${verifyUrl}\n\nIf you didn't create this account, you can safely ignore this email.`,
    });
  },

  async verifyEmail(params: { token: string; requestId?: string; ipAddress?: string }): Promise<void> {
    const tokenRow = await emailVerificationTokenModel.findValidByTokenHash(hashToken(params.token));
    if (!tokenRow) {
      throw AppError.badRequest('This verification link is invalid or has expired.');
    }

    const user = await userModel.findById(tokenRow.user_id);
    if (!user) {
      throw AppError.badRequest('This verification link is invalid or has expired.');
    }

    await userModel.markEmailVerified(user.id);
    await emailVerificationTokenModel.markUsed(tokenRow.id);

    await auditLogModel.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'EMAIL_VERIFIED',
      targetType: 'user',
      targetId: user.id,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    logger.info({ userId: user.id }, 'Email verified');
  },

  async login(params: { email: string; password: string; requestId?: string; ipAddress?: string; userAgent?: string }) {
    await userModel.reactivateExpiredSuspensions();
    const user = await userModel.findByEmail(params.email);

    if (user?.lockout_until) {
      if (user.lockout_until.getTime() > Date.now()) {
        throw AppError.locked(user.lockout_until);
      }
      // Lockout window has passed — clear it lazily so the next check
      // (and the attempt counter) start fresh.
      await userModel.resetLoginAttempts(user.id);
      user.failed_login_attempts = 0;
      user.lockout_until = null;
    }

    // Constant-shape response whether the email exists or the password
    // is wrong — never let a caller distinguish "no such account" from
    // "wrong password".
    const passwordMatches = user ? await bcrypt.compare(params.password, user.password_hash) : await bcrypt.compare(params.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin');

    if (!user || !passwordMatches) {
      if (user) {
        const attempts = await userModel.incrementFailedLoginAttempts(user.id);

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          const lockoutUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS);
          await userModel.setLockout(user.id, lockoutUntil);
          await auditLogModel.record({
            actorUserId: user.id,
            actorRole: user.role,
            action: 'ACCOUNT_LOCKED',
            targetType: 'user',
            targetId: user.id,
            requestId: params.requestId,
            ipAddress: params.ipAddress,
          });
          logger.warn({ userId: user.id }, 'Account locked after too many failed login attempts');
          throw AppError.locked(lockoutUntil);
        }

        if (attempts >= ATTEMPTS_WARNING_THRESHOLD) {
          const remaining = MAX_LOGIN_ATTEMPTS - attempts;
          throw AppError.unauthorized(
            `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is temporarily locked.`,
            { attemptsRemaining: remaining },
          );
        }
      }

      throw AppError.unauthorized('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('This account is not active. Contact support if you believe this is an error.');
    }

    if (user.failed_login_attempts > 0) {
      await userModel.resetLoginAttempts(user.id);
    }

    const tokens = await issueTokenPair(user, { userAgent: params.userAgent, ipAddress: params.ipAddress });

    await auditLogModel.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      targetType: 'user',
      targetId: user.id,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    return { user: toSafeUser(user), ...tokens };
  },

  async refresh(params: { refreshToken: string; ipAddress?: string; userAgent?: string }) {
    let payload;
    try {
      payload = verifyRefreshToken(params.refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    const tokenHash = hashToken(params.refreshToken);
    const session = await sessionModel.findByTokenHash(tokenHash);

    if (!session || session.id !== payload.sid) {
      throw AppError.unauthorized('Refresh token is not recognized.');
    }

    if (session.revoked_at) {
      // Reuse of a revoked/rotated token is a strong signal of theft:
      // revoke the whole session family for this user defensively.
      await sessionModel.revokeAllForUser(session.user_id);
      logger.warn({ userId: session.user_id, sessionId: session.id }, 'Refresh token reuse detected — revoking all sessions');
      throw AppError.unauthorized('This session has been revoked. Please log in again.');
    }

    if (session.expires_at.getTime() < Date.now()) {
      throw AppError.unauthorized('Refresh token has expired. Please log in again.');
    }

    await userModel.reactivateExpiredSuspensions();
    const user = await userModel.findById(session.user_id);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is not active.');
    }

    // Rotate: issue a brand-new refresh token and mark the old one used.
    const newSessionId = randomUUID();
    const newRefreshToken = signRefreshToken({ sub: user.id, sid: newSessionId });
    const newSession = await sessionModel.create({
      id: newSessionId,
      userId: user.id,
      refreshTokenHash: hashToken(newRefreshToken),
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt: refreshExpiryDate(),
    });
    await sessionModel.revokeAndReplace(session.id, newSession.id);

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

    return { user: toSafeUser(user), accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await sessionModel.revoke(payload.sid);
    } catch {
      // Already invalid/expired — logout is idempotent either way.
    }
  },

  async getCurrentUser(userId: string) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return toSafeUser(user);
  },

  async requestPasswordReset(params: { email: string; requestId?: string; ipAddress?: string }): Promise<void> {
    const user = await userModel.findByEmail(params.email);

    // Same response whether or not the account exists — this endpoint
    // must never let a caller learn which emails are registered.
    if (user && user.status === 'ACTIVE') {
      await passwordResetTokenModel.invalidateAllForUser(user.id);

      const rawToken = generateRawToken();
      await passwordResetTokenModel.create({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      });

      const resetUrl = `${env.corsOrigins[0]}/reset-password?token=${rawToken}`;
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Reset your JomDekan password',
          text: `We received a request to reset your JomDekan password.\n\nReset it here (expires in 1 hour, single use):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        });
      } catch (err) {
        // Best-effort, like the verification email in register(): a
        // provider outage must not surface as a 500 here, since that
        // would leak whether the account exists (200 for "no such
        // email" vs. 500 for "exists but the send failed") — exactly
        // what this endpoint's constant-response design exists to hide.
        logger.warn({ userId: user.id, err }, 'Failed to send password reset email');
      }

      await auditLogModel.record({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'user',
        targetId: user.id,
        requestId: params.requestId,
        ipAddress: params.ipAddress,
      });
    }
  },

  async resetPassword(params: { token: string; newPassword: string; requestId?: string; ipAddress?: string }): Promise<void> {
    const tokenRow = await passwordResetTokenModel.findValidByTokenHash(hashToken(params.token));
    if (!tokenRow) {
      throw AppError.badRequest('This password reset link is invalid or has expired.');
    }

    const user = await userModel.findById(tokenRow.user_id);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.badRequest('This password reset link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(params.newPassword, BCRYPT_COST);
    await userModel.updatePassword(user.id, passwordHash);
    await passwordResetTokenModel.markUsed(tokenRow.id);
    // A compromised account must not stay logged in anywhere after reset.
    await sessionModel.revokeAllForUser(user.id);

    await auditLogModel.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'user',
      targetId: user.id,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    logger.info({ userId: user.id }, 'Password reset completed');
  },
};
