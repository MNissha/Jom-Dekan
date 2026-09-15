import { useState } from "react";
import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, File as FileIcon, Download, Loader2 } from "lucide-react";
import type { ResourceFile } from "../../types/resource";
import { useDownloadUrl } from "../../hooks/useResources";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

const TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

function fileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return "FILE";
  return TYPE_LABELS[mimeType] ?? "FILE";
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  const className = "h-5 w-5 shrink-0 text-[#4338CA]";
  if (mimeType?.startsWith("image/")) return <ImageIcon className={className} aria-hidden="true" />;
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return <FileSpreadsheet className={className} aria-hidden="true" />;
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    return <Presentation className={className} aria-hidden="true" />;
  if (mimeType === "application/pdf" || mimeType?.includes("wordprocessingml"))
    return <FileText className={className} aria-hidden="true" />;
  return <FileIcon className={className} aria-hidden="true" />;
}

/**
 * "Files in this resource" — every READY file the current user is
 * permitted to see (the backend's own visibility gate on `GET
 * /resources/:id` already ensures that; this component never fetches
 * anything itself beyond what ResourceDetail already loaded). Downloads
 * go through the existing authenticated `useDownloadUrl` hook — never a
 * raw storage key, never a direct Axios call from this component.
 */
export function ResourceFileList({ files }: { files: ResourceFile[] }) {
  const readyFiles = files.filter((f) => f.status === "READY");
  const downloadUrl = useDownloadUrl();
  const [pendingFileId, setPendingFileId] = useState<string | null>(null);

  if (readyFiles.length === 0) return null;

  const handleDownload = (fileId: string) => {
    if (downloadUrl.isPending) return;
    setPendingFileId(fileId);
    downloadUrl.mutate(fileId, {
      onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      onSettled: () => setPendingFileId(null),
    });
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white">
      <h2 className="border-b border-[#ECEBF7] px-5 py-3 text-sm font-bold text-[#332475]">
        Files in this resource
      </h2>
      <ul className="flex flex-col divide-y divide-[#F4F3FB]">
        {readyFiles.map((file) => {
          const isThisPending = downloadUrl.isPending && pendingFileId === file.id;
          return (
            <li
              key={file.id}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileTypeIcon mimeType={file.detectedMimeType} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800" title={file.originalFilename}>
                    {file.originalFilename}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fileTypeLabel(file.detectedMimeType)} · {formatFileSize(file.sizeBytes)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(file.id)}
                disabled={downloadUrl.isPending}
                aria-label={isThisPending ? `Preparing download of ${file.originalFilename}` : `Download ${file.originalFilename}`}
                className="flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:opacity-60 sm:self-auto"
              >
                {isThisPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isThisPending ? "Preparing…" : "Download"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
