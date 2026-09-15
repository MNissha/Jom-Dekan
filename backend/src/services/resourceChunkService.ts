import mammoth from "mammoth";
import { getStorageAdapter } from "../config/config/storage";
import { env } from "../config/config/env";
import type { ResourceFileRow, ResourceRow } from "../models/resourceModel";
import { resourceChunkModel, type ResourceChunkRow } from "../models/resourceChunkModel";
import { extractPdfPages, normalizeWhitespace } from "./resourceTextExtractionService";
import { AgentUnsupportedSourceError } from "../types/resourceAgentErrors";
import type { AiSummaryContent, AiSummarySourceType } from "../types/aiSummary";
import type { AgentEvidenceChunk } from "../types/resourceAgent";

export const MIN_CHUNK_CHARS = 700;
export const MAX_CHUNK_CHARS = 1500;
const HEADING_MAX_CHARS = 80;

export interface TextSegment {
  heading: string | null;
  text: string;
}

export interface BuiltChunk {
  pageNumber: number | null;
  sectionTitle: string | null;
  content: string;
}

/**
 * Best-effort heuristic for "this line looks like a heading, not a
 * sentence of body text": short, and not ending the way a sentence or
 * list item normally does. Deliberately conservative — a missed heading
 * just means one more chunk has `sectionTitle: null`, which is a fine
 * degrade; a false positive would misfile real body text as a heading.
 */
export function looksLikeHeading(line: string): boolean {
  return line.length > 0 && line.length <= HEADING_MAX_CHARS && !/[.!?,:;]$/.test(line) && !/^\d+$/.test(line);
}

/**
 * For PDF page text: pdf.js's per-line extraction inserts one newline
 * per rendered line, not one per paragraph, so paragraph breaks aren't
 * reliably signaled by blank lines here. Instead, a short standalone
 * line is treated as a heading that starts a new section; everything
 * else accumulates as that section's body text. A heading candidate
 * flushes whatever body text has accumulated so far under the
 * *previous* heading first — headings are recognized wherever they
 * appear on the page, not only at the very start. Consecutive heading
 * candidates with nothing but each other between them (no body line
 * yet) are merged into one heading, which is what a wrapped multi-line
 * title looks like under this line-based extraction.
 */
export function segmentPdfPageLines(pageText: string): TextSegment[] {
  const lines = pageText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const segments: TextSegment[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = normalizeWhitespace(buffer.join(" "));
    if (text.length > 0) segments.push({ heading: currentHeading, text });
    buffer = [];
  };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      if (buffer.length === 0 && currentHeading !== null) {
        currentHeading = `${currentHeading} ${line}`;
      } else {
        flush();
        currentHeading = line;
      }
      continue;
    }
    buffer.push(line);
  }
  flush();
  return segments;
}

/**
 * For text-only resources and DOCX (mammoth): the raw text does have
 * real blank-line paragraph breaks, so those are used directly rather
 * than the per-line heuristic above.
 */
export function segmentParagraphText(rawText: string): TextSegment[] {
  const blocks = rawText
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  const segments: TextSegment[] = [];
  let currentHeading: string | null = null;

  for (const block of blocks) {
    const singleLine = normalizeWhitespace(block);
    if (!block.includes("\n") && looksLikeHeading(singleLine)) {
      currentHeading = singleLine;
      continue;
    }
    segments.push({ heading: currentHeading, text: singleLine });
  }
  return segments;
}

/** Last-resort splitter for a single paragraph/segment longer than the max chunk size. */
export function splitBySentence(text: string, maxChars: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) ?? [text];
  const pieces: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if (buffer.length > 0 && buffer.length + sentence.length > maxChars) {
      pieces.push(buffer.trim());
      buffer = "";
    }
    if (sentence.length > maxChars) {
      // No sentence-ending punctuation found within maxChars at all
      // (rare — e.g. a huge unbroken list); hard-slice as a last resort
      // rather than sending an unbounded chunk.
      for (let i = 0; i < sentence.length; i += maxChars) {
        pieces.push(sentence.slice(i, i + maxChars).trim());
      }
      continue;
    }
    buffer += sentence;
  }
  if (buffer.trim().length > 0) pieces.push(buffer.trim());
  return pieces;
}

