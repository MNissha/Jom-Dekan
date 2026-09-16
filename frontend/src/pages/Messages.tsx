import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import {
  useConversation,
  useConversationMessages,
  useConversations,
  useMarkConversationRead,
  useSendMessage,
} from "../hooks/useMessages";
import { useCurrentUser } from "../hooks/useAuth";
import { EmptyState } from "../components/common/EmptyState";
import { BookingRequestCard } from "../components/messages/BookingRequestCard";
import type { Conversation } from "../types/message";

function initialFrom(name: string) {
  return name[0]?.toUpperCase() ?? "?";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function ConversationRow({ conversation, isActive, onClick }: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition motion-safe:duration-150 ${
        isActive
          ? "bg-primary-50 dark:bg-[#2A2455]"
          : "hover:bg-slate-50 dark:hover:bg-[#231E4A]"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#4338CA] to-[#6D63E8] text-sm font-semibold text-white">
        {initialFrom(conversation.otherUser.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {conversation.otherUser.displayName}
          </p>
          {conversation.lastMessage && (
            <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
              {new Date(conversation.lastMessage.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {conversation.lastMessage ? conversation.lastMessage.body : "No messages yet"}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#C14634] px-1 text-[10px] font-bold text-white">
          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

export default function Messages() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations();
  const { data: conversationMeta } = useConversation(conversationId);
  const { data: messages = [], isLoading: isLoadingMessages } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId ?? "");
  const markRead = useMarkConversationRead();

  const activeConversation = conversations.find((c) => c.id === conversationId);
  const otherUser = activeConversation?.otherUser ?? conversationMeta?.otherUser ?? null;

  useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // Only re-run when switching threads, not on every conversations refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversationId]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !conversationId) return;
    setDraft("");
    sendMessage.mutate(body);
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-[18px] py-[22px]">
      <h1 className="mb-4 shrink-0 text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
        Messages
      </h1>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[#ECEBF7] bg-white shadow-sm dark:border-[#2E2A54] dark:bg-[#1B1836]">
        {/* Conversation list */}
        <div
          className={`min-h-0 w-full shrink-0 flex-col overflow-y-auto border-[#ECEBF7] dark:border-[#2E2A54] sm:w-[320px] sm:border-r ${
            conversationId ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="flex flex-col gap-1 p-2">
            {isLoadingConversations ? (
              <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MessageCircle}
                  title="No conversations yet"
                  description="Start a conversation from someone's profile page."
                />
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === conversationId}
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* Thread pane */}
        <div className={`min-h-0 flex-1 flex-col ${conversationId ? "flex" : "hidden sm:flex"}`}>
          {!conversationId ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={MessageCircle}
                title="Select a conversation"
                description="Choose a conversation from the list to start chatting."
              />
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-[#ECEBF7] px-4 py-3 dark:border-[#2E2A54]">
                <button
                  type="button"
                  onClick={() => navigate("/messages")}
                  aria-label="Back to conversations"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden dark:text-slate-300 dark:hover:bg-[#231E4A]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#4338CA] to-[#6D63E8] text-sm font-semibold text-white">
                  {otherUser ? initialFrom(otherUser.displayName) : "?"}
                </div>
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {otherUser?.displayName ?? "Conversation"}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                {isLoadingMessages ? (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">Loading…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderId === currentUser?.id;
                    if (message.messageType === "booking_request") {
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <BookingRequestCard message={message} />
                        </div>
                      );
                    }
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? "bg-primary-600 text-white"
                              : "bg-slate-100 text-slate-800 dark:bg-[#231E4A] dark:text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <span
                            className={`mt-1 block text-[10px] ${
                              isMine ? "text-primary-100" : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {formatTimestamp(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="flex shrink-0 items-center gap-2 border-t border-[#ECEBF7] p-3 dark:border-[#2E2A54]">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="h-11 flex-1 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-4 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-[#332C63] dark:bg-[#231E4A] dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sendMessage.isPending}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
