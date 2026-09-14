import { Router } from "express";
import { submitSupportRequest } from "../controllers/supportRequestController";
import { authenticate } from "../config/middleware/authMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import { createSupportRequestSchema } from "../validators/supportRequestValidators";

const router = Router();

/**
 * @openapi
 * /api/v1/support-requests:
 *   post:
 *     summary: Submit a support request or suggestion — notifies admins in-app and by email
 *     tags: [Support]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [SUPPORT, SUGGESTION] }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Support request submitted }
 */
router.post("/", authenticate, validate({ body: createSupportRequestSchema }), submitSupportRequest);

export default router;
