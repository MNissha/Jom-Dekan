import { z } from "zod";

export const agentResourceIdParamSchema = z
  .object({ resourceId: z.string().uuid("Invalid resource id.") })
  .strict();

export const agentSessionParamSchema = z
  .object({
    resourceId: z.string().uuid("Invalid resource id."),
    sessionId: z.string().uuid("Invalid session id."),
  })
  .strict();

// Optional everywhere — a text-only or single-file resource never needs
// it; unset falls back to the same deterministic recommendation the AI
// Summary would show. Once a session exists, its OWN stored file binding
// (not a client-resent value) governs every subsequent action on it —
// see resourceAgentService.
const resourceFileIdSchema = z.string().uuid("Invalid file id.").optional();

export const createAgentSessionBodySchema = z
  .object({ resourceFileId: resourceFileIdSchema })
  .strict();

export const agentSuggestionsQuerySchema = z
  .object({ resourceFileId: resourceFileIdSchema })
  .strict();

export const askAgentQuestionBodySchema = z
  .object({
    // Only a generous sanity cap here (not env.aiAgent.maxQuestionCharacters)
    // — the specific, configured business limit is enforced by
    // resourceAgentService with its own AGENT_QUESTION_TOO_LONG code so
    // that error is distinguishable from a generic VALIDATION_ERROR.
    question: z.string().trim().min(1, "Enter a question.").max(20000, "Question is too long."),
    // Optional client-generated key so a retried/double-clicked submit
    // replays the same answer instead of asking OpenAI (and being
    // billed) twice — see resourceAgentModel's idempotency index.
    idempotencyKey: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const listAgentMessagesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50),
  })
  .strict();
