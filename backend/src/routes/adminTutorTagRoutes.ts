import { Router } from "express";
import { adminTutorTagController } from "../controllers/adminTutorTagController";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import { applyTutorSchema, updateTutorProfileSchema, tutorUserIdParamSchema } from "../validators/tutorValidators";

const router = Router();

/**
 * @openapi
 * /admin/tutors/{userId}:
 *   post:
 *     tags: [Admin Tutors]
 *     summary: Grant a user a verified tutor tag directly, with no application behind it (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tag granted }
 *       400: { description: User is already a verified tutor }
 *       404: { description: User not found }
 */
router.post(
  "/:userId",
  authenticate,
  authorize("ADMIN"),
  validate({ params: tutorUserIdParamSchema, body: applyTutorSchema }),
  adminTutorTagController.grant,
);

/**
 * @openapi
 * /admin/tutors/{userId}:
 *   patch:
 *     tags: [Admin Tutors]
 *     summary: Edit a verified tutor's tag fields directly (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tag updated }
 *       404: { description: This user is not a verified tutor }
 */
router.patch(
  "/:userId",
  authenticate,
  authorize("ADMIN"),
  validate({ params: tutorUserIdParamSchema, body: updateTutorProfileSchema }),
  adminTutorTagController.update,
);

/**
 * @openapi
 * /admin/tutors/{userId}:
 *   delete:
 *     tags: [Admin Tutors]
 *     summary: Revoke a user's verified tutor tag directly, without deleting their application history (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Tag revoked }
 *       404: { description: This user is not a verified tutor }
 */
router.delete(
  "/:userId",
  authenticate,
  authorize("ADMIN"),
  validate({ params: tutorUserIdParamSchema }),
  adminTutorTagController.revoke,
);

export default router;
