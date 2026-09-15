import { pool } from "../config/config/db";

export type ResourceSummaryStatus =
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "UNSUPPORTED";

export interface ResourceAiSummaryRow {
  id: string;
  resource_id: string;
  resource_file_id: string | null;
  source_hash: string;
  status: ResourceSummaryStatus;
  content: Record<string, unknown> | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error_code: string | null;
  error_message: string | null;
  generated_by: string | null;
  generated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// A PROCESSING row this old is treated as abandoned (e.g. the process
// crashed mid-request) rather than a genuine in-flight generation, so a
// new attempt is allowed to reclaim it instead of returning a permanent
// 409. Synchronous generation should never legitimately take this long.
const STALE_PROCESSING_MS = 2 * 60 * 1000;

/**
 * Parameterized SQL only, no Express req/res — same rule as every other
 * model in this codebase. The atomic claim below is the sole write path
 * that creates a new row; every other mutation transitions an existing
 * row already owned by the current request (see resourceSummaryService).
 */
export const resourceSummaryModel = {
  /**
   * Atomically claims the right to generate a summary for this
   * (resource, sourceHash) pair. Succeeds (returns the new PROCESSING
   * row) unless another row is already PROCESSING or READY for the same
   * pair, in which case it returns null — the caller re-reads the
   * current state instead of racing a duplicate OpenAI call. This is the
   * database-constraint half of the "protect against simultaneous
   * duplicate requests" requirement; the ON CONFLICT target must match
   * migration 032's partial unique index exactly.
   */
  async claim(params: {
    resourceId: string;
    resourceFileId: string | null;
    sourceHash: string;
    generatedBy: string;
  }): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `INSERT INTO resource_ai_summaries
         (resource_id, resource_file_id, source_hash, status, generated_by)
       VALUES ($1, $2, $3, 'PROCESSING', $4)
       ON CONFLICT (resource_id, source_hash) WHERE status IN ('PROCESSING', 'READY')
       DO NOTHING
       RETURNING *`,
      [params.resourceId, params.resourceFileId, params.sourceHash, params.generatedBy],
    );
    return result.rows[0] ?? null;
  },

  /**
   * If the row blocking a fresh claim is a stale, abandoned PROCESSING
   * row, flip it to FAILED so it drops out of the partial unique index
   * and a normal claim() retry can proceed. Returns true if it reclaimed
   * something. Never touches a READY row or a PROCESSING row that is
   * still plausibly in flight.
   */
  async reclaimStaleProcessing(
    resourceId: string,
    sourceHash: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE resource_ai_summaries
       SET status = 'FAILED', error_code = 'STALE_PROCESSING',
           error_message = 'The previous generation attempt did not complete.'
       WHERE resource_id = $1 AND source_hash = $2 AND status = 'PROCESSING'
         AND updated_at < now() - ($3 || ' milliseconds')::interval`,
      [resourceId, sourceHash, STALE_PROCESSING_MS],
    );
    return (result.rowCount ?? 0) > 0;
  },

  /** Most recent row for this exact (resource, sourceHash) pair, any status. */
  async findCurrent(
    resourceId: string,
    sourceHash: string,
  ): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `SELECT * FROM resource_ai_summaries
       WHERE resource_id = $1 AND source_hash = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [resourceId, sourceHash],
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `SELECT * FROM resource_ai_summaries WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async markReady(
    id: string,
    params: {
      content: Record<string, unknown>;
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
    },
  ): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `UPDATE resource_ai_summaries
       SET status = 'READY', content = $2, model = $3,
           input_tokens = $4, output_tokens = $5, generated_at = now(),
           error_code = NULL, error_message = NULL
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(params.content), params.model, params.inputTokens, params.outputTokens],
    );
    return result.rows[0] ?? null;
  },

  async markFailed(
    id: string,
    params: { errorCode: string; errorMessage: string },
  ): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `UPDATE resource_ai_summaries
       SET status = 'FAILED', error_code = $2, error_message = $3
       WHERE id = $1
       RETURNING *`,
      [id, params.errorCode, params.errorMessage],
    );
    return result.rows[0] ?? null;
  },

  async markUnsupported(
    id: string,
    params: { errorCode: string; errorMessage: string },
  ): Promise<ResourceAiSummaryRow | null> {
    const result = await pool.query<ResourceAiSummaryRow>(
      `UPDATE resource_ai_summaries
       SET status = 'UNSUPPORTED', error_code = $2, error_message = $3
       WHERE id = $1
       RETURNING *`,
      [id, params.errorCode, params.errorMessage],
    );
    return result.rows[0] ?? null;
  },

  /**
   * How many generation attempts this user has made since local midnight
   * (the database session's time zone). UNSUPPORTED rows are excluded —
   * they represent either a local, free rejection (bad mime type,
   * not-enough-text) that never reached OpenAI at all, or the rarer case
   * of the model itself reporting no summarizable content; either way
   * resourceSummaryService treats them as not worth spending a user's
   * daily quota on. READY and FAILED rows always represent a real
   * attempt that reached OpenAI, so those always count.
   */
  async countGeneratedToday(userId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM resource_ai_summaries
       WHERE generated_by = $1 AND created_at >= date_trunc('day', now())
         AND status <> 'UNSUPPORTED'`,
      [userId],
    );
    return Number(result.rows[0].count);
  },
};

export function toApiResourceSummary(row: ResourceAiSummaryRow) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    status: row.status,
    content: row.content,
    model: row.model,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
