import { resourceModel, type ResourceFileRow, type ResourceRow } from "../models/resourceModel";
import {
  resourceSummaryModel,
  type ResourceAiSummaryRow,
} from "../models/resourceSummaryModel";
import { resourceService } from "./resourceService";
import { taxonomyModel } from "../models/taxonomyModel";
import { auditLogModel } from "../models/auditLogModel";
import {
  resourceTextExtractionService,
  isImageMimeType,
  hashTextResource,
  type ExtractionResult,
} from "./resourceTextExtractionService";
import { openaiSummaryService, OpenAiSummaryError } from "./openaiSummaryService";
import {
  pickRecommendedFile,
  listAvailableSources,
  describeSelectedFile,
  resolveRequestedFile,
  type AiSourceDescriptor,
} from "./resourceSourceSelectionService";
import { env } from "../config/config/env";
import { AppError } from "../types/errors";
import { ResourceSummaryUnsupportedError } from "../types/resourceSummaryErrors";
import {
  AI_SUMMARY_LIMITS,
  stripInternalFields,
  type AiSummaryContent,
  type AiSummarySourceType,
} from "../types/aiSummary";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

export type ResourceSummaryViewStatus =
  | "DISABLED"
  | "NOT_GENERATED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "UNSUPPORTED";

export interface ResourceSummarySourceInfo {
  selectedSource: AiSourceDescriptor | null;
  availableSources: AiSourceDescriptor[];
}

export interface ResourceSummaryView extends ResourceSummarySourceInfo {
  status: ResourceSummaryViewStatus;
  sourceType: AiSummarySourceType;
  summary: AiSummaryContent | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  generatedAt: string | null;
  updatedAt: string | null;
}

export interface ResolvedSource {
  sourceType: AiSummarySourceType;
  sourceHash: string;
  file: ResourceFileRow | null;
}

/**
 * Deterministic, side-effect-free choice of "what this resource's
 * current AI-summary source is":
 *
 *   - an explicit `requestedFileId` wins outright, once validated
 *     (belongs to this resource, is READY) — a caller that has shown the
 *     user a specific file must never be silently overridden;
 *   - otherwise, a single READY file is used automatically;
 *   - otherwise, among several READY files, the recommended one (MIME-
 *     type priority — see resourceSourceSelectionService) is used, so an
 *     unconfirmed multi-file resource never analyzes an arbitrary one;
 *   - otherwise (no READY file at all), the title+description.
 *
 * Cheap: no file bytes are read here, only what's already in the
 * resource_files row (in particular the checksum computed at
 * upload-confirm time), so both the read-only GET endpoint and the
 * generation path can call this freely — and exactly once per request,
 * since it also does the requestedFileId validation inline rather than
 * requiring a second lookup.
 *
 * Exported for reuse by resourceAgentService (Phase 2) — the agent's
 * source-hash binding must agree with Phase 1's exactly, so it's the
 * same function, not a re-derived copy of the same logic.
 */
export async function resolveSource(
  resource: ResourceRow,
  requestedFileId?: string,
): Promise<ResolvedSource> {
  const files = await resourceModel.files.findByResourceId(resource.id);
  const readyFiles = files.filter((f) => f.status === "READY");

  let file: ResourceFileRow | null;
  if (requestedFileId) {
    file = resolveRequestedFile(files, requestedFileId);
  } else if (readyFiles.length <= 1) {
    file = readyFiles[0] ?? null;
  } else {
    file = pickRecommendedFile(readyFiles);
  }

  if (!file) {
    return {
      sourceType: "TEXT_RESOURCE",
      sourceHash: hashTextResource(resource.title, resource.description ?? ""),
      file: null,
    };
  }

  return {
    sourceType: isImageMimeType(file.detected_mime_type) ? "IMAGE" : "EXTRACTED_DOCUMENT",
    // Always present once a file is READY (set at upload-confirm time).
    sourceHash: file.checksum_sha256 ?? file.id,
    file,
  };
}

/**
 * The UI-facing description of "what is being analyzed and what else
 * could be" for a resource — never the storage key or checksum, only
 * what the AI-source selector needs to render. `availableSources` is
 * omitted (empty) for a text-only resource, since there is nothing to
 * choose between.
 */
export async function getSourceOptions(resource: ResourceRow, file: ResourceFileRow | null): Promise<ResourceSummarySourceInfo> {
  if (!file) return { selectedSource: null, availableSources: [] };

  const files = await resourceModel.files.findByResourceId(resource.id);
  const readyFiles = files.filter((f) => f.status === "READY");
  const available = listAvailableSources(readyFiles);
  const selected = available.find((s) => s.resourceFileId === file.id);

  return {
    selectedSource: selected ?? { ...describeSelectedFile(file), recommended: false },
    availableSources: available,
  };
}

