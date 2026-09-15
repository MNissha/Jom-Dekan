import { z } from "zod";

/**
 * The one structured shape every AI-generated resource summary must
 * conform to — enforced twice: as the JSON Schema handed to OpenAI's
 * Structured Outputs (`buildAiSummaryJsonSchema` below, so the model
 * literally cannot return anything else) and again here as a Zod schema
 * (`aiSummarySchema`) that independently re-validates the parsed JSON
 * before it is ever persisted. Never trust the first check alone.
 *
 * `sufficientContent` is the one field with no equivalent in the
 * feature spec's example JSON — it is how the model tells us "I looked,
 * and there is nothing summarizable here" (a blank/irrelevant image, a
 * scanned page with no legible text) without us having to guess from the
 * prose in `limitations`. resourceSummaryService treats
 * `sufficientContent: false` as an INSUFFICIENT_CONTENT outcome and
 * never persists this flag into the stored `content` — the 7 documented
 * fields are all a viewer (or the future PDF/DOCX renderer) ever sees.
 */

export const SOURCE_TYPES = ["TEXT_RESOURCE", "EXTRACTED_DOCUMENT", "IMAGE"] as const;
export type AiSummarySourceType = (typeof SOURCE_TYPES)[number];

export const AI_SUMMARY_LIMITS = {
  overviewMaxChars: 1400, // ~180 words
  keyPointsMax: 8,
  keyPointMaxChars: 300,
  studySectionsMax: 8,
  sectionHeadingMaxChars: 120,
  sectionContentMaxChars: 1500,
  topicsMax: 12,
  topicMaxChars: 60,
  glossaryMax: 12,
  glossaryTermMaxChars: 80,
  glossaryDefinitionMaxChars: 400,
  limitationsMax: 5,
  limitationMaxChars: 300,
  languageMaxChars: 60,
} as const;

const L = AI_SUMMARY_LIMITS;

export const aiSummarySchema = z
  .object({
    overview: z.string().trim().min(1).max(L.overviewMaxChars),
    keyPoints: z.array(z.string().trim().min(1).max(L.keyPointMaxChars)).max(L.keyPointsMax),
    studySections: z
      .array(
        z.object({
          heading: z.string().trim().min(1).max(L.sectionHeadingMaxChars),
          content: z.string().trim().min(1).max(L.sectionContentMaxChars),
        }),
      )
      .max(L.studySectionsMax),
    topics: z.array(z.string().trim().min(1).max(L.topicMaxChars)).max(L.topicsMax),
    glossary: z
      .array(
        z.object({
          term: z.string().trim().min(1).max(L.glossaryTermMaxChars),
          definition: z.string().trim().min(1).max(L.glossaryDefinitionMaxChars),
        }),
      )
      .max(L.glossaryMax),
    limitations: z.array(z.string().trim().min(1).max(L.limitationMaxChars)).max(L.limitationsMax),
    language: z.string().trim().min(1).max(L.languageMaxChars),
    sufficientContent: z.boolean(),
  })
  .strict();

export type AiStructuredSummary = z.infer<typeof aiSummarySchema>;

/** The persisted/displayed shape — `sufficientContent` is a routing signal only, never stored. */
export type AiSummaryContent = Omit<AiStructuredSummary, "sufficientContent">;

export function stripInternalFields(summary: AiStructuredSummary): AiSummaryContent {
  return {
    overview: summary.overview,
    keyPoints: summary.keyPoints,
    studySections: summary.studySections,
    topics: summary.topics,
    glossary: summary.glossary,
    limitations: summary.limitations,
    language: summary.language,
  };
}

/**
 * JSON Schema for OpenAI's Structured Outputs (`text.format` on the
 * Responses API). Strict mode requires every property to be listed in
 * `required` and forbids additional properties at every object level.
 */
export function buildAiSummaryJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "overview",
      "keyPoints",
      "studySections",
      "topics",
      "glossary",
      "limitations",
      "language",
      "sufficientContent",
    ],
    properties: {
      overview: { type: "string", maxLength: L.overviewMaxChars },
      keyPoints: {
        type: "array",
        maxItems: L.keyPointsMax,
        items: { type: "string", maxLength: L.keyPointMaxChars },
      },
      studySections: {
        type: "array",
        maxItems: L.studySectionsMax,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["heading", "content"],
          properties: {
            heading: { type: "string", maxLength: L.sectionHeadingMaxChars },
            content: { type: "string", maxLength: L.sectionContentMaxChars },
          },
        },
      },
      topics: {
        type: "array",
        maxItems: L.topicsMax,
        items: { type: "string", maxLength: L.topicMaxChars },
      },
      glossary: {
        type: "array",
        maxItems: L.glossaryMax,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "definition"],
          properties: {
            term: { type: "string", maxLength: L.glossaryTermMaxChars },
            definition: { type: "string", maxLength: L.glossaryDefinitionMaxChars },
          },
        },
      },
      limitations: {
        type: "array",
        maxItems: L.limitationsMax,
        items: { type: "string", maxLength: L.limitationMaxChars },
      },
      language: { type: "string", maxLength: L.languageMaxChars },
      sufficientContent: {
        type: "boolean",
        description:
          "false if the source contains no meaningful academic content, or is too unclear/unreadable to summarize.",
      },
    },
  };
}

export type ContentLengthTier = "MINIMAL" | "SHORT" | "FULL";

/** Mirrors the SHORT-TEXT thresholds in the feature spec. */
export function classifyLengthTier(meaningfulCharacterCount: number): ContentLengthTier {
  if (meaningfulCharacterCount < 20) return "MINIMAL";
  if (meaningfulCharacterCount <= 200) return "SHORT";
  return "FULL";
}
