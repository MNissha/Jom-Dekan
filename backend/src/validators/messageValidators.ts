import { z } from "zod";

export const conversationIdParamSchema = z
  .object({ conversationId: z.string().uuid("Invalid id.") })
  .strict();

export const createConversationSchema = z
  .object({ userId: z.string().uuid("Invalid id.") })
  .strict();

export const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1, "Message cannot be empty.").max(4000),
  })
  .strict();

export const listMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().uuid().optional(),
  })
  .strict();

export const listConversationsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  })
  .strict();
