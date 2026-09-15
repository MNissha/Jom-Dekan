import { Router } from "express";
import { resourceSummaryController } from "../controllers/resourceSummaryController";
import { validate } from "../config/middleware/validateMiddleware";
import { authenticate } from "../config/middleware/authMiddleware";
import {
  resourceSummaryResourceIdParamSchema,
  resourceSummaryGetQuerySchema,
  resourceSummaryGenerateBodySchema,
  resourceSummaryDownloadQuerySchema,
} from "../validators/resourceSummaryValidators";

const router = Router();

/**
 * @openapi
 * /resources/{resourceId}/ai-summary:
 *   get:
 *     tags: [Resources]
 *     summary: Get the current AI study summary for a resource (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current summary status/content }
 *       404: { description: Resource not found or not visible }
 *   post:
 *     tags: [Resources]
 *     summary: Generate (or reuse the cached) AI study summary for a resource
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Summary generated or reused from cache }
 *       403: { description: AI summaries are disabled }
 *       409: { description: A generation is already in progress for this resource }
 *       429: { description: Daily AI summary generation limit reached }
 */
router.get(
  "/:resourceId/ai-summary",
  authenticate,
  validate({ params: resourceSummaryResourceIdParamSchema, query: resourceSummaryGetQuerySchema }),
  resourceSummaryController.getSummary,
);
router.post(
  "/:resourceId/ai-summary",
  authenticate,
  validate({ params: resourceSummaryResourceIdParamSchema, body: resourceSummaryGenerateBodySchema }),
  resourceSummaryController.generateSummary,
);

/**
 * @openapi
 * /resources/{resourceId}/ai-summary/download:
 *   get:
 *     tags: [Resources]
 *     summary: Download the cached AI study summary as a PDF or DOCX file (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [pdf, docx] }
 *     responses:
 *       200: { description: File stream }
 *       404: { description: No READY summary available yet }
 */
router.get(
  "/:resourceId/ai-summary/download",
  authenticate,
  validate({
    params: resourceSummaryResourceIdParamSchema,
    query: resourceSummaryDownloadQuerySchema,
  }),
  resourceSummaryController.download,
);

export default router;
