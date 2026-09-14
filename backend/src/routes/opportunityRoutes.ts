import { Router } from "express";
import multer from "multer";
import {
  getOpportunities,
  getMyOpportunities,
  createOpportunity,
  applyToOpportunity,
  getApplicationsForOpportunity,
  updateApplicationStatus,
  getApplicationFile,
  getAllOpportunitiesForAdmin,
  updateOpportunityStatus,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminDeleteOpportunity,
} from "../controllers/opportunityController";
import { authenticate, optionalAuthenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import {
  createOpportunitySchema,
  applyOpportunitySchema,
  updateOpportunityStatusSchema,
  adminCreateOpportunitySchema,
  adminUpdateOpportunitySchema,
  opportunityIdParamSchema,
  applicationStatusSchema,
  applicationIdParamSchema,
  applicationFileParamSchema,
} from "../validators/opportunityValidators";

const router = Router();

const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(
      null,
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ].includes(file.mimetype),
    );
  },
});

router.post("/admin", authenticate, authorize("ADMIN"), validate({ body: adminCreateOpportunitySchema }), adminCreateOpportunity);
router.patch("/admin/:id", authenticate, authorize("ADMIN"), validate({ params: opportunityIdParamSchema, body: adminUpdateOpportunitySchema }), adminUpdateOpportunity);
router.delete("/admin/:id", authenticate, authorize("ADMIN"), validate({ params: opportunityIdParamSchema }), adminDeleteOpportunity);

/**
 * @openapi
 * /api/v1/opportunities/admin/all:
 *   get:
 *     summary: List every opportunity listing, any status (ADMIN only)
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: List of all opportunities }
 *       403: { description: Not an admin }
 */
router.get(
  "/admin/all",
  authenticate,
  authorize("ADMIN"),
  getAllOpportunitiesForAdmin,
);

/**
 * @openapi
 * /api/v1/opportunities/{id}/status:
 *   patch:
 *     summary: Approve, suspend, or close a listing (ADMIN only)
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [active, closed] }
 *     responses:
 *       200: { description: Status updated }
 *       403: { description: Not an admin }
 *       404: { description: Opportunity not found }
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ body: updateOpportunityStatusSchema }),
  updateOpportunityStatus,
);

/**
 * @openapi
 * /api/v1/opportunities:
 *   get:
 *     summary: Get all active marketplace opportunities
 *     tags: [Opportunities]
 *     responses:
 *       200:
 *         description: List of active opportunities
 *   post:
 *     summary: Create a new opportunity listing
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Opportunity created successfully
 */
router.get("/", optionalAuthenticate, getOpportunities);
router.post(
  "/",
  authenticate,
  validate({ body: createOpportunitySchema }),
  createOpportunity,
);

/**
 * @openapi
 * /api/v1/opportunities/mine:
 *   get:
 *     summary: List every listing you've posted, any status
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: List of your listings }
 */
router.get("/mine", authenticate, getMyOpportunities);

/**
 * @openapi
 * /api/v1/opportunities/{id}/applications:
 *   post:
 *     summary: Apply to an opportunity listing
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Application submitted }
 *       409: { description: Already applied }
 */
router.post(
  "/:id/applications",
  authenticate,
  applicationUpload.fields([
    { name: "cv", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
  ]),
  validate({ params: opportunityIdParamSchema, body: applyOpportunitySchema }),
  applyToOpportunity,
);

/**
 * @openapi
 * /api/v1/opportunities/{id}/applications:
 *   get:
 *     summary: List applications for a listing you own (or ADMIN)
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of applications }
 *       403: { description: Not the listing owner }
 */
router.get(
  "/:id/applications",
  authenticate,
  validate({ params: opportunityIdParamSchema }),
  getApplicationsForOpportunity,
);

/**
 * @openapi
 * /api/v1/opportunities/applications/{applicationId}/status:
 *   patch:
 *     summary: Accept or decline an application (listing owner or ADMIN)
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Application updated }
 *       403: { description: Not the listing owner }
 *       404: { description: Application not found }
 */
router.patch(
  "/applications/:applicationId/status",
  authenticate,
  validate({ params: applicationIdParamSchema, body: applicationStatusSchema }),
  updateApplicationStatus,
);

/**
 * @openapi
 * /api/v1/opportunities/applications/{applicationId}/files/{kind}:
 *   get:
 *     summary: Download an applicant's CV or portfolio file (listing owner, the applicant, or ADMIN)
 *     tags: [Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: kind
 *         required: true
 *         schema: { type: string, enum: [cv, portfolio] }
 *     responses:
 *       200: { description: File stream }
 *       403: { description: Not authorized }
 *       404: { description: File not found }
 */
router.get(
  "/applications/:applicationId/files/:kind",
  authenticate,
  validate({ params: applicationFileParamSchema }),
  getApplicationFile,
);

export default router;
