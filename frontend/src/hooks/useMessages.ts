import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messageService } from "../service/messageService";
import { useCurrentUser } from "./useAuth";
import type { Conversation, Message } from "../types/message";

const CONVERSATIONS_KEY = ["messages", "conversations"] as const;
const UNREAD_COUNT_KEY = ["messages", "unreadCount"] as const;
const messagesKey = (conversationId: string) => ["messages", "conversations", conversationId, "messages"] as const;

export function useConversations() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: messageService.listConversations,
    enabled: Boolean(currentUser),
    refetchInterval: 45000,
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["messages", "conversations", conversationId, "meta"],
    queryFn: () => messageService.getConversation(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagesKey(conversationId ?? ""),
    queryFn: () => messageService.listMessages(conversationId!),
    enabled: Boolean(conversationId),
    refetchInterval: 5000,
  });
}

export function useUnreadMessageCount() {
  const currentUser = useCurrentUser();
  const query = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: messageService.getUnreadCount,
    enabled: Boolean(currentUser),
    refetchInterval: 45000,
  });
  return query.data?.count ?? 0;
}

export function useCreateOrGetConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => messageService.getOrCreateConversation(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

  return useMutation({
    mutationFn: (body: string) => messageService.sendMessage(conversationId, body),
    onMutate: async (body: string) => {
      const previous = queryClient.getQueryData<Message[]>(messagesKey(conversationId));
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: currentUser?.id ?? "",
        body,
        messageType: "text",
        metadata: {},
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(messagesKey(conversationId), (current = []) => [
        ...current,
        optimisticMessage,
      ]);
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messagesKey(conversationId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => messageService.markRead(conversationId),
    onMutate: (conversationId: string) => {
      const previous = queryClient.getQueryData<Conversation[]>(CONVERSATIONS_KEY);
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (current = []) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
      return { previous };
    },
    onError: (_error, _conversationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONVERSATIONS_KEY, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
