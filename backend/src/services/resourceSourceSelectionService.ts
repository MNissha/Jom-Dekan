import type { ResourceFileRow } from "../models/resourceModel";
import { isSummarizableMimeType, isImageMimeType } from "./resourceTextExtractionService";
import { normalizeFileType } from "../utils/fileTypeLabel";
import { AppError } from "../types/errors";

/**
 * Deterministic "which file should the AI analyze" logic, shared by
 * resourceSummaryService (Phase 1) and resourceAgentService (Phase 2) so
 * both features always agree on the same selected source for a given
 * resource — see docs/architecture.md's "AI source selection" section.
 *
 * Recommendation is MIME-type-only (never opens/reads a file, never
 * calls OpenAI): text-based PDF > DOCX > plain text > supported image >
 * other supported type > unsupported. Ties (including "no supported file
 * at all") break by upload order (created_at ascending), which
 * `resourceModel.files.findByResourceId` already returns in.
 */

function priorityRank(mimeType: string | null): number {
  if (mimeType === "application/pdf") return 0;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return 1;
  if (mimeType === "text/plain") return 2; // not currently an uploadable type — kept for forward-compatibility
  if (isImageMimeType(mimeType)) return 3;
  if (isSummarizableMimeType(mimeType)) return 4;
  return 99; // unsupported for AI — never preferred, but still a valid stable fallback
}

/**
 * Picks the single best default among a resource's READY files. Assumes
 * `readyFiles` is already filtered to status === 'READY' and ordered by
 * upload order (ascending created_at) — both true of
 * `resourceModel.files.findByResourceId`'s natural output.
 */
export function pickRecommendedFile(readyFiles: ResourceFileRow[]): ResourceFileRow | null {
  if (readyFiles.length === 0) return null;
  let best = readyFiles[0];
  let bestRank = priorityRank(best.detected_mime_type);
  for (const file of readyFiles.slice(1)) {
    const rank = priorityRank(file.detected_mime_type);
    if (rank < bestRank) {
      best = file;
      bestRank = rank;
    }
  }
  return best;
}

export interface AiSourceDescriptor {
  resourceFileId: string;
  filename: string;
  fileType: string;
  supported: boolean;
  recommended: boolean;
}

/** Every READY file described for the "AI analysis source" selector, in upload order. */
export function listAvailableSources(readyFiles: ResourceFileRow[]): AiSourceDescriptor[] {
  const recommended = pickRecommendedFile(readyFiles);
  return readyFiles.map((file) => ({
    resourceFileId: file.id,
    filename: file.original_filename,
    fileType: normalizeFileType(file.detected_mime_type),
    supported: isSummarizableMimeType(file.detected_mime_type),
    recommended: recommended?.id === file.id,
  }));
}

export function describeSelectedFile(file: ResourceFileRow): Omit<AiSourceDescriptor, "recommended"> {
  return {
    resourceFileId: file.id,
    filename: file.original_filename,
    fileType: normalizeFileType(file.detected_mime_type),
    supported: isSummarizableMimeType(file.detected_mime_type),
  };
}

/**
 * Validates an explicitly-requested `resourceFileId` against the full
 * (any-status) file list of ONE already-known resource — never trusts
 * the id alone, and never issues a second query, since the caller
 * already has the resource's full file list in hand. Distinguishes
 * "doesn't belong to this resource" (404 — also covers "belongs to a
 * different resource entirely") from "belongs here but isn't READY yet"
 * (409), so the two never collapse into the same misleading message.
 */
export function resolveRequestedFile(allFiles: ResourceFileRow[], requestedFileId: string): ResourceFileRow {
  const file = allFiles.find((f) => f.id === requestedFileId);
  if (!file) {
    throw new AppError(404, "AI_SOURCE_FILE_NOT_FOUND", "The selected file could not be found for this resource.");
  }
  if (file.status !== "READY") {
    throw new AppError(409, "AI_SOURCE_FILE_NOT_READY", "The selected file is not ready yet.");
  }
  return file;
}