/**
 * Packs a page's (or document's) segments into ~MIN_CHUNK_CHARS to
 * MAX_CHUNK_CHARS windows, never splitting a segment unless it alone
 * exceeds the max, and preferring to start a new chunk when the section
 * heading changes (so a chunk's `sectionTitle` stays meaningful).
 */
export function packSegmentsIntoChunks(segments: TextSegment[]): Array<{ sectionTitle: string | null; content: string }> {
  const chunks: Array<{ sectionTitle: string | null; content: string }> = [];
  let buffer = "";
  let bufferHeading: string | null = null;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) chunks.push({ sectionTitle: bufferHeading, content: trimmed });
    buffer = "";
  };

  for (const segment of segments) {
    const pieces = segment.text.length > MAX_CHUNK_CHARS ? splitBySentence(segment.text, MAX_CHUNK_CHARS) : [segment.text];

    for (const piece of pieces) {
      const headingChanged = buffer.length > 0 && bufferHeading !== segment.heading;
      const wouldOverflow = buffer.length > 0 && buffer.length + 1 + piece.length > MAX_CHUNK_CHARS;
      if (wouldOverflow || (headingChanged && buffer.length >= MIN_CHUNK_CHARS)) {
        flush();
      }
      if (buffer.length === 0) bufferHeading = segment.heading;
      buffer = buffer.length > 0 ? `${buffer} ${piece}` : piece;
      if (buffer.length >= MAX_CHUNK_CHARS) flush();
    }
  }
  flush();
  return chunks;
}

export function chunkPlainText(text: string): BuiltChunk[] {
  return packSegmentsIntoChunks(segmentParagraphText(text)).map((c) => ({ ...c, pageNumber: null }));
}

async function chunkPdfBuffer(buffer: Buffer): Promise<BuiltChunk[]> {
  const pages = await extractPdfPages(buffer);
  const chunks: BuiltChunk[] = [];
  for (const page of pages) {
    const pageChunks = packSegmentsIntoChunks(segmentPdfPageLines(page.text));
    for (const chunk of pageChunks) {
      chunks.push({ ...chunk, pageNumber: page.pageNumber });
    }
  }
  return chunks;
}

/** One synthetic chunk from the cached Phase 1 summary — see migration 033's header comment. */
function chunkFromCachedSummary(summary: AiSummaryContent): BuiltChunk[] {
  const parts = [
    summary.overview,
    summary.keyPoints.length > 0 ? `Key points:\n${summary.keyPoints.map((p) => `- ${p}`).join("\n")}` : "",
    summary.topics.length > 0 ? `Topics: ${summary.topics.join(", ")}` : "",
  ].filter(Boolean);
  const content = normalizeWhitespace(parts.join("\n\n"));
  if (content.length === 0) return [];
  return [{ pageNumber: null, sectionTitle: null, content }];
}

function toEvidenceChunk(row: ResourceChunkRow, sourceType: AiSummarySourceType): AgentEvidenceChunk {
  const content =
    row.content.length > env.aiAgent.maxChunkCharacters
      ? row.content.slice(0, env.aiAgent.maxChunkCharacters)
      : row.content;
  const sourceLabel =
    row.page_number != null
      ? `Page ${row.page_number}`
      : row.section_title
        ? `Section: ${row.section_title}`
        : sourceType === "IMAGE"
          ? "Uploaded image"
          : sourceType === "TEXT_RESOURCE"
            ? "Text resource"
            : "Document";
  return {
    chunkId: row.id,
    sourceLabel,
    pageNumber: row.page_number,
    sectionTitle: row.section_title,
    content,
  };
}

