import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  useAgentSession,
  useAgentMessages,
  useAskAgentQuestion,
  useClearAgentSession,
  useAgentSuggestions,
} from "../../hooks/useResourceAgent";
import { askResourceQuestionSchema } from "../../schemas/resourceAgentSchemas";
import { ASK_RESOURCE_DISCLAIMER } from "../../types/resourceAgent";
import { ResourceAgentHeader } from "./ResourceAgentHeader";
import { ResourceAgentSummaryContext } from "./ResourceAgentSummaryContext";
import { ResourceAgentConversation, AgentUnsupportedNotice } from "./ResourceAgentConversation";
import { ResourceAgentComposer } from "./ResourceAgentComposer";

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";
const NEAR_BOTTOM_THRESHOLD_PX = 80;

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getApiError(err: unknown): { code: string | null; message: string } {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: { code?: string; message?: string } } | undefined;
    if (body?.error) return { code: body.error.code ?? null, message: body.error.message ?? "Something went wrong." };
  }
  return { code: null, message: "Something went wrong. Please try again." };
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

interface ResourceAgentPanelProps {
  resourceId: string;
  resourceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  launcherButtonRef: RefObject<HTMLButtonElement>;
  onViewFullSummary: () => void;
  /** Must match whichever file AiSummarySection is currently showing — see ResourceDetail's shared selection state. */
  resourceFileId: string | undefined;
}

/**
 * Browser-extension-style side panel — always in the DOM once opened for
 * the first time (so the session/messages/composer draft survive closing
 * and reopening, and a reply that finishes while closed is there on
 * reopen), just slid off-screen via `translate-x` while closed. Portaled
 * to `document.body` so it always overlays at the true viewport edge
 * regardless of any ancestor's stacking/overflow context.
 */
