import { Router } from "express";
import {
  getOpportunities,
  createOpportunity,
  applyToOpportunity,
  getAllOpportunitiesForAdmin,
  updateOpportunityStatus,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminDeleteOpportunity,
} from "../controllers/opportunityController";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import {
  createOpportunitySchema,
  applyOpportunitySchema,
  updateOpportunityStatusSchema,
  adminCreateOpportunitySchema,
  adminUpdateOpportunitySchema,
  opportunityIdParamSchema,
} from "../validators/opportunityValidators";

const router = Router();

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
router.get("/", getOpportunities);
router.post(
  "/",
  authenticate,
  validate({ body: createOpportunitySchema }),
  createOpportunity,
);

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
  validate({ body: applyOpportunitySchema }),
  applyToOpportunity,
);

export default router;