export const resourceChunkService = {
  /**
   * Idempotent: a no-op if this exact (resource, sourceHash) is already
   * indexed. Safe under concurrent callers — chunking is a pure function
   * of the extracted text, so a race just computes the same rows twice
   * and the second insert harmlessly no-ops against the unique
   * constraint (resourceChunkModel.insertMany), no advisory lock needed.
   * Throws AgentUnsupportedSourceError if nothing chunkable comes out
   * (should be rare given the caller only indexes sources with an
   * already-READY Phase 1 summary).
   */
  async ensureChunksForResource(params: {
    resource: ResourceRow;
    file: ResourceFileRow | null;
    sourceType: AiSummarySourceType;
    sourceHash: string;
    cachedSummary: AiSummaryContent;
  }): Promise<void> {
    const existing = await resourceChunkModel.countForSource(params.resource.id, params.sourceHash);
    if (existing > 0) return;

    let built: BuiltChunk[];
    if (params.sourceType === "IMAGE") {
      built = chunkFromCachedSummary(params.cachedSummary);
    } else if (params.sourceType === "TEXT_RESOURCE") {
      built = chunkPlainText(`${params.resource.title}\n\n${params.resource.description ?? ""}`);
      if (built.length === 0) {
        // A short/title-only resource can legitimately produce zero body
        // paragraphs (e.g. everything reads as a heading candidate) even
        // though Phase 1 already proved there was enough to summarize —
        // fall back to that cached summary rather than leaving the agent
        // with no evidence at all.
        built = chunkFromCachedSummary(params.cachedSummary);
      }
    } else if (params.file?.detected_mime_type === "application/pdf") {
      const buffer = await getStorageAdapter().getObject(params.file.storage_key);
      built = await chunkPdfBuffer(buffer);
      if (built.length === 0) {
        // Per-page extraction found nothing (unusual, given a READY
        // Phase 1 summary already proved whole-document text existed) —
        // fall back to the cached summary so the agent still has
        // something to ground answers in.
        built = chunkFromCachedSummary(params.cachedSummary);
      }
    } else if (params.file) {
      const buffer = await getStorageAdapter().getObject(params.file.storage_key);
      const result = await mammoth.extractRawText({ buffer }).catch(() => ({ value: "" }));
      built = chunkPlainText(result.value ?? "");
      if (built.length === 0) built = chunkFromCachedSummary(params.cachedSummary);
    } else {
      built = chunkFromCachedSummary(params.cachedSummary);
    }

    if (built.length === 0) {
      throw new AgentUnsupportedSourceError(
        "INSUFFICIENT_EVIDENCE",
        "There is not enough extractable content in this resource to answer questions about it.",
      );
    }

    await resourceChunkModel.insertMany(
      built.map((chunk, index) => ({
        resourceId: params.resource.id,
        resourceFileId: params.file?.id ?? null,
        sourceHash: params.sourceHash,
        chunkIndex: index,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
      })),
    );
    await resourceChunkModel.deleteStaleForResource(params.resource.id, params.sourceHash);
  },

  /**
   * PostgreSQL full-text search, scoped server-side to exactly one
   * (resourceId, sourceHash) — the model never supplies either. Falls
   * back to the first few chunks in document order if the query's terms
   * don't match anything, so a question phrased unusually doesn't leave
   * the model with zero evidence.
   */
  async search(params: {
    resourceId: string;
    sourceHash: string;
    sourceType: AiSummarySourceType;
    query: string;
  }): Promise<AgentEvidenceChunk[]> {
    const cleanQuery = params.query.trim().slice(0, 200);
    if (!cleanQuery) return [];
    let rows = await resourceChunkModel.search({
      resourceId: params.resourceId,
      sourceHash: params.sourceHash,
      query: cleanQuery,
      limit: env.aiAgent.maxChunksPerSearch,
    });
    if (rows.length === 0) {
      rows = await resourceChunkModel.listBySource(
        params.resourceId,
        params.sourceHash,
        Math.min(3, env.aiAgent.maxChunksPerSearch),
      );
    }
    return rows.map((r) => toEvidenceChunk(r, params.sourceType));
  },

  /**
   * Reads specific previously-seen chunks. `chunkIds` outside the
   * current (resourceId, sourceHash) scope simply aren't returned by
   * resourceChunkModel.findByIds — there is no code path here that can
   * fetch another resource's content.
   */
  async readByIds(params: {
    resourceId: string;
    sourceHash: string;
    sourceType: AiSummarySourceType;
    chunkIds: string[];
  }): Promise<AgentEvidenceChunk[]> {
    const ids = params.chunkIds.slice(0, 3);
    const rows = await resourceChunkModel.findByIds({
      resourceId: params.resourceId,
      sourceHash: params.sourceHash,
      ids,
    });
    return rows.map((r) => toEvidenceChunk(r, params.sourceType));
  },
};
