import { forwardRef, useState, type Ref, type RefObject } from "react";
import axios from "axios";
import { Sparkles, Download, Loader2, AlertTriangle, ChevronDown, FileWarning, MessageCircle, FileText } from "lucide-react";
import {
  useResourceSummary,
  useGenerateResourceSummary,
  useDownloadResourceSummary,
} from "../../hooks/useResourceSummary";
import { AI_SUMMARY_DISCLAIMER, type ResourceSummaryContent } from "../../types/resourceSummary";
import { AiSourceSelector } from "./AiSourceSelector";

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: { message?: string } } | undefined;
    if (body?.error?.message) return body.error.message;
  }
  return fallback;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

interface AiSummarySectionProps {
  resourceId: string;
  resourceTitle: string;
  /** Opens the "Ask This Resource" side panel — the panel itself handles its own not-ready/disabled messaging. */
  onOpenAgent: () => void;
  isAgentOpen: boolean;
  launcherButtonRef: RefObject<HTMLButtonElement>;
  /** Explicit AI-source selection for a multi-file resource — undefined lets the backend recommend a default. */
  resourceFileId: string | undefined;
  onSelectFileId: (resourceFileId: string) => void;
}

export const AiSummarySection = forwardRef(function AiSummarySection(
  { resourceId, resourceTitle, onOpenAgent, isAgentOpen, launcherButtonRef, resourceFileId, onSelectFileId }: AiSummarySectionProps,
  ref: Ref<HTMLElement>,
) {
  const { data, isLoading, isError, error, refetch, isRefetching } = useResourceSummary(resourceId, resourceFileId);
  const generate = useGenerateResourceSummary(resourceId, resourceFileId);
  const download = useDownloadResourceSummary(resourceId, resourceTitle, resourceFileId);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleGenerate = () => {
    if (generate.isPending) return;
    generate.mutate();
  };

  const handleDownload = (format: "pdf" | "docx") => {
    if (download.isPending) return;
    setDownloadError(null);
    download.mutate(format, {
      onError: (err) => setDownloadError(getApiErrorMessage(err, "Couldn't download the summary. Please try again.")),
    });
  };

  return (
    <section ref={ref} tabIndex={-1} className="mt-6 overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white focus:outline-none">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-[#231C57] px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#F5C21A]" aria-hidden="true" />
          <h2 className="text-base font-bold text-white">AI Study Summary</h2>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
            AI-GENERATED
          </span>
        </div>

        <button
          type="button"
          ref={launcherButtonRef}
          onClick={onOpenAgent}
          aria-expanded={isAgentOpen}
          aria-controls="resource-agent-panel"
          className="flex items-center gap-1.5 rounded-full bg-[#F5C21A] px-3.5 py-1.5 text-xs font-bold text-[#231C57] shadow-sm transition motion-safe:duration-150 hover:bg-[#e5b60f]"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Ask AI about this resource
        </button>
      </header>

      <div className="p-5">
        {downloadError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {downloadError}
          </div>
        )}

        {!isLoading && data && data.availableSources && data.availableSources.length > 1 && (
          <div className="mb-4 flex flex-col gap-2">
            <AiSourceSelector
              availableSources={data.availableSources}
              selectedFileId={resourceFileId ?? data.selectedSource?.resourceFileId}
              onSelect={onSelectFileId}
            />
            {data.selectedSource && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                AI is using: {data.selectedSource.filename}
              </p>
            )}
          </div>
        )}

        {!isLoading && data?.selectedSource && (!data.availableSources || data.availableSources.length <= 1) && (
          <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            AI is using: {data.selectedSource.filename}
          </p>
        )}

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading AI summary…
          </p>
        )}

        {/* Only take over the whole body on a hard failure with nothing to
            show yet — if a background refetch fails after data already
            loaded (e.g. PROCESSING polling), keep showing the last known
            state below rather than hiding it behind this banner. */}
        {!isLoading && isError && !data && (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {getApiErrorMessage(error, "Couldn't load the AI summary for this resource.")}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition motion-safe:duration-150 hover:bg-slate-200 disabled:opacity-60"
            >
              {isRefetching ? "Retrying…" : "Try again"}
            </button>
          </div>
        )}

        {!isLoading && data?.status === "DISABLED" && (
          <p className="text-sm text-slate-500">AI summaries are currently disabled for this platform.</p>
        )}

        {!isLoading && data?.status === "NOT_GENERATED" && (
          <EmptyState onGenerate={handleGenerate} pending={generate.isPending} error={generate.error} />
        )}

        {!isLoading && data?.status === "PROCESSING" && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            A summary is already being generated for this resource — check back shortly.
          </p>
        )}

        {!isLoading && data?.status === "FAILED" && (
          <FailedState message={data.errorMessage} onRetry={handleGenerate} pending={generate.isPending} />
        )}

        {!isLoading && data?.status === "UNSUPPORTED" && <UnsupportedState message={data.errorMessage} />}

        {!isLoading && data?.status === "READY" && data.summary && (
          <ReadySummary
            summary={data.summary}
            generatedAt={data.generatedAt}
            onDownload={handleDownload}
            downloadPending={download.isPending}
            downloadFormat={download.variables}
          />
        )}
      </div>
    </section>
  );
});

