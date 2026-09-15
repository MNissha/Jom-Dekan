import { Router } from "express";
import { resourceAgentController } from "../controllers/resourceAgentController";
import { validate } from "../config/middleware/validateMiddleware";
import { authenticate } from "../config/middleware/authMiddleware";
import {
  agentResourceIdParamSchema,
  agentSessionParamSchema,
  createAgentSessionBodySchema,
  askAgentQuestionBodySchema,
  listAgentMessagesQuerySchema,
  agentSuggestionsQuerySchema,
} from "../validators/resourceAgentValidators";

const router = Router();

/**
 * @openapi
 * /resources/{resourceId}/agent/sessions:
 *   post:
 *     tags: [Resources]
 *     summary: Get or create the caller's "Ask This Resource" session for this resource (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active session (existing or newly created) }
 *       403: { description: The study assistant is disabled }
 *       409: { description: This resource isn't supported by the study assistant yet }
 */
router.post(
  "/:resourceId/agent/sessions",
  authenticate,
  validate({ params: agentResourceIdParamSchema, body: createAgentSessionBodySchema }),
  resourceAgentController.createSession,
);

/**
 * @openapi
 * /resources/{resourceId}/agent/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Resources]
 *     summary: List a session's messages in chronological order (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated messages }
 *       403: { description: Not the session owner }
 *       404: { description: Session not found }
 *   post:
 *     tags: [Resources]
 *     summary: Ask a question grounded in the current resource
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Assistant answer }
 *       409: { description: Session stale/cleared, or a request for the same question is already in progress }
 *       429: { description: Daily or per-session limit reached }
 */
router.get(
  "/:resourceId/agent/sessions/:sessionId/messages",
  authenticate,
  validate({ params: agentSessionParamSchema, query: listAgentMessagesQuerySchema }),
  resourceAgentController.listMessages,
);
router.post(
  "/:resourceId/agent/sessions/:sessionId/messages",
  authenticate,
  validate({ params: agentSessionParamSchema, body: askAgentQuestionBodySchema }),
  resourceAgentController.askQuestion,
);

/**
 * @openapi
 * /resources/{resourceId}/agent/sessions/{sessionId}:
 *   delete:
 *     tags: [Resources]
 *     summary: Clear the caller's own conversation for this resource (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversation cleared }
 *       403: { description: Not the session owner }
 */
router.delete(
  "/:resourceId/agent/sessions/:sessionId",
  authenticate,
  validate({ params: agentSessionParamSchema }),
  resourceAgentController.clearSession,
);

/**
 * @openapi
 * /resources/{resourceId}/agent/suggestions:
 *   get:
 *     tags: [Resources]
 *     summary: Deterministic starter questions derived from the cached Phase 1 summary (never calls OpenAI)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Suggested starter questions }
 */
router.get(
  "/:resourceId/agent/suggestions",
  authenticate,
  validate({ params: agentResourceIdParamSchema, query: agentSuggestionsQuerySchema }),
  resourceAgentController.getSuggestions,
);

export default router;