function rowToView(
  row: ResourceAiSummaryRow,
  sourceType: AiSummarySourceType,
  sourceInfo: ResourceSummarySourceInfo,
): ResourceSummaryView {
  return {
    ...sourceInfo,
    status: row.status,
    sourceType,
    summary: row.status === "READY" ? (row.content as AiSummaryContent | null) : null,
    model: row.model,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    generatedAt: row.generated_at ? row.generated_at.toISOString() : null,
    updatedAt: row.updated_at.toISOString(),
  };
}

function disabledView(sourceType: AiSummarySourceType, sourceInfo: ResourceSummarySourceInfo): ResourceSummaryView {
  return {
    ...sourceInfo,
    status: "DISABLED",
    sourceType,
    summary: null,
    model: null,
    errorCode: null,
    errorMessage: null,
    generatedAt: null,
    updatedAt: null,
  };
}

function notGeneratedView(sourceType: AiSummarySourceType, sourceInfo: ResourceSummarySourceInfo): ResourceSummaryView {
  return {
    ...sourceInfo,
    status: "NOT_GENERATED",
    sourceType,
    summary: null,
    model: null,
    errorCode: null,
    errorMessage: null,
    generatedAt: null,
    updatedAt: null,
  };
}

/** Appends a truncation note without exceeding the documented limitations cap. */
function withTruncationNote(content: AiSummaryContent): AiSummaryContent {
  const note =
    "Only the first part of this resource was analyzed — it exceeded the length limit for AI summaries.";
  if (content.limitations.includes(note)) return content;
  return {
    ...content,
    limitations: [...content.limitations, note].slice(0, AI_SUMMARY_LIMITS.limitationsMax),
  };
}

function mapGenerationFailure(err: unknown): { code: string; message: string } {
  if (err instanceof OpenAiSummaryError) {
    return { code: err.code, message: err.message };
  }
  return { code: "UNKNOWN_ERROR", message: "An unexpected error occurred while generating the summary." };
}

const CONCURRENT_GENERATION_MESSAGE =
  "A summary is already being generated for this resource. Please wait a moment and try again.";

