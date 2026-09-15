/**
 * Short, human-facing type labels for a resource file's detected MIME
 * type — shared by the resource-list badge aggregation
 * (resourceModel.list) and the AI source-selection descriptors
 * (resourceSourceSelectionService), so both surfaces use the exact same
 * normalization instead of two copies drifting apart.
 */
const MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

export function normalizeFileType(mimeType: string | null | undefined): string {
  if (!mimeType) return "FILE";
  return MIME_TYPE_LABELS[mimeType] ?? "FILE";
}
