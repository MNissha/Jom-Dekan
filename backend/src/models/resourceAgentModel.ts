import { pool } from "../config/config/db";

export type AgentSessionStatus = "ACTIVE" | "CLEARED";
export type AgentMessageRole = "USER" | "ASSISTANT";

export interface ResourceAgentSessionRow {
  id: string;
  user_id: string;
  resource_id: string;
  resource_file_id: string | null;
  source_hash: string;
  title: string | null;
  status: AgentSessionStatus;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
}

export interface ResourceAgentMessageRow {
  id: string;
  session_id: string;
  role: AgentMessageRole;
  content: string;
  citations: unknown | null;
  suggested_questions: unknown | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_input_tokens: number | null;
  request_id: string | null;
  idempotency_key: string | null;
  created_at: Date;
}

export interface AnswerCacheRow {
  id: string;
  resource_id: string;
  source_hash: string;
  normalized_question_hash: string;
  answer: string;
  answer_status: "ANSWERED" | "PARTIAL" | "NOT_FOUND";
  citations: unknown | null;
  suggested_questions: unknown | null;
  model: string | null;
  created_at: Date;
}

/**
 * Parameterized SQL only, no Express req/res, no OpenAI calls — same
 * rule as every other model in this codebase.
 */
export const resourceAgentModel = {
  sessions: {
    async create(params: {
      userId: string;
      resourceId: string;
      resourceFileId: string | null;
      sourceHash: string;
      title: string | null;
      expiresAt: Date;
    }): Promise<ResourceAgentSessionRow> {
      const result = await pool.query<ResourceAgentSessionRow>(
        `INSERT INTO resource_agent_sessions (user_id, resource_id, resource_file_id, source_hash, title, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [params.userId, params.resourceId, params.resourceFileId, params.sourceHash, params.title, params.expiresAt],
      );
      return result.rows[0];
    },

    /** The most recent session for this user+resource, regardless of status/hash — the caller decides staleness. */
    async findLatestForUserResource(
      userId: string,
      resourceId: string,
    ): Promise<ResourceAgentSessionRow | null> {
      const result = await pool.query<ResourceAgentSessionRow>(
        `SELECT * FROM resource_agent_sessions
         WHERE user_id = $1 AND resource_id = $2 AND status = 'ACTIVE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, resourceId],
      );
      return result.rows[0] ?? null;
    },

    async findById(id: string): Promise<ResourceAgentSessionRow | null> {
      const result = await pool.query<ResourceAgentSessionRow>(
        `SELECT * FROM resource_agent_sessions WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async touch(id: string, expiresAt: Date): Promise<void> {
      await pool.query(
        `UPDATE resource_agent_sessions SET updated_at = now(), expires_at = $2 WHERE id = $1`,
        [id, expiresAt],
      );
    },

    async markCleared(id: string): Promise<ResourceAgentSessionRow | null> {
      const result = await pool.query<ResourceAgentSessionRow>(
        `UPDATE resource_agent_sessions SET status = 'CLEARED' WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] ?? null;
    },
  },

  messages: {
    /**
     * Atomic claim for the USER half of a turn: inserts unless this
     * exact (session, idempotency key) has already been submitted, in
     * which case it returns null so the caller can look up and replay
     * the earlier result instead of calling OpenAI a second time.
     * `idempotencyKey` is always non-null here (the service generates
     * one when the client doesn't supply one) — see resourceAgentService.
     */
    async claimUserMessage(params: {
      sessionId: string;
      content: string;
      idempotencyKey: string;
    }): Promise<ResourceAgentMessageRow | null> {
      const result = await pool.query<ResourceAgentMessageRow>(
        `INSERT INTO resource_agent_messages (session_id, role, content, idempotency_key)
         VALUES ($1, 'USER', $2, $3)
         ON CONFLICT (session_id, role, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO NOTHING
         RETURNING *`,
        [params.sessionId, params.content, params.idempotencyKey],
      );
      return result.rows[0] ?? null;
    },

    /**
     * Compensating rollback for a USER message whose paired OpenAI call
     * failed — used instead of holding a long-lived DB transaction open
     * across the (slow, external) OpenAI request. Only ever deletes the
     * one just-claimed row by ID, never anything else in the session.
     */
    async deleteById(id: string): Promise<void> {
      await pool.query(`DELETE FROM resource_agent_messages WHERE id = $1`, [id]);
    },

    async findAssistantByIdempotencyKey(
      sessionId: string,
      idempotencyKey: string,
    ): Promise<ResourceAgentMessageRow | null> {
      const result = await pool.query<ResourceAgentMessageRow>(
        `SELECT * FROM resource_agent_messages
         WHERE session_id = $1 AND role = 'ASSISTANT' AND idempotency_key = $2`,
        [sessionId, idempotencyKey],
      );
      return result.rows[0] ?? null;
    },

    async insertAssistantMessage(params: {
      sessionId: string;
      content: string;
      citations: unknown;
      suggestedQuestions: unknown;
      model: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
      cachedInputTokens: number | null;
      requestId: string | null;
      idempotencyKey: string;
    }): Promise<ResourceAgentMessageRow> {
      const result = await pool.query<ResourceAgentMessageRow>(
        `INSERT INTO resource_agent_messages
           (session_id, role, content, citations, suggested_questions, model,
            input_tokens, output_tokens, cached_input_tokens, request_id, idempotency_key)
         VALUES ($1, 'ASSISTANT', $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          params.sessionId,
          params.content,
          JSON.stringify(params.citations ?? []),
          JSON.stringify(params.suggestedQuestions ?? []),
          params.model,
          params.inputTokens,
          params.outputTokens,
          params.cachedInputTokens,
          params.requestId,
          params.idempotencyKey,
        ],
      );
      return result.rows[0];
    },

    async listBySession(
      sessionId: string,
      params: { limit: number; offset: number },
    ): Promise<{ rows: ResourceAgentMessageRow[]; total: number }> {
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM resource_agent_messages WHERE session_id = $1`,
        [sessionId],
      );
      const rowsResult = await pool.query<ResourceAgentMessageRow>(
        `SELECT * FROM resource_agent_messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [sessionId, params.limit, params.offset],
      );
      return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
    },

    async countBySession(sessionId: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM resource_agent_messages WHERE session_id = $1`,
        [sessionId],
      );
      return Number(result.rows[0].count);
    },

    /** Last N USER/ASSISTANT turns (2N rows), oldest first — the bounded history sent as context. */
    async recentTurns(sessionId: string, turns: number): Promise<ResourceAgentMessageRow[]> {
      const result = await pool.query<ResourceAgentMessageRow>(
        `SELECT * FROM (
           SELECT * FROM resource_agent_messages
           WHERE session_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         ) recent
         ORDER BY created_at ASC`,
        [sessionId, turns * 2],
      );
      return result.rows;
    },

    /**
     * How many questions this user has had *actually answered by OpenAI*
     * (across all their sessions) since local midnight. Cache hits and
     * replayed idempotent retries are inserted with `output_tokens: NULL`
     * (see resourceAgentService) and so are deliberately excluded here —
     * they cost nothing, so they don't count against the daily quota,
     * mirroring Phase 1's countGeneratedToday convention.
     */
    async countQuestionsTodayForUser(userId: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM resource_agent_messages m
         JOIN resource_agent_sessions s ON s.id = m.session_id
         WHERE s.user_id = $1 AND m.role = 'ASSISTANT' AND m.output_tokens IS NOT NULL
           AND m.created_at >= date_trunc('day', now())`,
        [userId],
      );
      return Number(result.rows[0].count);
    },
  },

  answerCache: {
    async find(params: {
      resourceId: string;
      sourceHash: string;
      normalizedQuestionHash: string;
    }): Promise<AnswerCacheRow | null> {
      const result = await pool.query<AnswerCacheRow>(
        `SELECT * FROM resource_agent_answer_cache
         WHERE resource_id = $1 AND source_hash = $2 AND normalized_question_hash = $3`,
        [params.resourceId, params.sourceHash, params.normalizedQuestionHash],
      );
      return result.rows[0] ?? null;
    },

    async upsert(params: {
      resourceId: string;
      sourceHash: string;
      normalizedQuestionHash: string;
      answer: string;
      answerStatus: "ANSWERED" | "PARTIAL" | "NOT_FOUND";
      citations: unknown;
      suggestedQuestions: unknown;
      model: string | null;
    }): Promise<void> {
      await pool.query(
        `INSERT INTO resource_agent_answer_cache
           (resource_id, source_hash, normalized_question_hash, answer, answer_status, citations, suggested_questions, model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (resource_id, source_hash, normalized_question_hash)
         DO UPDATE SET answer = EXCLUDED.answer, answer_status = EXCLUDED.answer_status,
           citations = EXCLUDED.citations, suggested_questions = EXCLUDED.suggested_questions, model = EXCLUDED.model`,
        [
          params.resourceId,
          params.sourceHash,
          params.normalizedQuestionHash,
          params.answer,
          params.answerStatus,
          JSON.stringify(params.citations ?? []),
          JSON.stringify(params.suggestedQuestions ?? []),
          params.model,
        ],
      );
    },
  },
};

export function toApiAgentSession(row: ResourceAgentSessionRow) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceFileId: row.resource_file_id,
    status: row.status,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApiAgentMessage(row: ResourceAgentMessageRow) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    citations: row.citations ?? [],
    suggestedQuestions: row.suggested_questions ?? [],
    createdAt: row.created_at,
  };
}
