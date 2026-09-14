import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate } from '../config/middleware/validateMiddleware';
import { authenticate } from '../config/middleware/authMiddleware';
import { authRateLimiter, loginRateLimiter, refreshRateLimiter } from '../config/middleware/rateLimitMiddleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/authValidators';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new USER account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, displayName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               displayName: { type: string }
 *     responses:
 *       201: { description: Account created }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 */
router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *       423: { description: Account temporarily locked after too many failed attempts }
 */
router.post('/login', loginRateLimiter, validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token (read from an HTTP-only cookie) for a new access token
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', refreshRateLimiter, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current session's refresh token
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     description: Always responds 200, whether or not the email is registered, to avoid leaking which emails have accounts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset link sent if the account exists }
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the single-use token from the forgot-password email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Reset token is invalid, expired, or already used }
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm an email address using the token sent at registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified successfully }
 *       400: { description: Verification token is invalid, expired, or already used }
 */
router.post(
  '/verify-email',
  authRateLimiter,
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail,
);

export default router;
