import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceAgentService } from "../service/resourceAgentService";

/**
 * Starting/reusing a session never calls OpenAI (see
 * resourceAgentService.getOrCreateSession on the backend) — safe to
 * fetch automatically when the "Ask This Resource" section mounts,
 * unlike asking a question, which always requires an explicit submit.
 * `resourceFileId` is part of the query key — selecting a different file
 * is a different session/conversation, not a patch onto the old one.
 */
export function useAgentSession(resourceId: string | undefined, resourceFileId?: string) {
  return useQuery({
    queryKey: ["resources", "agent", "session", resourceId, resourceFileId ?? null],
    queryFn: () => resourceAgentService.getOrCreateSession(resourceId!, resourceFileId),
    enabled: Boolean(resourceId),
  });
}

export function useAgentMessages(resourceId: string | undefined, sessionId: string | undefined) {
  return useQuery({
    queryKey: ["resources", "agent", "messages", sessionId],
    queryFn: () => resourceAgentService.listMessages(resourceId!, sessionId!),
    enabled: Boolean(resourceId && sessionId),
  });
}

export function useAskAgentQuestion(resourceId: string | undefined, sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ question, idempotencyKey }: { question: string; idempotencyKey: string }) =>
      resourceAgentService.askQuestion(resourceId!, sessionId!, question, idempotencyKey),
    onSettled: () => {
      // The user's own question is already persisted server-side by the
      // time this resolves (or fails) — refetch rather than hand-patch
      // the cache, so the transcript always matches the database.
      queryClient.invalidateQueries({ queryKey: ["resources", "agent", "messages", sessionId] });
    },
  });
}

export function useClearAgentSession(resourceId: string | undefined, resourceFileId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => resourceAgentService.clearSession(resourceId!, sessionId),
    onSuccess: () => {
      // The next session fetch will find no ACTIVE session for this
      // resource+file and create a fresh one.
      queryClient.invalidateQueries({ queryKey: ["resources", "agent", "session", resourceId, resourceFileId ?? null] });
    },
  });
}

/** Deterministic, non-AI starter questions — see resourceAgentService.getSuggestions on the backend. */
export function useAgentSuggestions(resourceId: string | undefined, resourceFileId?: string) {
  return useQuery({
    queryKey: ["resources", "agent", "suggestions", resourceId, resourceFileId ?? null],
    queryFn: () => resourceAgentService.getSuggestions(resourceId!, resourceFileId),
    enabled: Boolean(resourceId),
    staleTime: 5 * 60 * 1000,
  });
}
