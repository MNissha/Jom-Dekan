import { z } from "zod";

// Mirrors the backend's default AI_AGENT_MAX_QUESTION_CHARACTERS for the
// on-screen character counter — a UX guard only; the backend enforces
// its own configured limit (AGENT_QUESTION_TOO_LONG) regardless.
export const ASK_RESOURCE_MAX_QUESTION_CHARACTERS = 1000;

export const askResourceQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Enter a question.")
    .max(ASK_RESOURCE_MAX_QUESTION_CHARACTERS, "Question is too long."),
});

export type AskResourceQuestionValues = z.infer<typeof askResourceQuestionSchema>;
