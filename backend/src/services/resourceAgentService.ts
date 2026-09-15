import { randomUUID, createHash } from "crypto";
import { resourceService } from "./resourceService";
import { resolveSource } from "./resourceSummaryService";
import { resourceSummaryModel } from "../models/resourceSummaryModel";
import type { ResourceRow } from "../models/resourceModel";
import { taxonomyModel } from "../models/taxonomyModel";
import {
  resourceAgentModel,
  toApiAgentMessage,
  toApiAgentSession,
  type ResourceAgentMessageRow,
} from "../models/resourceAgentModel";
import { resourceChunkService } from "./resourceChunkService";
import { openaiAgentService, OpenAiAgentError } from "./openaiAgentService";
import { auditLogModel } from "../models/auditLogModel";
import { env } from "../config/config/env";
import { AppError } from "../types/errors";
import { AgentUnsupportedSourceError } from "../types/resourceAgentErrors";
import { normalizeWhitespace } from "./resourceTextExtractionService";
import type { AiSummaryContent } from "../types/aiSummary";
import { AGENT_ANSWER_LIMITS } from "../types/resourceAgent";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  PAST_PAPER: "Past paper",
  NOTES: "Notes",
  SLIDES: "Slides",
  ARTICLE: "Article",
  EXCEL: "Excel",
  EXERCISES: "Exercises",
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return expiresAt != null && expiresAt.getTime() <= now.getTime();
}

