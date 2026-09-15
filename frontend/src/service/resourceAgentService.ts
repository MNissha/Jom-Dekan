import axiosInstance from "../api/axiosInstance";
import type { AgentMessage, AgentMessagesResponse, AgentSession, AgentSessionResponse } from "../types/resourceAgent";

export const resourceAgentService = {
  getOrCreateSession: async (resourceId: string, resourceFileId?: string): Promise<AgentSessionResponse> => {
    const res = await axiosInstance.post<{ data: AgentSessionResponse }>(
      `/resources/${resourceId}/agent/sessions`,
      resourceFileId ? { resourceFileId } : undefined,
    );
    return res.data.data;
  },

  listMessages: async (resourceId: string, sessionId: string): Promise<AgentMessagesResponse> => {
    const res = await axiosInstance.get<{ data: AgentMessagesResponse }>(
      `/resources/${resourceId}/agent/sessions/${sessionId}/messages`,
      { params: { page: 1, pageSize: 100 } },
    );
    return res.data.data;
  },

  askQuestion: async (
    resourceId: string,
    sessionId: string,
    question: string,
    idempotencyKey: string,
  ): Promise<AgentMessage> => {
    const res = await axiosInstance.post<{ data: AgentMessage }>(
      `/resources/${resourceId}/agent/sessions/${sessionId}/messages`,
      { question, idempotencyKey },
      {
        headers: { "Idempotency-Key": idempotencyKey },
        // A turn can involve up to two round trips to OpenAI (the tool
        // loop) on top of our own chunk search — comfortably past the
        // axios instance's default 10s CRUD timeout even on a normal
        // answer, well before anything is actually stuck.
        timeout: 60000,
      },
    );
    return res.data.data;
  },

  clearSession: async (resourceId: string, sessionId: string): Promise<AgentSession> => {
    const res = await axiosInstance.delete<{ data: AgentSession }>(
      `/resources/${resourceId}/agent/sessions/${sessionId}`,
    );
    return res.data.data;
  },

  getSuggestions: async (resourceId: string, resourceFileId?: string): Promise<string[]> => {
    const res = await axiosInstance.get<{ data: { suggestions: string[] } }>(
      `/resources/${resourceId}/agent/suggestions`,
      { params: resourceFileId ? { resourceFileId } : undefined },
    );
    return res.data.data.suggestions;
  },
};
