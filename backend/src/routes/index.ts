import { Router } from "express";
import healthRoutes from "./healthRoutes";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import taxonomyRoutes from "./taxonomyRoutes";
import resourceRoutes from "./resourceRoutes";
import resourceSummaryRoutes from "./resourceSummaryRoutes";
import resourceAgentRoutes from "./resourceAgentRoutes";
import favoriteRoutes from "./favoriteRoutes";
import forumRoutes from "./forumRoutes";
import messageRoutes from "./messageRoutes";
import tutorRoutes from "./tutorRoutes";

/**
 * All product routes are mounted under /api/v1. System routes
 * (health/version) are mounted both at the root and under /api/v1 so
 * they work with common infra probes either way.
 */
const router = Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/taxonomy", taxonomyRoutes);
router.use("/resources", resourceRoutes);
router.use("/resources", resourceSummaryRoutes);
router.use("/resources", resourceAgentRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/forum", forumRoutes);
router.use("/messages", messageRoutes);
router.use("/tutors", tutorRoutes);

export default router;
