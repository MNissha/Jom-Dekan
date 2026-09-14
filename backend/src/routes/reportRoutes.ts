import { Router } from "express";
import multer from "multer";
import { reportController } from "../controllers/reportController";
import { validate } from "../config/middleware/validateMiddleware";
import { authenticate } from "../config/middleware/authMiddleware";
import { createReportSchema } from "../validators/reportValidators";
import { authorize } from "../config/middleware/authorizeMiddleware";

const router = Router();
const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

router.get(
  "/:id/evidence",
  authenticate,
  authorize("ADMIN"),
  reportController.evidence,
);

/**
 * @openapi
 * /reports:
 *   post:
 *     tags: [Reports]
 *     summary: File a report against a resource, forum post, or opportunity
 *     description: >
 *       Writes into the same `reports` table the admin moderation queue
 *       reads from. Notifies every admin (in-app notification + email).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Report submitted }
 *       404: { description: Target not found or not visible }
 */
router.post(
  "/",
  authenticate,
  screenshotUpload.single("screenshot"),
  validate({ body: createReportSchema }),
  reportController.create,
);

export default router;