function EmptyState({
  onGenerate,
  pending,
  error,
}: {
  onGenerate: () => void;
  pending: boolean;
  error: unknown;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-slate-600">
        Generate an AI-powered overview, key points, and study notes for this resource.
      </p>
      {error != null && (
        <p role="alert" className="text-sm text-red-600">
          {getApiErrorMessage(error, "Couldn't generate a summary. Please try again.")}
        </p>
      )}
      <button
        type="button"
        onClick={onGenerate}
        disabled={pending}
        className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Generating…" : "Generate AI Summary"}
      </button>
      {pending && <p className="text-xs text-slate-400">This can take up to a minute.</p>}
      <p className="text-xs text-slate-400">{AI_SUMMARY_DISCLAIMER}</p>
    </div>
  );
}

function FailedState({ message, onRetry, pending }: { message: string | null; onRetry: () => void; pending: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="flex items-center gap-2 text-sm text-red-600">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message ?? "We couldn't generate a summary for this resource."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending}
        className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

function UnsupportedState({ message }: { message: string | null }) {
  return (
    <p className="flex items-start gap-2 text-sm text-slate-600">
      <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      {message ?? "AI summaries aren't available for this resource."}
    </p>
  );
}

function ReadySummary({
  summary,
  generatedAt,
  onDownload,
  downloadPending,
  downloadFormat,
}: {
  summary: ResourceSummaryContent;
  generatedAt: string | null;
  onDownload: (format: "pdf" | "docx") => void;
  downloadPending: boolean;
  downloadFormat: "pdf" | "docx" | undefined;
}) {
  const generatedLabel = formatDate(generatedAt);
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-[#FBFBFE] p-4">
        <h3 className="text-sm font-bold text-[#332475]">Overview</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{summary.overview}</p>
      </div>

      {summary.keyPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#332475]">Key Points</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5C21A]" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.studySections.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#332475]">Study Notes</h3>
          <div className="mt-2 flex flex-col gap-2">
            {summary.studySections.map((section, i) => (
              <details key={i} className="group rounded-xl border border-[#ECEBF7] px-4 py-3 open:bg-[#FBFBFE]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                  {section.heading}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform motion-safe:duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{section.content}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {summary.topics.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#332475]">Topics</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.topics.map((topic, i) => (
              <span key={i} className="rounded-full bg-[#EFEEFB] px-3 py-1 text-xs font-semibold text-[#4338CA]">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.glossary.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#332475]">Glossary</h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {summary.glossary.map((entry, i) => (
              <div key={i} className="border-t border-[#ECEBF7] pt-2">
                <dt className="text-sm font-bold text-slate-800">{entry.term}</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {summary.limitations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Limitations &amp; Notes
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {summary.limitations.map((item, i) => (
              <li key={i} className="text-sm text-amber-900">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEBF7] pt-4">
        <div>
          <p className="text-xs text-slate-400">
            Detected language: {summary.language}
            {generatedLabel ? ` · Generated ${generatedLabel}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-400">{AI_SUMMARY_DISCLAIMER}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDownload("pdf")}
            disabled={downloadPending}
            className="flex items-center gap-1.5 rounded-full border border-[#ECEBF7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4338CA] transition motion-safe:duration-150 hover:bg-[#EFEEFB] disabled:opacity-60 dark:text-primary-300 dark:hover:bg-primary-400/10"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {downloadPending && downloadFormat === "pdf" ? "Downloading…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => onDownload("docx")}
            disabled={downloadPending}
            className="flex items-center gap-1.5 rounded-full border border-[#ECEBF7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4338CA] transition motion-safe:duration-150 hover:bg-[#EFEEFB] disabled:opacity-60 dark:text-primary-300 dark:hover:bg-primary-400/10"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {downloadPending && downloadFormat === "docx" ? "Downloading…" : "Download Word"}
          </button>
        </div>
      </div>
    </div>
  );
}
