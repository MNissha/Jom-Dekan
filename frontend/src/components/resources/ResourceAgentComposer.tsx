import { Loader2, Send } from "lucide-react";
import { ASK_RESOURCE_MAX_QUESTION_CHARACTERS } from "../../schemas/resourceAgentSchemas";

interface ResourceAgentComposerProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isPending: boolean;
  askError: string | null;
}

export function ResourceAgentComposer({
  question,
  onQuestionChange,
  onSubmit,
  onKeyDown,
  isPending,
  askError,
}: ResourceAgentComposerProps) {
  return (
    <div className="shrink-0 border-t border-[#ECEBF7] bg-white p-3">
      {askError && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {askError}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label htmlFor="ask-resource-question" className="sr-only">
          Ask a question about this resource
        </label>
        <textarea
          id="ask-resource-question"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={ASK_RESOURCE_MAX_QUESTION_CHARACTERS}
          placeholder="Ask a question about this resource… (Ctrl/Cmd+Enter to send)"
          disabled={isPending}
          className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {question.length}/{ASK_RESOURCE_MAX_QUESTION_CHARACTERS}
          </span>
          <button
            type="submit"
            disabled={isPending || question.trim().length === 0}
            className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