export function ResourceAgentPanel({
  resourceId,
  resourceTitle,
  isOpen,
  onClose,
  launcherButtonRef,
  onViewFullSummary,
  resourceFileId,
}: ResourceAgentPanelProps) {
  const [hasOpenedOnce, setHasOpenedOnce] = useState(isOpen);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_BREAKPOINT).matches,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const wasOpenRef = useRef(isOpen);

  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey());

  useEffect(() => {
    if (isOpen) setHasOpenedOnce(true);
  }, [isOpen]);

  // Track the `lg` breakpoint so the mobile-only behaviours below (scroll
  // lock, focus trap, backdrop) never fire on desktop.
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_BREAKPOINT);
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Escape closes on both desktop and mobile.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock the app's scroll container on mobile only, while open — never on
  // desktop, and always restored on close/unmount/breakpoint change.
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    document.body.classList.add("agent-panel-mobile-open");
    return () => document.body.classList.remove("agent-panel-mobile-open");
  }, [isOpen, isDesktop]);

  // Focus enters the panel on open; returns to the launcher on close.
  // Desktop focus is never trapped — mobile's full-screen panel blocks
  // the rest of the page, so Tab is cycled within it there only.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      panelRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      launcherButtonRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, launcherButtonRef]);

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isDesktop]);

  const sessionQuery = useAgentSession(hasOpenedOnce ? resourceId : undefined, resourceFileId);
  const session = sessionQuery.data?.session;
  const messagesQuery = useAgentMessages(hasOpenedOnce ? resourceId : undefined, hasOpenedOnce ? session?.id : undefined);
  const suggestionsQuery = useAgentSuggestions(hasOpenedOnce ? resourceId : undefined, resourceFileId);
  const askMutation = useAskAgentQuestion(resourceId, session?.id);
  const clearMutation = useClearAgentSession(resourceId, resourceFileId);

  const messages = messagesQuery.data?.data ?? [];
  // Both responses independently recompute the same session-vs-current-hash
  // comparison; `??` would let a `false` from whichever query resolves
  // second silently mask a real `true` from the other, so this is an OR
  // rather than a fallback chain — either source flagging staleness is
  // enough to show the banner.
  const sourceChanged = Boolean(sessionQuery.data?.sourceChanged) || Boolean(messagesQuery.data?.sourceChanged);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // New messages only force a scroll if the reader was already near the
  // bottom — never yank someone back down while they're reading older
  // history further up the transcript.
  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom();
  }, [messages.length]);

  const submitQuestion = (text: string) => {
    const parsed = askResourceQuestionSchema.safeParse({ question: text });
    if (!parsed.success) {
      setAskError(parsed.error.issues[0]?.message ?? "Enter a question.");
      return;
    }
    if (askMutation.isPending) return;

    setAskError(null);
    setPendingQuestion(parsed.data.question);
    isNearBottomRef.current = true;
    scrollToBottom();
    const key = idempotencyKeyRef.current;
    askMutation.mutate(
      { question: parsed.data.question, idempotencyKey: key },
      {
        onSuccess: () => {
          idempotencyKeyRef.current = makeIdempotencyKey();
          setPendingQuestion(null);
          setQuestion("");
        },
        onError: (err) => {
          idempotencyKeyRef.current = makeIdempotencyKey();
          setPendingQuestion(null);
          setAskError(getApiError(err).message);
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitQuestion(question);
    }
  };

  const handleClear = () => {
    if (!session || clearMutation.isPending) return;
    if (!window.confirm("Start a new conversation? Your current one will be cleared.")) return;
    clearMutation.mutate(session.id);
  };

  const sessionError = sessionQuery.isError ? getApiError(sessionQuery.error) : null;

  const panelClasses = [
    "fixed inset-y-0 right-0 z-50 flex flex-col bg-white",
    "border-l border-[#ECEBF7] shadow-[-8px_0_24px_rgba(35,28,87,0.14)]",
    "h-[100dvh] w-full lg:w-[min(460px,92vw)]",
    "transition-transform duration-300 ease-out motion-reduce:duration-0",
    isOpen ? "translate-x-0" : "translate-x-full",
  ].join(" ");

  return createPortal(
    <>
      {!isDesktop && isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#231C57]/30 transition-opacity motion-safe:duration-200"
        />
      )}
      <div
        id="resource-agent-panel"
        ref={panelRef}
        role="dialog"
        aria-modal={!isDesktop && isOpen}
        aria-labelledby="resource-agent-panel-title"
        aria-hidden={!isOpen}
        tabIndex={-1}
        className={panelClasses}
        style={{ paddingBottom: !isDesktop ? "env(safe-area-inset-bottom)" : undefined }}
      >
        <ResourceAgentHeader
          resourceTitle={resourceTitle}
          canClear={Boolean(session)}
          isClearing={clearMutation.isPending}
          onClear={handleClear}
          onClose={onClose}
        />

        {hasOpenedOnce && session && (
          <ResourceAgentSummaryContext
            resourceId={resourceId}
            resourceTitle={resourceTitle}
            onViewFullSummary={onViewFullSummary}
          />
        )}

        {!hasOpenedOnce && <div className="flex-1" />}

        {hasOpenedOnce && sessionQuery.isLoading && (
          <div className="flex flex-1 items-center gap-2 p-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading study assistant…
          </div>
        )}

        {hasOpenedOnce && sessionError?.code === "AI_AGENT_DISABLED" && (
          <div className="flex-1 p-4 text-sm text-slate-500">
            The study assistant is currently disabled for this platform.
          </div>
        )}

        {hasOpenedOnce && sessionError?.code === "AGENT_UNSUPPORTED_SOURCE" && (
          <AgentUnsupportedNotice message={sessionError.message} />
        )}

        {hasOpenedOnce &&
          sessionQuery.isError &&
          sessionError?.code !== "AI_AGENT_DISABLED" &&
          sessionError?.code !== "AGENT_UNSUPPORTED_SOURCE" && (
            <div className="flex flex-1 flex-col items-start gap-2 p-4">
              <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {sessionError?.message}
              </p>
              <button
                type="button"
                onClick={() => sessionQuery.refetch()}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Try again
              </button>
            </div>
          )}

        {hasOpenedOnce && session && (
          <>
            {sourceChanged && (
              <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                This resource has changed since this conversation started — answers below may be out of date.{" "}
                <button type="button" onClick={handleClear} className="font-semibold underline">
                  Start a new conversation
                </button>
                .
              </div>
            )}

            <ResourceAgentConversation
              ref={scrollRef}
              onScroll={handleScroll}
              isLoading={messagesQuery.isLoading}
              messages={messages}
              pendingQuestion={pendingQuestion}
              isAsking={askMutation.isPending}
              suggestions={suggestionsQuery.data ?? []}
              onSelectSuggestion={submitQuestion}
            />

            <ResourceAgentComposer
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              isPending={askMutation.isPending}
              askError={askError}
            />
          </>
        )}

        <p className="shrink-0 border-t border-[#ECEBF7] bg-[#FBFBFE] px-4 py-2 text-[11px] text-slate-400">
          {ASK_RESOURCE_DISCLAIMER}
        </p>
      </div>
    </>,
    document.body,
  );
}
