import { Router } from "express";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import { resourceController } from "../controllers/resourceController";
import { listAdminResourcesQuerySchema } from "../validators/resourceValidators";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate({ query: listAdminResourcesQuerySchema }),
  resourceController.listAdmin,
);

export default router;
