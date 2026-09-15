import { pool } from "../config/config/db";

export interface ResourceChunkRow {
  id: string;
  resource_id: string;
  resource_file_id: string | null;
  source_hash: string;
  chunk_index: number;
  page_number: number | null;
  section_title: string | null;
  content: string;
  created_at: Date;
}

export interface NewChunkInput {
  resourceId: string;
  resourceFileId: string | null;
  sourceHash: string;
  chunkIndex: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  content: string;
}

/**
 * Parameterized SQL only, no Express req/res, no OpenAI calls — same
 * rule as every other model. Nothing here decides *whether* a resource
 * is visible/current; resourceChunkService always calls these with an
 * already-validated (resourceId, sourceHash) pair.
 */
export const resourceChunkModel = {
  async countForSource(resourceId: string, sourceHash: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM resource_ai_chunks WHERE resource_id = $1 AND source_hash = $2`,
      [resourceId, sourceHash],
    );
    return Number(result.rows[0].count);
  },

  /**
   * Inserts a full chunk set in one transaction. `ON CONFLICT DO
   * NOTHING` against the (resource_id, source_hash, chunk_index) unique
   * constraint makes this safe to run concurrently: chunking is a pure
   * function of the resource's extracted text, so two racing builders
   * compute the same rows and harmlessly no-op on the loser's insert
   * rather than erroring or duplicating.
   */
  async insertMany(chunks: NewChunkInput[]): Promise<void> {
    if (chunks.length === 0) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO resource_ai_chunks
             (resource_id, resource_file_id, source_hash, chunk_index, page_number, section_title, content)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (resource_id, source_hash, chunk_index) DO NOTHING`,
          [
            chunk.resourceId,
            chunk.resourceFileId,
            chunk.sourceHash,
            chunk.chunkIndex,
            chunk.pageNumber,
            chunk.sectionTitle,
            chunk.content,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /** Drops chunks left over from a previous source hash — safe, pure cache data. */
  async deleteStaleForResource(resourceId: string, currentSourceHash: string): Promise<void> {
    await pool.query(`DELETE FROM resource_ai_chunks WHERE resource_id = $1 AND source_hash <> $2`, [
      resourceId,
      currentSourceHash,
    ]);
  },

  /**
   * PostgreSQL full-text search, scoped to exactly one (resource,
   * sourceHash) pair — the WHERE clause is what makes cross-resource
   * and stale-hash leakage structurally impossible at the query level,
   * not just by convention in the caller.
   */
  async search(params: {
    resourceId: string;
    sourceHash: string;
    query: string;
    limit: number;
  }): Promise<ResourceChunkRow[]> {
    const result = await pool.query<ResourceChunkRow>(
      `SELECT id, resource_id, resource_file_id, source_hash, chunk_index, page_number, section_title, content, created_at
       FROM resource_ai_chunks
       WHERE resource_id = $1 AND source_hash = $2
         AND search_vector @@ websearch_to_tsquery('english', $3)
       ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', $3)) DESC, chunk_index ASC
       LIMIT $4`,
      [params.resourceId, params.sourceHash, params.query, params.limit],
    );
    return result.rows;
  },

  /** Every chunk for a source, in order — used as a search fallback when the query matches nothing. */
  async listBySource(resourceId: string, sourceHash: string, limit: number): Promise<ResourceChunkRow[]> {
    const result = await pool.query<ResourceChunkRow>(
      `SELECT id, resource_id, resource_file_id, source_hash, chunk_index, page_number, section_title, content, created_at
       FROM resource_ai_chunks
       WHERE resource_id = $1 AND source_hash = $2
       ORDER BY chunk_index ASC
       LIMIT $3`,
      [resourceId, sourceHash, limit],
    );
    return result.rows;
  },

  /**
   * Fetches chunks by ID, but still scoped to (resourceId, sourceHash) —
   * this is the enforcement point for "every ID must belong to the
   * current resource and current source hash": an ID for another
   * resource, another source hash, or that doesn't exist simply isn't
   * in the result set, rather than erroring, so the caller can detect
   * and reject the gap explicitly (see resourceChunkService).
   */
  async findByIds(params: {
    resourceId: string;
    sourceHash: string;
    ids: string[];
  }): Promise<ResourceChunkRow[]> {
    if (params.ids.length === 0) return [];
    const result = await pool.query<ResourceChunkRow>(
      `SELECT id, resource_id, resource_file_id, source_hash, chunk_index, page_number, section_title, content, created_at
       FROM resource_ai_chunks
       WHERE resource_id = $1 AND source_hash = $2 AND id = ANY($3)`,
      [params.resourceId, params.sourceHash, params.ids],
    );
    return result.rows;
  },
};
