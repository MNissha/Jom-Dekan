import { Sparkles, RotateCcw, X } from "lucide-react";

interface ResourceAgentHeaderProps {
  resourceTitle: string;
  canClear: boolean;
  isClearing: boolean;
  onClear: () => void;
  onClose: () => void;
}

export function ResourceAgentHeader({ resourceTitle, canClear, isClearing, onClear, onClose }: ResourceAgentHeaderProps) {
  return (
    <header className="shrink-0 border-b-2 border-[#F5C21A] bg-gradient-to-r from-[#231C57] to-[#332475] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-[#F5C21A]" aria-hidden="true" />
          <div>
            <h2 id="resource-agent-panel-title" className="text-sm font-bold leading-tight text-white">
              JomDekan AI · Ask This Resource
            </h2>
            <p className="mt-0.5 truncate text-xs text-white/70" title={resourceTitle}>
              {resourceTitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={isClearing}
              aria-label="Start a new conversation"
              title="Start a new conversation"
              className="flex items-center gap-1 rounded-full p-1.5 text-white/80 transition motion-safe:duration-150 hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Ask This Resource panel"
            title="Close"
            className="rounded-full p-1.5 text-white/80 transition motion-safe:duration-150 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
