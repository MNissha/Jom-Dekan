import { Router } from "express";
import { adminUserController } from "../controllers/adminUserController";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import {
  userIdParamSchema,
  listAdminUsersQuerySchema,
  adminUserSubListQuerySchema,
  createAdminUserBodySchema,
  updateAdminUserBodySchema,
  updateAdminUserStatusBodySchema,
  userOpportunityParamSchema,
} from "../validators/adminUserValidators";

const router = Router();

router.post("/", authenticate, authorize("ADMIN"), validate({ body: createAdminUserBodySchema }), adminUserController.create);
router.patch("/:id", authenticate, authorize("ADMIN"), validate({ params: userIdParamSchema, body: updateAdminUserBodySchema }), adminUserController.update);
router.patch("/:id/status", authenticate, authorize("ADMIN"), validate({ params: userIdParamSchema, body: updateAdminUserStatusBodySchema }), adminUserController.updateStatus);
router.delete("/:id", authenticate, authorize("ADMIN"), validate({ params: userIdParamSchema }), adminUserController.remove);
router.get("/:id/opportunities/:listingType", authenticate, authorize("ADMIN"), validate({ params: userOpportunityParamSchema, query: adminUserSubListQuerySchema }), adminUserController.getOpportunities);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin Users]
 *     summary: List users with post/comment/like stats (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of users with activity stats }
 *       403: { description: Not an admin }
 */
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate({ query: listAdminUsersQuerySchema }),
  adminUserController.list,
);

/**
 * @openapi
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags: [Admin Users]
 *     summary: Get a single user's profile (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 *       404: { description: User not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: userIdParamSchema }),
  adminUserController.getProfile,
);

/**
 * @openapi
 * /api/v1/admin/users/{id}/resources:
 *   get:
 *     tags: [Admin Users]
 *     summary: List a user's uploaded resources (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of resources }
 */
router.get(
  "/:id/resources",
  authenticate,
  authorize("ADMIN"),
  validate({ params: userIdParamSchema, query: adminUserSubListQuerySchema }),
  adminUserController.getResources,
);

/**
 * @openapi
 * /api/v1/admin/users/{id}/forum:
 *   get:
 *     tags: [Admin Users]
 *     summary: List a user's forum posts and comments (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated forum activity feed }
 */
router.get(
  "/:id/forum",
  authenticate,
  authorize("ADMIN"),
  validate({ params: userIdParamSchema, query: adminUserSubListQuerySchema }),
  adminUserController.getForumActivity,
);

/**
 * @openapi
 * /api/v1/admin/users/{id}/applications:
 *   get:
 *     tags: [Admin Users]
 *     summary: List a user's marketplace applications (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of applications }
 */
router.get(
  "/:id/applications",
  authenticate,
  authorize("ADMIN"),
  validate({ params: userIdParamSchema, query: adminUserSubListQuerySchema }),
  adminUserController.getApplications,
);

export default router;
