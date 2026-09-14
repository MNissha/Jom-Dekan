import { Router } from "express";
import {
  getNotifications,
  markNotificationRead,
  getModerationQueue,
  handleModerationAction,
  sendAnnouncement,
} from "../controllers/moderationController";

import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import {
  moderationActionSchema,
  sendAnnouncementSchema,
} from "../validators/moderationValidators";

const router = Router();

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */

router.get("/notifications", authenticate, getNotifications);

/**
 * @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */

router.patch("/notifications/:id/read", authenticate, markNotificationRead);

router.post(
  "/admin/notifications",
  authenticate,
  authorize("ADMIN"),
  validate({ body: sendAnnouncementSchema }),
  sendAnnouncement,
);

/**
 * @openapi
 * /api/v1/admin/moderation/queue:
 *   get:
 *     summary: Get admin moderation queue
 *     tags: [Admin Moderation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pending moderation items
 */

router.get(
  "/admin/moderation/queue",
  authenticate,
  authorize("ADMIN"),
  getModerationQueue,
);

/**
 * @openapi
 * /api/v1/admin/{targetType}/{id}/status:
 *   patch:
 *     summary: Handle admin moderation action with mandatory audit reason
 *     tags: [Admin Moderation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject, quarantine]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Moderation action processed successfully
 */

router.patch(
  "/admin/:targetType/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ body: moderationActionSchema }),
  handleModerationAction,
);

export default router;
