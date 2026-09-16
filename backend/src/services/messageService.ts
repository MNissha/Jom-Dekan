import { messageModel, type ConversationListRow, type ConversationRow, type MessageRow } from "../models/messageModel";
import { userModel } from "../models/userModel";
import { AppError } from "../types/errors";

function toApiConversation(row: ConversationListRow) {
  return {
    id: row.id,
    otherUser: {
      id: row.other_user_id,
      displayName: row.other_display_name,
      photoPath: row.other_photo_path,
    },
    lastMessage: row.last_message_body
      ? {
          body: row.last_message_body,
          senderId: row.last_message_sender_id,
          createdAt: row.last_message_created_at,
        }
      : null,
    unreadCount: Number(row.unread_count),
    updatedAt: row.updated_at,
  };
}

function toApiMessage(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    messageType: row.message_type,
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Throws 403 unless userId is one of the conversation's two
 * participants. Called at the top of every conversation-scoped method
 * below so a conversation id alone never leaks another pair's thread.
 */
async function getConversationOrThrow(conversationId: string, userId: string): Promise<ConversationRow> {
  const conversation = await messageModel.conversations.findById(conversationId);
  if (!conversation) throw AppError.notFound("Conversation not found.");
  if (conversation.participant_one_id !== userId && conversation.participant_two_id !== userId) {
    throw AppError.forbidden();
  }
  return conversation;
}

export const messageService = {
  async findOrCreateConversation(currentUserId: string, targetUserId: string) {
    if (targetUserId === currentUserId) {
      throw AppError.badRequest("You can't message yourself.");
    }
    // findById already excludes deleted_at IS NULL — a genuinely
    // deleted user 404s, but a suspended/restricted/deactivated one
    // does not, matching how their public profile is still viewable.
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) throw AppError.notFound("User not found.");

    const conversation = await messageModel.conversations.findOrCreate(currentUserId, targetUserId);
    return { id: conversation.id };
  },

  async listConversations(userId: string, { page, pageSize }: { page: number; pageSize: number }) {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    const { rows, total } = await messageModel.conversations.listForUser(userId, { limit, offset });
    return {
      data: rows.map(toApiConversation),
      meta: { page, pageSize, total },
    };
  },

  async getConversation(conversationId: string, userId: string) {
    const conversation = await getConversationOrThrow(conversationId, userId);
    const otherUser = await messageModel.conversations.findOtherParticipant(conversationId, userId);
    return {
      id: conversation.id,
      otherUser: otherUser
        ? { id: otherUser.id, displayName: otherUser.display_name, photoPath: otherUser.photo_path }
        : null,
    };
  },

  async listMessages(
    conversationId: string,
    userId: string,
    { limit, before }: { limit: number; before?: string },
  ) {
    await getConversationOrThrow(conversationId, userId);
    const rows = await messageModel.messages.list(conversationId, { limit, before });
    return rows.map(toApiMessage);
  },

  async sendMessage(conversationId: string, userId: string, body: string) {
    await getConversationOrThrow(conversationId, userId);
    const message = await messageModel.messages.create(conversationId, userId, body);
    return toApiMessage(message);
  },

  async markRead(conversationId: string, userId: string) {
    await getConversationOrThrow(conversationId, userId);
    await messageModel.messages.markConversationRead(conversationId, userId);
  },

  async getUnreadCount(userId: string) {
    const count = await messageModel.messages.countUnreadForUser(userId);
    return { count };
  },
};
