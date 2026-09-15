import { z } from "zod";

/**
 * The structured shape every agent answer must conform to — enforced
 * twice, exactly like Phase 1's aiSummarySchema: as the JSON Schema
 * handed to OpenAI's Structured Outputs (`buildAgentAnswerJsonSchema`,
 * so the model cannot return anything else) and again here as a Zod
 * schema that independently re-validates the parsed JSON. The backend
 * additionally re-verifies every citation's `chunkId` against the set
 * of chunk IDs actually returned during this request's tool-execution
 * loop — a well-formed-but-invented UUID from the model is not enough
 * to be treated as a real citation (see resourceAgentService).
 */

export const ANSWER_STATUSES = ["ANSWERED", "PARTIAL", "NOT_FOUND"] as const;
export type AgentAnswerStatus = (typeof ANSWER_STATUSES)[number];

export const AGENT_ANSWER_LIMITS = {
  answerMaxChars: 2400, // ~600 output tokens
  citationsMax: 5,
  sourceLabelMaxChars: 60,
  sectionTitleMaxChars: 120,
  excerptMaxChars: 300,
  suggestedQuestionsMax: 3,
  suggestedQuestionMaxChars: 150,
} as const;

const L = AGENT_ANSWER_LIMITS;

export const agentCitationSchema = z
  .object({
    chunkId: z.string().uuid(),
    pageNumber: z.number().int().positive().nullable(),
    sectionTitle: z.string().trim().max(L.sectionTitleMaxChars).nullable(),
    sourceLabel: z.string().trim().min(1).max(L.sourceLabelMaxChars),
    supportingExcerpt: z.string().trim().max(L.excerptMaxChars),
  })
  .strict();

export type AgentCitation = z.infer<typeof agentCitationSchema>;

export const agentAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(L.answerMaxChars),
    answerStatus: z.enum(ANSWER_STATUSES),
    citations: z.array(agentCitationSchema).max(L.citationsMax),
    suggestedQuestions: z.array(z.string().trim().min(1).max(L.suggestedQuestionMaxChars)).max(
      L.suggestedQuestionsMax,
    ),
  })
  .strict();

export type AgentStructuredAnswer = z.infer<typeof agentAnswerSchema>;

/**
 * JSON Schema for OpenAI's Structured Outputs (`text.format` on the
 * Responses API). Strict mode requires every property in `required`
 * and forbids additional properties at every object level; nullable
 * fields use a `["type", "null"]` union rather than an optional key.
 */
export function buildAgentAnswerJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["answer", "answerStatus", "citations", "suggestedQuestions"],
    properties: {
      answer: { type: "string", maxLength: L.answerMaxChars },
      answerStatus: { type: "string", enum: ANSWER_STATUSES },
      citations: {
        type: "array",
        maxItems: L.citationsMax,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["chunkId", "pageNumber", "sectionTitle", "sourceLabel", "supportingExcerpt"],
          properties: {
            chunkId: {
              type: "string",
              description: "Must be a chunkId exactly as returned by a resource tool call in this turn — never invented.",
            },
            pageNumber: { type: ["integer", "null"] },
            sectionTitle: { type: ["string", "null"], maxLength: L.sectionTitleMaxChars },
            sourceLabel: { type: "string", maxLength: L.sourceLabelMaxChars },
            supportingExcerpt: { type: "string", maxLength: L.excerptMaxChars },
          },
        },
      },
      suggestedQuestions: {
        type: "array",
        maxItems: L.suggestedQuestionsMax,
        items: { type: "string", maxLength: L.suggestedQuestionMaxChars },
      },
    },
  };
}

/** A single retrieved/read piece of resource evidence, as returned to the model by a tool call. */
export interface AgentEvidenceChunk {
  chunkId: string;
  sourceLabel: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  content: string;
}

export type AgentSourceKind = "TEXT_RESOURCE" | "EXTRACTED_DOCUMENT" | "IMAGE";
