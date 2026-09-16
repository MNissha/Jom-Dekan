export interface ConversationOtherUser {
  id: string;
  displayName: string;
  photoPath: string | null;
}

export interface ConversationLastMessage {
  body: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUser: ConversationOtherUser;
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export type MessageType = "text" | "booking_request";

export interface BookingRequestMetadata {
  bookingId: string;
  subjectName: string | null;
  requestedStartAt: string;
  durationMinutes: number;
  note: string | null;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: MessageType;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
