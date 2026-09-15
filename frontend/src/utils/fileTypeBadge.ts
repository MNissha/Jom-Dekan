import type { ResourceListItem } from "../types/resource";

export const FILE_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  "application/pdf": { label: "PDF", className: "bg-[#EFEEFB] text-[#4338CA]" },
  "image/jpeg": { label: "JPEG", className: "bg-[#FDF3DA] text-[#8A6A00]" },
  "image/png": { label: "PNG", className: "bg-[#FDF3DA] text-[#8A6A00]" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    label: "DOCX",
    className: "bg-[#E4F1FB] text-[#1D5E8A]",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    label: "XLSX",
    className: "bg-[#E4F5EC] text-[#1B7A55]",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    label: "PPTX",
    className: "bg-[#FBEAE5] text-[#B5461E]",
  },
};
export const TEXT_BADGE = { label: "TEXT", className: "bg-[#E4F1FB] text-[#1D5E8A]" };
const MULTI_FILE_BADGE = { label: "MULTI-FILE", className: "bg-slate-100 text-slate-600" };
const UNKNOWN_FILE_BADGE = { label: "FILE", className: "bg-slate-100 text-slate-500" };

/**
 * Renders the card's file-type badge. Prefers the backend's aggregated
 * `fileTypeDisplay`/`readyFileCount` (covers every READY file, not just
 * the first) and falls back to the older single-file fields when they're
 * absent — e.g. a stale cached list response from before these fields
 * existed — so a card never breaks just because the aggregation is
 * momentarily missing.
 */
export function fileTypeBadge(resource: ResourceListItem): { label: string; className: string } {
  if (resource.fileTypeDisplay === undefined) {
    if (!resource.readyFileId) return TEXT_BADGE;
    return (resource.readyFileMimeType && FILE_TYPE_BADGE[resource.readyFileMimeType]) || UNKNOWN_FILE_BADGE;
  }

  const count = resource.readyFileCount ?? 0;
  const suffix = count > 1 ? ` · ${count} files` : "";

  if (resource.fileTypeDisplay === "TEXT") return { ...TEXT_BADGE, label: `${TEXT_BADGE.label}${suffix}` };
  if (resource.fileTypeDisplay === "MULTI-FILE") return { ...MULTI_FILE_BADGE, label: `${MULTI_FILE_BADGE.label}${suffix}` };

  const known = Object.values(FILE_TYPE_BADGE).find((b) => b.label === resource.fileTypeDisplay);
  const base = known ?? UNKNOWN_FILE_BADGE;
  return { ...base, label: `${resource.fileTypeDisplay}${suffix}` };
}