export const resourceSummaryService = {
  /**
   * Read-only: never calls OpenAI, never claims/creates a row. Safe to
   * call on every resource-detail page load.
   */
  async getSummary(resourceId: string, ctx: ActorContext, requestedFileId?: string): Promise<ResourceSummaryView> {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const { sourceType, sourceHash, file } = await resolveSource(resource, requestedFileId);
    const sourceInfo = await getSourceOptions(resource, file);

    if (!env.aiSummary.enabled) return disabledView(sourceType, sourceInfo);

    const row = await resourceSummaryModel.findCurrent(resource.id, sourceHash);
    if (!row) return notGeneratedView(sourceType, sourceInfo);
    return rowToView(row, sourceType, sourceInfo);
  },

  /**
   * Generates (or reuses) the current summary. Guarantees at most one
   * OpenAI call per (resource, source-hash) pair even under concurrent
   * duplicate requests — see resourceSummaryModel.claim. `requestedFileId`
   * must be supplied explicitly by the caller for a multi-file resource;
   * left unset, this uses the same deterministic recommendation the GET
   * endpoint would have shown, never an arbitrary/ambiguous file.
   */
  async generateSummary(resourceId: string, ctx: ActorContext, requestedFileId?: string): Promise<ResourceSummaryView> {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    if (resource.status !== "READY") {
      throw AppError.badRequest("AI summaries are only available once a resource is ready.");
    }
    if (!env.aiSummary.enabled) {
      throw new AppError(403, "AI_SUMMARY_DISABLED", "AI summaries are currently disabled.");
    }

    const { sourceType, sourceHash, file } = await resolveSource(resource, requestedFileId);
    const sourceInfo = await getSourceOptions(resource, file);

    const existing = await resourceSummaryModel.findCurrent(resource.id, sourceHash);
    if (existing) {
      if (existing.status === "READY" || existing.status === "UNSUPPORTED") {
        return rowToView(existing, sourceType, sourceInfo);
      }
      if (existing.status === "PROCESSING") {
        const reclaimed = await resourceSummaryModel.reclaimStaleProcessing(resource.id, sourceHash);
        if (!reclaimed) {
          throw AppError.conflict(CONCURRENT_GENERATION_MESSAGE);
        }
      }
      // FAILED, or a just-reclaimed stale PROCESSING row: fall through
      // to a fresh attempt below.
    }

    // Local, free checks (mime type support, minimum meaningful text) —
    // never spend a daily-limit slot or an OpenAI call on these.
    let extraction: ExtractionResult;
    try {
      extraction = file
        ? await resourceTextExtractionService.extractFromFile(file)
        : await resourceTextExtractionService.extractFromTextResource(resource.title, resource.description ?? "");
    } catch (err) {
      if (err instanceof ResourceSummaryUnsupportedError) {
        const claimed = await resourceSummaryModel.claim({
          resourceId: resource.id,
          resourceFileId: file?.id ?? null,
          sourceHash,
          generatedBy: ctx.actorUserId,
        });
        const target =
          claimed ?? (await resourceSummaryModel.findCurrent(resource.id, sourceHash));
        if (!target) throw err;
        const finalRow =
          target.status === "PROCESSING"
            ? await resourceSummaryModel.markUnsupported(target.id, {
                errorCode: err.code,
                errorMessage: err.message,
              })
            : target;
        return rowToView(finalRow!, sourceType, sourceInfo);
      }
      throw err;
    }

    const usedToday = await resourceSummaryModel.countGeneratedToday(ctx.actorUserId);
    if (usedToday >= env.aiSummary.dailyUserLimit) {
      throw new AppError(
        429,
        "AI_SUMMARY_DAILY_LIMIT_REACHED",
        `You've reached today's limit of ${env.aiSummary.dailyUserLimit} AI summary generations. Please try again tomorrow.`,
      );
    }

    const claimed = await resourceSummaryModel.claim({
      resourceId: resource.id,
      resourceFileId: file?.id ?? null,
      sourceHash,
      generatedBy: ctx.actorUserId,
    });
    if (!claimed) {
      // Lost a race to a concurrent request for the same (resource, hash)
      // between our lookup above and now.
      const current = await resourceSummaryModel.findCurrent(resource.id, sourceHash);
      if (current?.status === "READY") return rowToView(current, sourceType, sourceInfo);
      throw AppError.conflict(CONCURRENT_GENERATION_MESSAGE);
    }

    try {
      const result =
        extraction.kind === "image"
          ? await openaiSummaryService.generateStructuredSummary({
              sourceType: "IMAGE",
              lengthTier: "FULL",
              image: { base64: extraction.base64, mimeType: extraction.mimeType },
            })
          : await openaiSummaryService.generateStructuredSummary({
              sourceType: extraction.sourceType,
              lengthTier: extraction.lengthTier,
              text: extraction.text,
            });

      if (!result.summary.sufficientContent) {
        const updated = await resourceSummaryModel.markUnsupported(claimed.id, {
          errorCode: "AI_INSUFFICIENT_CONTENT",
          errorMessage:
            "The AI did not find meaningful academic content to summarize in this resource.",
        });
        await auditLogModel.record({
          actorUserId: ctx.actorUserId,
          actorRole: ctx.actorRole,
          action: "AI_SUMMARY_INSUFFICIENT_CONTENT",
          targetType: "resource",
          targetId: resource.id,
          metadata: { sourceType },
          requestId: ctx.requestId,
          ipAddress: ctx.ipAddress,
        });
        return rowToView(updated!, sourceType, sourceInfo);
      }

      let content = stripInternalFields(result.summary);
      if (extraction.kind === "text" && extraction.truncated) {
        content = withTruncationNote(content);
      }

      const updated = await resourceSummaryModel.markReady(claimed.id, {
        content: content as unknown as Record<string, unknown>,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });

      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "AI_SUMMARY_GENERATED",
        targetType: "resource",
        targetId: resource.id,
        metadata: { sourceType, model: result.model },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });

      return rowToView(updated!, sourceType, sourceInfo);
    } catch (err) {
      const { code, message } = mapGenerationFailure(err);
      await resourceSummaryModel.markFailed(claimed.id, { errorCode: code, errorMessage: message });
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "AI_SUMMARY_FAILED",
        targetType: "resource",
        targetId: resource.id,
        metadata: { errorCode: code },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      throw new AppError(
        502,
        "AI_SUMMARY_GENERATION_FAILED",
        "We couldn't generate a summary right now. Please try again in a moment.",
      );
    }
  },

  /**
   * For the PDF/DOCX download routes: requires a current READY summary
   * and never calls OpenAI. Also returns the resource metadata the
   * document renderer needs (title only — see
   * resourceSummaryDocumentService, which never receives the storage
   * key or any file content, only this already-validated view model).
   */
  async getReadySummaryForDownload(
    resourceId: string,
    ctx: ActorContext,
    requestedFileId?: string,
  ): Promise<{
    resource: ResourceRow;
    subjectName: string | null;
    summary: AiSummaryContent;
    generatedAt: string | null;
  }> {
    const resource = await resourceService.getVisibleResource(resourceId, ctx);
    const { sourceHash } = await resolveSource(resource, requestedFileId);
    const row = await resourceSummaryModel.findCurrent(resource.id, sourceHash);
    if (!row || row.status !== "READY" || !row.content) {
      throw AppError.notFound("No AI summary is available for this resource yet.");
    }
    const subject = resource.subject_id
      ? await taxonomyModel.subjects.findById(resource.subject_id)
      : null;
    return {
      resource,
      subjectName: subject?.name ?? null,
      summary: row.content as AiSummaryContent,
      generatedAt: row.generated_at ? row.generated_at.toISOString() : null,
    };
  },
};
