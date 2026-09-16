import { Router } from "express";
import { messageController } from "../controllers/messageController";
import { validate } from "../config/middleware/validateMiddleware";
import { authenticate } from "../config/middleware/authMiddleware";
import {
  conversationIdParamSchema,
  createConversationSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
  listConversationsQuerySchema,
} from "../validators/messageValidators";

const router = Router();

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: List your conversations, most recently active first
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of conversations }
 *   post:
 *     tags: [Messages]
 *     summary: Find or create a conversation with another user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversation id }
 *       400: { description: Cannot message yourself }
 *       404: { description: Target user not found }
 */
router.get(
  "/conversations",
  authenticate,
  validate({ query: listConversationsQuerySchema }),
  messageController.listConversations,
);
router.post(
  "/conversations",
  authenticate,
  validate({ body: createConversationSchema }),
  messageController.createOrGetConversation,
);

/**
 * @openapi
 * /messages/conversations/{conversationId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get a conversation's metadata
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversation detail }
 *       403: { description: Not a participant }
 *       404: { description: Not found }
 */
router.get(
  "/conversations/:conversationId",
  authenticate,
  validate({ params: conversationIdParamSchema }),
  messageController.getConversation,
);

/**
 * @openapi
 * /messages/conversations/{conversationId}/messages:
 *   get:
 *     tags: [Messages]
 *     summary: List messages in a conversation (paginated, oldest last page first)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of messages }
 *       403: { description: Not a participant }
 *   post:
 *     tags: [Messages]
 *     summary: Send a message in a conversation
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Message sent }
 *       403: { description: Not a participant }
 */
router.get(
  "/conversations/:conversationId/messages",
  authenticate,
  validate({ params: conversationIdParamSchema, query: listMessagesQuerySchema }),
  messageController.listMessages,
);
router.post(
  "/conversations/:conversationId/messages",
  authenticate,
  validate({ params: conversationIdParamSchema, body: sendMessageSchema }),
  messageController.sendMessage,
);

/**
 * @openapi
 * /messages/conversations/{conversationId}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark the other participant's messages in this conversation as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Marked as read }
 *       403: { description: Not a participant }
 */
router.patch(
  "/conversations/:conversationId/read",
  authenticate,
  validate({ params: conversationIdParamSchema }),
  messageController.markRead,
);

/**
 * @openapi
 * /messages/unread-count:
 *   get:
 *     tags: [Messages]
 *     summary: Get the total unread message count across all your conversations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get("/unread-count", authenticate, messageController.getUnreadCount);

export default router;
