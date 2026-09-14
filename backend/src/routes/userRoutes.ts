import { Router } from 'express';
import { profileController } from '../controllers/profileController';
import { validate } from '../config/middleware/validateMiddleware';
import { authenticate } from '../config/middleware/authMiddleware';
import { updateProfileSchema } from '../validators/userValidators';
import { idParamSchema } from '../validators/taxonomyValidators';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user's profile }
 *   patch:
 *     tags: [Users]
 *     summary: Edit the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile updated }
 *       400: { description: Validation error }
 */
router.get('/me', authenticate, profileController.getMe);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), profileController.updateMe);

/**
 * @openapi
 * /users/me/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get counts of the current user's contributions (resources, forum posts, forum comments)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Contribution counts }
 */
router.get('/me/stats', authenticate, profileController.getMyStats);

/**
 * @openapi
 * /users/me/activity:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's recent activity (uploads, forum posts/comments, favorites)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Recent activity feed }
 */
router.get('/me/activity', authenticate, profileController.getMyActivity);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get another user's public profile (for clickable usernames across discussions/resources/comments)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Public profile }
 *       404: { description: User not found }
 */
router.get('/:id', authenticate, validate({ params: idParamSchema }), profileController.getPublicProfile);

export default router;
