import { Router } from "express";
import { auditLogController } from "../controllers/auditLogController";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import { listAuditLogsQuerySchema } from "../validators/auditLogValidators";

const router = Router();

/**
 * @openapi
 * /api/v1/admin/logs/users:
 *   get:
 *     tags: [Admin Logs]
 *     summary: List user-initiated activity (ADMIN only) — read-only, the log itself cannot be edited or deleted
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of user activity log entries }
 */
router.get(
  "/admin/logs/users",
  authenticate,
  authorize("ADMIN"),
  validate({ query: listAuditLogsQuerySchema }),
  auditLogController.listUserLogs,
);

/**
 * @openapi
 * /api/v1/admin/logs/admin:
 *   get:
 *     tags: [Admin Logs]
 *     summary: List admin-initiated actions (ADMIN only) — read-only, the log itself cannot be edited or deleted
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of admin action log entries }
 */
router.get(
  "/admin/logs/admin",
  authenticate,
  authorize("ADMIN"),
  validate({ query: listAuditLogsQuerySchema }),
  auditLogController.listAdminLogs,
);

export default router;
