import { pool } from "../config/config/db";

export interface ConversationRow {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationListRow extends ConversationRow {
  other_user_id: string;
  other_display_name: string;
  other_photo_path: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  last_message_created_at: Date | null;
  unread_count: string;
}

export type MessageType = "text" | "booking_request";

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

/** Sorts a pair of user ids to match the `participant_one_id < participant_two_id` CHECK constraint. */
function orderParticipants(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

/**
 * Parameterized SQL only, no Express req/res — same rule as
 * forumModel/userModel.
 */
export const messageModel = {
  orderParticipants,

  conversations: {
    async findOrCreate(userIdA: string, userIdB: string): Promise<ConversationRow> {
      const [participantOneId, participantTwoId] = orderParticipants(userIdA, userIdB);

      const inserted = await pool.query<ConversationRow>(
        `INSERT INTO conversations (participant_one_id, participant_two_id)
         VALUES ($1, $2)
         ON CONFLICT (participant_one_id, participant_two_id) DO NOTHING
         RETURNING *`,
        [participantOneId, participantTwoId],
      );
      if (inserted.rows[0]) return inserted.rows[0];

      const existing = await pool.query<ConversationRow>(
        `SELECT * FROM conversations WHERE participant_one_id = $1 AND participant_two_id = $2`,
        [participantOneId, participantTwoId],
      );
      return existing.rows[0];
    },

    async findById(id: string): Promise<ConversationRow | null> {
      const result = await pool.query<ConversationRow>(
        `SELECT * FROM conversations WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async findOtherParticipant(
      conversationId: string,
      userId: string,
    ): Promise<{ id: string; display_name: string; photo_path: string | null } | null> {
      const result = await pool.query<{ id: string; display_name: string; photo_path: string | null }>(
        `SELECT ou.id, COALESCE(oup.display_name, 'Student') AS display_name, oup.photo_path
         FROM conversations c
         JOIN users ou ON ou.id = CASE WHEN c.participant_one_id = $2 THEN c.participant_two_id ELSE c.participant_one_id END
         LEFT JOIN user_profiles oup ON oup.user_id = ou.id
         WHERE c.id = $1`,
        [conversationId, userId],
      );
      return result.rows[0] ?? null;
    },

    async listForUser(
      userId: string,
      { limit, offset }: { limit: number; offset: number },
    ): Promise<{ rows: ConversationListRow[]; total: number }> {
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM conversations WHERE participant_one_id = $1 OR participant_two_id = $1`,
        [userId],
      );

      const rowsResult = await pool.query<ConversationListRow>(
        `SELECT c.*,
                ou.id AS other_user_id,
                COALESCE(oup.display_name, 'Student') AS other_display_name,
                oup.photo_path AS other_photo_path,
                lm.body AS last_message_body,
                lm.sender_id AS last_message_sender_id,
                lm.created_at AS last_message_created_at,
                COALESCE(uc.unread_count, 0) AS unread_count
         FROM conversations c
         JOIN users ou ON ou.id = CASE WHEN c.participant_one_id = $1 THEN c.participant_two_id ELSE c.participant_one_id END
         LEFT JOIN user_profiles oup ON oup.user_id = ou.id
         LEFT JOIN LATERAL (
           SELECT body, sender_id, created_at FROM messages
           WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
         ) lm ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS unread_count FROM messages m
           WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read_at IS NULL
         ) uc ON true
         WHERE c.participant_one_id = $1 OR c.participant_two_id = $1
         ORDER BY c.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );

      return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
    },
  },

  messages: {
    async list(
      conversationId: string,
      { limit, before }: { limit: number; before?: string },
    ): Promise<MessageRow[]> {
      const values: unknown[] = [conversationId];
      let beforeClause = "";
      if (before) {
        values.push(before);
        beforeClause = `AND created_at < (SELECT created_at FROM messages WHERE id = $${values.length})`;
      }
      values.push(limit);

      const result = await pool.query<MessageRow>(
        `SELECT * FROM messages
         WHERE conversation_id = $1 ${beforeClause}
         ORDER BY created_at DESC
         LIMIT $${values.length}`,
        values,
      );
      return result.rows.reverse();
    },

    async create(
      conversationId: string,
      senderId: string,
      body: string,
      options?: { messageType?: MessageType; metadata?: Record<string, unknown> },
    ): Promise<MessageRow> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<MessageRow>(
          `INSERT INTO messages (conversation_id, sender_id, body, message_type, metadata)
           VALUES ($1, $2, $3, $4, $5::jsonb)
           RETURNING *`,
          [
            conversationId,
            senderId,
            body,
            options?.messageType ?? "text",
            JSON.stringify(options?.metadata ?? {}),
          ],
        );
        await client.query(
          `UPDATE conversations SET updated_at = now() WHERE id = $1`,
          [conversationId],
        );
        await client.query("COMMIT");
        return result.rows[0];
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async markConversationRead(conversationId: string, userId: string): Promise<void> {
      await pool.query(
        `UPDATE messages SET read_at = now()
         WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
        [conversationId, userId],
      );
    },

    async countUnreadForUser(userId: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.read_at IS NULL AND m.sender_id != $1
           AND (c.participant_one_id = $1 OR c.participant_two_id = $1)`,
        [userId],
      );
      return Number(result.rows[0].count);
    },
  },
};
