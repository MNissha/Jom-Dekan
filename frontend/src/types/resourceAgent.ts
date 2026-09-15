export type AgentSessionStatus = "ACTIVE" | "CLEARED";
export type AgentMessageRole = "USER" | "ASSISTANT";
export type AgentAnswerStatus = "ANSWERED" | "PARTIAL" | "NOT_FOUND";

export interface AgentSession {
  id: string;
  resourceId: string;
  resourceFileId: string | null;
  status: AgentSessionStatus;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCitation {
  chunkId: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  sourceLabel: string;
  supportingExcerpt: string;
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  citations: AgentCitation[];
  suggestedQuestions: string[];
  createdAt: string;
}

export interface AgentSessionResponse {
  session: AgentSession;
  sourceChanged: boolean;
}

export interface AgentMessagesResponse {
  data: AgentMessage[];
  meta: { page: number; pageSize: number; total: number };
  session: AgentSession;
  sourceChanged: boolean;
}

export const ASK_RESOURCE_DISCLAIMER =
  "AI-generated study assistance. Answers may contain mistakes or miss important context. Verify important information using the original resource.";
