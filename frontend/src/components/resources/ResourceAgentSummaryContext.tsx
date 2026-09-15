import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useResourceSummary } from "../../hooks/useResourceSummary";

/**
 * A small, collapsible reminder of what the assistant already knows —
 * never a duplicate of the full summary (that stays on the page). Reads
 * from the same cached query AiSummarySection uses, so this never
 * triggers its own network request, let alone an OpenAI call.
 */
export function ResourceAgentSummaryContext({
  resourceId,
  resourceTitle,
  onViewFullSummary,
}: {
  resourceId: string;
  resourceTitle: string;
  onViewFullSummary: () => void;
}) {
  const { data } = useResourceSummary(resourceId);
  const [collapsed, setCollapsed] = useState(false);

  if (!data || data.status !== "READY" || !data.summary) return null;
  const { summary } = data;

  return (
    <div className="shrink-0 border-b border-[#ECEBF7] bg-[#FBFBFE] px-4 py-2.5">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-controls="resource-agent-summary-context-body"
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-[#332475] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate" title={resourceTitle}>{resourceTitle}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform motion-safe:duration-150 ${collapsed ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
      </button>
      {!collapsed && (
        <div id="resource-agent-summary-context-body" className="mt-2 flex flex-col gap-2">
          <p className="line-clamp-2 text-xs text-slate-600">{summary.overview}</p>
          {summary.topics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.topics.slice(0, 4).map((topic, i) => (
                <span key={i} className="rounded-full bg-[#EFEEFB] px-2 py-0.5 text-[10px] font-semibold text-[#4338CA]">
                  {topic}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onViewFullSummary}
            className="self-start text-xs font-semibold text-primary-700 hover:underline"
          >
            View full summary on page
          </button>
        </div>
      )}
    </div>
  );
}
