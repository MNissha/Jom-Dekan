import type { AiSourceDescriptor } from "../../types/resourceSummary";

/**
 * Lets the user explicitly confirm/choose which uploaded file the AI
 * Summary and Ask This Resource agent analyze, for a resource with more
 * than one READY file. Never triggers a generation itself — selecting a
 * different radio only changes which cached status the summary section
 * (and, via the same selection, the agent panel) reads next; the user
 * still has to click Generate.
 */
export function AiSourceSelector({
  availableSources,
  selectedFileId,
  onSelect,
}: {
  availableSources: AiSourceDescriptor[];
  selectedFileId: string | undefined;
  onSelect: (resourceFileId: string) => void;
}) {
  if (availableSources.length <= 1) return null;

  return (
    <fieldset className="rounded-xl border border-[#ECEBF7] bg-[#FBFBFE] p-4">
      <legend className="px-1 text-sm font-bold text-[#332475]">AI analysis source</legend>
      <p className="mt-1 text-xs text-slate-500">
        This resource contains multiple files. Choose one file for the AI Summary and Ask This Resource.
      </p>
      <div role="radiogroup" aria-label="AI analysis source" className="mt-3 flex flex-col gap-1.5">
        {availableSources.map((source) => {
          const isSelected = source.resourceFileId === selectedFileId;
          const inputId = `ai-source-${source.resourceFileId}`;
          return (
            <label
              key={source.resourceFileId}
              htmlFor={inputId}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition motion-safe:duration-150 ${
                source.supported
                  ? isSelected
                    ? "border-primary-400 bg-[#EFEEFB]"
                    : "border-transparent hover:bg-white"
                  : "cursor-not-allowed border-transparent opacity-60"
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name="ai-source"
                value={source.resourceFileId}
                checked={isSelected}
                disabled={!source.supported}
                onChange={() => onSelect(source.resourceFileId)}
                className="h-4 w-4 shrink-0 accent-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800" title={source.filename}>
                {source.filename}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-500">
                {source.supported ? (
                  <>
                    {source.fileType}
                    {source.recommended && <span className="ml-1.5 rounded-full bg-[#F5C21A]/20 px-2 py-0.5 text-[#8A6A00]">Recommended</span>}
                  </>
                ) : (
                  "Unsupported for AI"
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
