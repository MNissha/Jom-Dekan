import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceSummaryService } from "../service/resourceSummaryService";

/**
 * `resourceFileId` is part of the query key — selecting a different file
 * in a multi-file resource is a genuinely different cache entry (its own
 * status/summary/selectedSource), never a mutation of the previous
 * selection's cached data.
 */
export function useResourceSummary(resourceId: string | undefined, resourceFileId?: string) {
  return useQuery({
    queryKey: ["resources", "ai-summary", resourceId, resourceFileId ?? null],
    queryFn: () => resourceSummaryService.getSummary(resourceId!, resourceFileId),
    enabled: Boolean(resourceId),
    // Phase 1 generation is synchronous (finishes within the POST
    // response), so PROCESSING should basically never be observed via
    // GET — this is just a safety net against a stuck/interrupted row
    // rather than something the UI is expected to rely on.
    refetchInterval: (query) => (query.state.data?.status === "PROCESSING" ? 3000 : false),
  });
}

export function useGenerateResourceSummary(resourceId: string | undefined, resourceFileId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["resources", "ai-summary", resourceId, resourceFileId ?? null];
  return useMutation({
    mutationFn: () => resourceSummaryService.generateSummary(resourceId!, resourceFileId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    // A failed generation still persists a FAILED row server-side (see
    // resourceSummaryService) — refetch so the UI reflects that true
    // state (and its stored error message) via the dedicated FAILED
    // view, instead of only showing the mutation's own transient error
    // on top of the stale NOT_GENERATED view.
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

function sanitizeForFilename(title: string): string {
  return (
    title
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "Resource"
  );
}

/**
 * Downloads through the existing authenticated axios instance (the
 * route requires a bearer token, unlike the resource-file download
 * route's bare signed-token link) and saves the resulting blob via a
 * throwaway object URL + anchor click — never a new OpenAI request, see
 * resourceSummaryController.download on the backend. Always downloads
 * the CURRENTLY selected source's cached summary.
 */
export function useDownloadResourceSummary(resourceId: string | undefined, resourceTitle: string, resourceFileId?: string) {
  return useMutation({
    mutationFn: async (format: "pdf" | "docx") => {
      const blob = await resourceSummaryService.downloadSummary(resourceId!, format, resourceFileId);
      const filename = `JomDekan-${sanitizeForFilename(resourceTitle)}-AI-Summary.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}
