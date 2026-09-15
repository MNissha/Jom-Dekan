import axiosInstance from "../api/axiosInstance";
import type { ResourceSummaryView } from "../types/resourceSummary";

export const resourceSummaryService = {
  getSummary: async (resourceId: string, resourceFileId?: string): Promise<ResourceSummaryView> => {
    const res = await axiosInstance.get<{ data: ResourceSummaryView }>(
      `/resources/${resourceId}/ai-summary`,
      { params: resourceFileId ? { resourceFileId } : undefined },
    );
    return res.data.data;
  },

  generateSummary: async (resourceId: string, resourceFileId?: string): Promise<ResourceSummaryView> => {
    const res = await axiosInstance.post<{ data: ResourceSummaryView }>(
      `/resources/${resourceId}/ai-summary`,
      resourceFileId ? { resourceFileId } : undefined,
      // Same reasoning as resourceAgentService.askQuestion — a real
      // multi-page document summary can take well past axios's default
      // 10s CRUD timeout even when nothing has actually gone wrong.
      { timeout: 60000 },
    );
    return res.data.data;
  },

  /**
   * Returns the raw file bytes as a Blob — the caller (useDownloadSummary)
   * turns it into a temporary object URL to trigger a save, then revokes
   * it. Goes through axiosInstance like every other authenticated call
   * here (never a bare link), since this route requires the bearer token,
   * unlike the resource-file download route's signed-token bare link.
   */
  downloadSummary: async (resourceId: string, format: "pdf" | "docx", resourceFileId?: string): Promise<Blob> => {
    const res = await axiosInstance.get(`/resources/${resourceId}/ai-summary/download`, {
      params: resourceFileId ? { format, resourceFileId } : { format },
      responseType: "blob",
    });
    return res.data as Blob;
  },
};
