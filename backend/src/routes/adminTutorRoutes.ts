import { Router } from "express";
import { adminTutorController } from "../controllers/adminTutorController";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import {
  applicationIdParamSchema,
  decideApplicationSchema,
  listApplicationsQuerySchema,
} from "../validators/tutorValidators";

const router = Router();

/**
 * @openapi
 * /admin/tutor-applications:
 *   get:
 *     tags: [Admin Tutors]
 *     summary: List tutor applications by status (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of tutor applications }
 */
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate({ query: listApplicationsQuerySchema }),
  adminTutorController.list,
);

/**
 * @openapi
 * /admin/tutor-applications/{id}:
 *   get:
 *     tags: [Admin Tutors]
 *     summary: Get a single tutor application's full detail (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Application detail }
 *       404: { description: Application not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: applicationIdParamSchema }),
  adminTutorController.getOne,
);

/**
 * @openapi
 * /admin/tutor-applications/{id}:
 *   patch:
 *     tags: [Admin Tutors]
 *     summary: Approve or reject a tutor application (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Decision recorded }
 *       400: { description: Already decided, or missing rejection reason }
 *       404: { description: Application not found }
 */
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: applicationIdParamSchema, body: decideApplicationSchema }),
  adminTutorController.decide,
);

/**
 * @openapi
 * /admin/tutor-applications/{id}:
 *   delete:
 *     tags: [Admin Tutors]
 *     summary: Permanently delete a tutor application (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Application deleted }
 *       404: { description: Application not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: applicationIdParamSchema }),
  adminTutorController.remove,
);

export default router;
