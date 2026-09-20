import { forwardRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import type { AgentMessage } from "../../types/resourceAgent";
import { UserBubble, MessageBubble } from "./ResourceAgentMessage";

interface ResourceAgentConversationProps {
  isLoading: boolean;
  messages: AgentMessage[];
  pendingQuestion: string | null;
  isAsking: boolean;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onScroll?: () => void;
}

/**
 * Only the transcript scrolls — header and composer stay put around it
 * (see ResourceAgentPanel's flex-column layout). `aria-live="polite"`
 * announces new assistant content without interrupting anything the
 * user is currently reading.
 */
export const ResourceAgentConversation = forwardRef<HTMLDivElement, ResourceAgentConversationProps>(
  function ResourceAgentConversation(
    { isLoading, messages, pendingQuestion, isAsking, suggestions, onSelectSuggestion, onScroll },
    scrollRef,
  ) {
    return (
      <div
        ref={scrollRef}
        onScroll={onScroll}
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#EFEEFB]/40 p-4"
      >
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading conversation…
          </p>
        )}

        {!isLoading && messages.length === 0 && !pendingQuestion && (
          <p className="text-sm text-slate-500">
            Ask a question about this resource, or pick a suggestion below to get started.
          </p>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {pendingQuestion && <UserBubble content={pendingQuestion} />}

        {isAsking && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Thinking…
          </p>
        )}

        {!isLoading && messages.length === 0 && !pendingQuestion && !isAsking && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                disabled={isAsking}
                className="rounded-full border border-[#ECEBF7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4338CA] transition motion-safe:duration-150 hover:bg-[#EFEEFB] disabled:opacity-60 dark:text-primary-300 dark:hover:bg-primary-400/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export function AgentUnsupportedNotice({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-start gap-2 p-4 text-sm text-slate-600">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      {message}
    </div>
  );
}
