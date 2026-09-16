import axiosInstance from "../api/axiosInstance";
import type { Conversation, ConversationOtherUser, Message } from "../types/message";

export const messageService = {
  async listConversations() {
    const { data } = await axiosInstance.get("/messages/conversations", {
      params: { page: 1, pageSize: 50 },
    });
    return data.data as Conversation[];
  },
  async getOrCreateConversation(userId: string) {
    const { data } = await axiosInstance.post("/messages/conversations", { userId });
    return data.data as { id: string };
  },
  async getConversation(conversationId: string) {
    const { data } = await axiosInstance.get(`/messages/conversations/${conversationId}`);
    return data.data as { id: string; otherUser: ConversationOtherUser | null };
  },
  async listMessages(conversationId: string) {
    const { data } = await axiosInstance.get(
      `/messages/conversations/${conversationId}/messages`,
      { params: { limit: 50 } },
    );
    return data.data as Message[];
  },
  async sendMessage(conversationId: string, body: string) {
    const { data } = await axiosInstance.post(
      `/messages/conversations/${conversationId}/messages`,
      { body },
    );
    return data.data as Message;
  },
  async markRead(conversationId: string) {
    await axiosInstance.patch(`/messages/conversations/${conversationId}/read`);
  },
  async getUnreadCount() {
    const { data } = await axiosInstance.get("/messages/unread-count");
    return data.data as { count: number };
  },
};