function hashNormalizedQuestion(question: string): string {
  const normalized = normalizeWhitespace(question).toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Resolves the resource's current grounding source and requires a READY
 * Phase 1 summary for it — the agent is deliberately gated on Phase 1
 * having already proven this exact content is summarizable at all
 * (right mime type, enough extractable text, etc.) rather than
 * re-deciding support independently.
 */
async function resolveGroundedSource(resourceId: string, ctx: ActorContext, requestedFileId?: string) {
  const resource = await resourceService.getVisibleResource(resourceId, ctx);
  const { sourceType, sourceHash, file } = await resolveSource(resource, requestedFileId);
  const summaryRow = await resourceSummaryModel.findCurrent(resource.id, sourceHash);

  if (!summaryRow || summaryRow.status === "PROCESSING") {
    throw new AppError(
      409,
      "AGENT_UNSUPPORTED_SOURCE",
      "Generate the AI summary for this resource first, then ask questions about it.",
    );
  }
  if (summaryRow.status !== "READY" || !summaryRow.content) {
    throw new AppError(
      409,
      "AGENT_UNSUPPORTED_SOURCE",
      "This resource's content isn't currently supported by the study assistant.",
    );
  }

  return {
    resource,
    sourceType,
    sourceHash,
    file,
    summary: summaryRow.content as AiSummaryContent,
  };
}

async function buildResourceContext(resource: ResourceRow, summary: AiSummaryContent): Promise<string> {
  const subject = resource.subject_id ? await taxonomyModel.subjects.findById(resource.subject_id) : null;
  const lines = [
    `Resource title: ${resource.title}`,
    `Category: ${CATEGORY_LABELS[resource.category] ?? resource.category}`,
    subject ? `Subject: ${subject.name}` : null,
    `Detected language: ${summary.language}`,
    `Cached overview: ${summary.overview}`,
    summary.keyPoints.length > 0 ? `Cached key points:\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}` : null,
    summary.topics.length > 0 ? `Cached topics: ${summary.topics.join(", ")}` : null,
    summary.limitations.length > 0
      ? `Known limitations of this resource's cached data:\n${summary.limitations.map((l) => `- ${l}`).join("\n")}`
      : null,
  ].filter((l): l is string => Boolean(l));
  return lines.join("\n");
}

function mapAgentFailure(err: unknown): { code: string; message: string } {
  if (err instanceof OpenAiAgentError) return { code: err.code, message: err.message };
  return { code: "AGENT_PROVIDER_UNAVAILABLE", message: "The study assistant is temporarily unavailable." };
}

async function assertSessionOwnedAndCurrent(
  resource: ResourceRow,
  sessionId: string,
  ctx: ActorContext,
) {
  const session = await resourceAgentModel.sessions.findById(sessionId);
  if (!session || session.resource_id !== resource.id) {
    throw new AppError(404, "AGENT_SESSION_NOT_FOUND", "This conversation could not be found.");
  }
  if (session.user_id !== ctx.actorUserId) {
    throw new AppError(403, "AGENT_SESSION_FORBIDDEN", "You do not have access to this conversation.");
  }
  return session;
}

export const resourceAgentService = {
  /**
   * Reuses the caller's current ACTIVE session for this resource if it
   * still matches the resource's current source hash and hasn't
   * expired; otherwise starts a fresh one. Never calls OpenAI — lazily
   * (re)builds the resource's chunk index if needed, which is itself
   * pure local extraction + Postgres writes, no OpenAI involved.
   */
  async getOrCreateSession(resourceId: string, ctx: ActorContext, requestedFileId?: string) {
    if (!env.aiAgent.enabled) {
      throw new AppError(403, "AI_AGENT_DISABLED", "The study assistant is currently disabled.");
    }

    const { resource, sourceType, sourceHash, file, summary } = await resolveGroundedSource(
      resourceId,
      ctx,
      requestedFileId,
    );

    const now = new Date();
    const expiresAt = addDays(now, env.aiAgent.sessionExpiryDays);
    const latest = await resourceAgentModel.sessions.findLatestForUserResource(ctx.actorUserId, resource.id);

    let sourceChanged = false;
    let session = latest;
    if (!latest || latest.source_hash !== sourceHash || isExpired(latest.expires_at, now)) {
      sourceChanged = Boolean(latest && latest.source_hash !== sourceHash);
      // At most one ACTIVE session per (user, resource) at a time — a
      // switch to a different file (or a content change under the same
      // file) explicitly closes the old conversation rather than leaving
      // it silently orphaned but still nominally ACTIVE.
      if (latest && sourceChanged) {
        await resourceAgentModel.sessions.markCleared(latest.id);
      }
      session = await resourceAgentModel.sessions.create({
        userId: ctx.actorUserId,
        resourceId: resource.id,
        resourceFileId: file?.id ?? null,
        sourceHash,
        title: resource.title,
        expiresAt,
      });
    } else {
      await resourceAgentModel.sessions.touch(latest.id, expiresAt);
    }

    await resourceChunkService.ensureChunksForResource({ resource, file, sourceType, sourceHash, cachedSummary: summary });

    return { session: toApiAgentSession(session!), sourceChanged };
  },

  async listMessages(
    resourceId: string,
    sessionId: string,
    ctx: ActorContext,
    params: { page: number; pageSize: number },
  ) {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const session = await assertSessionOwnedAndCurrent(resource, sessionId, ctx);

    // Re-resolved against the SAME file this session was bound to (not a
    // freshly-derived default), so a session on a non-recommended file in
    // a multi-file resource is never mistaken for stale.
    const { sourceHash } = await resolveSource(resource, session.resource_file_id ?? undefined);
    const { rows, total } = await resourceAgentModel.messages.listBySession(sessionId, {
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
    });

    return {
      data: rows.map(toApiAgentMessage),
      meta: { page: params.page, pageSize: params.pageSize, total },
      session: toApiAgentSession(session),
      sourceChanged: session.source_hash !== sourceHash,
    };
  },

  /**
   * Deterministic starter questions from Phase 1's cached topics/key
   * points — no AI call, matching "do not generate suggested questions
   * through a separate AI request".
   */
  async getSuggestions(
    resourceId: string,
    ctx: ActorContext,
    requestedFileId?: string,
  ): Promise<{ suggestions: string[] }> {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const { sourceHash } = await resolveSource(resource, requestedFileId);
    const row = await resourceSummaryModel.findCurrent(resource.id, sourceHash);
    if (!row || row.status !== "READY" || !row.content) return { suggestions: [] };

    const summary = row.content as AiSummaryContent;
    const suggestions: string[] = ["What are the main concepts in this document?"];
    for (const topic of summary.topics.slice(0, 2)) {
      suggestions.push(`Explain ${topic} in simpler language.`);
    }
    if (summary.glossary.length > 0) {
      suggestions.push(`What does "${summary.glossary[0].term}" mean according to this resource?`);
    }
    suggestions.push("Create five revision questions using this resource.");
    return { suggestions: suggestions.slice(0, 5) };
  },

  async clearSession(resourceId: string, sessionId: string, ctx: ActorContext) {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const session = await assertSessionOwnedAndCurrent(resource, sessionId, ctx);
    const cleared = await resourceAgentModel.sessions.markCleared(session.id);
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "AI_AGENT_SESSION_CLEARED",
      targetType: "resource_agent_session",
      targetId: session.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return toApiAgentSession(cleared!);
  },

  /**
   * The core question-answering flow. Ordering is deliberate:
   * idempotency replay -> session/limit checks -> daily limit -> claim
   * the USER row -> exact-answer cache -> OpenAI. Nothing is inserted
   * before the daily-limit check passes, and the one thing that *is*
   * inserted before the (possibly failing) OpenAI call — the claimed
   * USER message — is rolled back if that call fails, so a failed
   * generation never leaves an unanswered orphan message behind.
   */
  async askQuestion(
    resourceId: string,
    sessionId: string,
    ctx: ActorContext,
    input: { question: string; idempotencyKey?: string },
  ) {
    if (!env.aiAgent.enabled) {
      throw new AppError(403, "AI_AGENT_DISABLED", "The study assistant is currently disabled.");
    }

    const question = input.question.trim();
    if (question.length === 0) {
      throw AppError.badRequest("Enter a question.");
    }
    if (question.length > env.aiAgent.maxQuestionCharacters) {
      throw new AppError(
        400,
        "AGENT_QUESTION_TOO_LONG",
        `Questions must be ${env.aiAgent.maxQuestionCharacters} characters or fewer.`,
      );
    }

    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const session = await assertSessionOwnedAndCurrent(resource, sessionId, ctx);
    if (session.status !== "ACTIVE") {
      throw new AppError(409, "AGENT_SESSION_STALE", "This conversation has been cleared. Start a new one.");
    }

    const { sourceType, sourceHash, summary } = await resolveGroundedSource(
      resource.id,
      ctx,
      session.resource_file_id ?? undefined,
    );
    if (session.source_hash !== sourceHash) {
      throw new AppError(
        409,
        "AGENT_SESSION_STALE",
        "This resource has changed since this conversation started. Start a new conversation.",
      );
    }

    const idempotencyKey = input.idempotencyKey?.trim().slice(0, 100) || randomUUID();

    // A pure replay of an already-completed turn never touches any limit.
    const existingAnswer = await resourceAgentModel.messages.findAssistantByIdempotencyKey(sessionId, idempotencyKey);
    if (existingAnswer) return toApiAgentMessage(existingAnswer);

    const messageCount = await resourceAgentModel.messages.countBySession(sessionId);
    if (messageCount >= env.aiAgent.sessionMessageLimit) {
      throw new AppError(
        429,
        "AGENT_SESSION_LIMIT_REACHED",
        `This conversation has reached its ${env.aiAgent.sessionMessageLimit}-message limit. Start a new conversation.`,
      );
    }

    const usedToday = await resourceAgentModel.messages.countQuestionsTodayForUser(ctx.actorUserId);
    if (usedToday >= env.aiAgent.dailyUserLimit) {
      throw new AppError(
        429,
        "AGENT_DAILY_LIMIT_REACHED",
        `You've reached today's limit of ${env.aiAgent.dailyUserLimit} study-assistant questions. Please try again tomorrow.`,
      );
    }

    // Bounded history fetched *before* claiming this turn's own USER row,
    // so it never includes the question currently being asked.
    const historyRows = await resourceAgentModel.messages.recentTurns(sessionId, env.aiAgent.contextTurns);

    const userMessage = await resourceAgentModel.messages.claimUserMessage({
      sessionId,
      content: question,
      idempotencyKey,
    });
    if (!userMessage) {
      const raced = await resourceAgentModel.messages.findAssistantByIdempotencyKey(sessionId, idempotencyKey);
      if (raced) return toApiAgentMessage(raced);
      throw new AppError(409, "AGENT_REQUEST_IN_PROGRESS", "This question is already being answered. Please wait a moment.");
    }

    try {
      const normalizedQuestionHash = hashNormalizedQuestion(question);
      const cached = await resourceAgentModel.answerCache.find({
        resourceId: resource.id,
        sourceHash,
        normalizedQuestionHash,
      });
      if (cached) {
        const assistantMessage = await resourceAgentModel.messages.insertAssistantMessage({
          sessionId,
          content: cached.answer,
          citations: cached.citations,
          suggestedQuestions: cached.suggested_questions,
          model: cached.model,
          inputTokens: null,
          outputTokens: null,
          cachedInputTokens: null,
          requestId: null,
          idempotencyKey,
        });
        return toApiAgentMessage(assistantMessage);
      }

      const resourceContext = await buildResourceContext(resource, summary);
      const contextMessages = historyRows.map((row: ResourceAgentMessageRow) => ({
        role: row.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: row.content,
      }));

      const result = await openaiAgentService.runAgentTurn({
        resourceContext,
        contextMessages,
        question,
        safetyIdentifier: openaiAgentService.hashUserIdForSafetyIdentifier(ctx.actorUserId),
        promptCacheKey: `agent:${resource.id}:${sourceHash.slice(0, 16)}`,
        executors: {
          async getSummary() {
            return {
              title: resource.title,
              category: CATEGORY_LABELS[resource.category] ?? resource.category,
              overview: summary.overview,
              keyPoints: summary.keyPoints,
              topics: summary.topics,
              limitations: summary.limitations,
              language: summary.language,
            };
          },
          async search(query: string) {
            return resourceChunkService.search({ resourceId: resource.id, sourceHash, sourceType, query });
          },
          async readSections(chunkIds: string[]) {
            return resourceChunkService.readByIds({ resourceId: resource.id, sourceHash, sourceType, chunkIds });
          },
        },
      });

      // Every cited chunkId must have actually been returned by a tool
      // call during *this* turn — anything else is an invented citation
      // and is dropped rather than trusted.
      const validCitations =
        result.answer.answerStatus === "NOT_FOUND"
          ? []
          : result.answer.citations
              .filter((c) => result.evidenceChunkIds.has(c.chunkId))
              .slice(0, AGENT_ANSWER_LIMITS.citationsMax);

      const assistantMessage = await resourceAgentModel.messages.insertAssistantMessage({
        sessionId,
        content: result.answer.answer,
        citations: validCitations,
        suggestedQuestions: result.answer.suggestedQuestions,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cachedInputTokens: result.cachedInputTokens,
        requestId: result.requestId,
        idempotencyKey,
      });

      if (result.answer.answerStatus !== "PARTIAL") {
        await resourceAgentModel.answerCache.upsert({
          resourceId: resource.id,
          sourceHash,
          normalizedQuestionHash,
          answer: result.answer.answer,
          answerStatus: result.answer.answerStatus,
          citations: validCitations,
          suggestedQuestions: result.answer.suggestedQuestions,
          model: result.model,
        });
      }

      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "AI_AGENT_QUESTION_ANSWERED",
        targetType: "resource",
        targetId: resource.id,
        metadata: { answerStatus: result.answer.answerStatus, model: result.model },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });

      return toApiAgentMessage(assistantMessage);
    } catch (err) {
      // Compensating rollback — no long-lived transaction is held across
      // the (slow, external) OpenAI call itself.
      await resourceAgentModel.messages.deleteById(userMessage.id);

      if (err instanceof AgentUnsupportedSourceError) {
        throw new AppError(409, "AGENT_UNSUPPORTED_SOURCE", err.message);
      }
      const { code, message } = mapAgentFailure(err);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "AI_AGENT_QUESTION_FAILED",
        targetType: "resource",
        targetId: resource.id,
        metadata: { errorCode: code },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      throw new AppError(502, code, message);
    }
  },
};
