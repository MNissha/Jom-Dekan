import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import type { AgentMessage } from "../../types/resourceAgent";

export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] break-words rounded-2xl rounded-tr-sm bg-primary-600 px-4 py-2.5 text-sm text-white">
        {content}
      </div>
    </div>
  );
}

export function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "USER") {
    return <UserBubble content={message.content} />;
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[92%] flex-col gap-2 rounded-2xl rounded-tl-sm border border-[#ECEBF7] bg-white px-4 py-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C21A]" aria-hidden="true" />
          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{message.content}</p>
        </div>
        {message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-6">
            {message.citations.map((citation, i) => (
              <CitationChip key={i} citation={citation} />
            ))}
          </div>
        )}
        {message.suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-6">
            {message.suggestedQuestions.map((q, i) => (
              <span key={i} className="rounded-full bg-[#EFEEFB] px-2.5 py-1 text-[11px] font-medium text-[#4338CA]">
                {q}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CitationChip({ citation }: { citation: AgentMessage["citations"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const label = citation.pageNumber != null ? `Page ${citation.pageNumber}` : citation.sourceLabel;

  return (
    <div className="rounded-lg border border-[#EFEEFB] bg-[#EFEEFB]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#332475] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform motion-safe:duration-150 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <p className="max-w-[260px] break-words border-t border-[#ECEBF7] bg-white px-2 py-1.5 text-[11px] text-slate-500">
          {citation.supportingExcerpt}
        </p>
      )}
    </div>
  );
}
