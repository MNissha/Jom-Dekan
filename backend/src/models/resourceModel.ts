import { pool } from "../config/config/db";

export type ResourceCategory =
  | "PAST_PAPER"
  | "NOTES"
  | "SLIDES"
  | "ARTICLE"
  | "EXCEL";

export interface ResourceRow {
  id: string;
  owner_id: string;
  university_id: string | null;
  faculty_id: string | null;
  programme_id: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  category: ResourceCategory;
  status: "PENDING" | "READY" | "ARCHIVED" | "FAILED";
  created_at: Date;
  updated_at: Date;
}

export interface ResourceFileRow {
  id: string;
  resource_id: string;
  storage_key: string;
  original_filename: string;
  declared_mime_type: string;
  detected_mime_type: string | null;
  size_bytes: string; // BIGINT comes back as string from pg
  checksum_sha256: string | null;
  status: "PENDING" | "UPLOADED" | "READY" | "FAILED";
  created_at: Date;
  updated_at: Date;
}

export interface ResourceListRow extends ResourceRow {
  ready_file_id: string | null;
  ready_file_mime_type: string | null;
  owner_name: string | null;
}

export type ResourceSortBy = "newest" | "oldest" | "title";

export interface ListResourcesFilters {
  search?: string;
  status?: ResourceRow["status"] | ResourceRow["status"][];
  ownerId?: string;
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
  category?: ResourceCategory;
  q?: string;
  sortBy: ResourceSortBy;
  limit: number;
  offset: number;
}

const SORT_BY_SQL: Record<ResourceSortBy, string> = {
  newest: "r.created_at DESC",
  oldest: "r.created_at ASC",
  title: "r.title ASC",
};

/**
 * Parameterized SQL only, no Express req/res — same rule as
 * taxonomyModel/userModel. No hard DELETE on resources — archive via
 * setStatus, matching the rest of the codebase's convention.
 */
export const resourceModel = {
  async create(params: {
    ownerId: string;
    title: string;
    description: string | null;
    category: ResourceCategory;
    universityId: string | null;
    facultyId: string | null;
    programmeId: string | null;
    subjectId: string | null;
  }): Promise<ResourceRow> {
    const result = await pool.query<ResourceRow>(
      `INSERT INTO resources (owner_id, title, description, category, university_id, faculty_id, programme_id, subject_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.ownerId,
        params.title,
        params.description,
        params.category,
        params.universityId,
        params.facultyId,
        params.programmeId,
        params.subjectId,
      ],
    );
    return result.rows[0];
  },

  async findById(id: string): Promise<ResourceRow | null> {
    const result = await pool.query<ResourceRow>(
      `SELECT * FROM resources WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  // Same shape as list()'s owner_name join, but for the single-resource
  // detail fetch (ResourceDetail's "uploaded by" byline), which findById
  // above doesn't carry since it also backs the internal ownership
  // checks that don't need it.
  async findByIdWithOwner(id: string): Promise<ResourceListRow | null> {
    const result = await pool.query<ResourceListRow>(
      `SELECT r.*, NULL::uuid AS ready_file_id, NULL::text AS ready_file_mime_type,
              up.display_name AS owner_name
       FROM resources r
       LEFT JOIN user_profiles up ON up.user_id = r.owner_id
       WHERE r.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async update(
    id: string,
    params: {
      title: string;
      description: string | null;
      universityId: string | null;
      facultyId: string | null;
      programmeId: string | null;
      subjectId: string | null;
    },
  ): Promise<ResourceRow | null> {
    const result = await pool.query<ResourceRow>(
      `UPDATE resources
       SET title = $2, description = $3, university_id = $4, faculty_id = $5, programme_id = $6, subject_id = $7
       WHERE id = $1
       RETURNING *`,
      [
        id,
        params.title,
        params.description,
        params.universityId,
        params.facultyId,
        params.programmeId,
        params.subjectId,
      ],
    );
    return result.rows[0] ?? null;
  },

  async setStatus(
    id: string,
    status: ResourceRow["status"],
  ): Promise<ResourceRow | null> {
    const result = await pool.query<ResourceRow>(
      `UPDATE resources SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return result.rows[0] ?? null;
  },

  /**
   * Hard delete — the one deliberate exception to this codebase's
   * archive-only convention, added because the user explicitly asked
   * for real deletion on top of archive. `resource_files` rows cascade
   * automatically (ON DELETE CASCADE); the caller is still responsible
   * for removing the underlying files from disk, since that's outside
   * the database.
   */
  async remove(id: string): Promise<boolean> {
    const result = await pool.query(`DELETE FROM resources WHERE id = $1`, [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  },

  async list(
    filters: ListResourcesFilters,
  ): Promise<{ rows: ResourceListRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    function addCondition(sql: string, value: unknown) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        values.push(filters.status);
        conditions.push(`status = ANY($${values.length})`);
      } else {
        addCondition("status = ?", filters.status);
      }
    }
    if (filters.ownerId) addCondition("owner_id = ?", filters.ownerId);
    if (filters.universityId)
      addCondition("university_id = ?", filters.universityId);
    if (filters.facultyId) addCondition("faculty_id = ?", filters.facultyId);
    if (filters.programmeId)
      addCondition("programme_id = ?", filters.programmeId);
    if (filters.subjectId) addCondition("subject_id = ?", filters.subjectId);
    if (filters.category) addCondition("category = ?", filters.category);

    let searchParamIndex: number | null = null;
    if (filters.q) {
      addCondition(
        "search_vector @@ websearch_to_tsquery('english', ?)",
        filters.q,
      );
      searchParamIndex = values.length;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Relevance always wins ties, but the caller's explicit sortBy still
    // governs the rest of the order — a title search still resolves rank
    // ties alphabetically, not by recency.
    const orderParts: string[] = [];
    if (searchParamIndex !== null) {
      orderParts.push(
        `ts_rank(r.search_vector, websearch_to_tsquery('english', $${searchParamIndex})) DESC`,
      );
    }
    orderParts.push(SORT_BY_SQL[filters.sortBy]);

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM resources ${whereClause}`,
      values,
    );

    const dataValues = [...values, filters.limit, filters.offset];
    const rowsResult = await pool.query<ResourceListRow>(
      `SELECT r.*, rf.id AS ready_file_id, rf.detected_mime_type AS ready_file_mime_type,
              up.display_name AS owner_name
       FROM resources r
       LEFT JOIN LATERAL (
         SELECT id, detected_mime_type FROM resource_files
         WHERE resource_id = r.id AND status = 'READY'
         ORDER BY created_at ASC
         LIMIT 1
       ) rf ON true
       LEFT JOIN user_profiles up ON up.user_id = r.owner_id
       ${whereClause}
       ORDER BY ${orderParts.join(", ")}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      dataValues,
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  files: {
    async create(params: {
      resourceId: string;
      storageKey: string;
      originalFilename: string;
      declaredMimeType: string;
      sizeBytes: number;
    }): Promise<ResourceFileRow> {
      const result = await pool.query<ResourceFileRow>(
        `INSERT INTO resource_files (resource_id, storage_key, original_filename, declared_mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          params.resourceId,
          params.storageKey,
          params.originalFilename,
          params.declaredMimeType,
          params.sizeBytes,
        ],
      );
      return result.rows[0];
    },

    async findById(id: string): Promise<ResourceFileRow | null> {
      const result = await pool.query<ResourceFileRow>(
        `SELECT * FROM resource_files WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async findByResourceId(resourceId: string): Promise<ResourceFileRow[]> {
      const result = await pool.query<ResourceFileRow>(
        `SELECT * FROM resource_files WHERE resource_id = $1 ORDER BY created_at ASC`,
        [resourceId],
      );
      return result.rows;
    },

    async findByStorageKey(
      storageKey: string,
    ): Promise<ResourceFileRow | null> {
      const result = await pool.query<ResourceFileRow>(
        `SELECT * FROM resource_files WHERE storage_key = $1`,
        [storageKey],
      );
      return result.rows[0] ?? null;
    },

    /**
     * Atomic claim-and-transition: the WHERE status='PENDING' clause
     * makes this a single round trip that either succeeds exactly once
     * (first upload attempt) or returns null (already consumed, or the
     * key never existed) — no separate SELECT-then-UPDATE race window.
     */
    async claimForUpload(
      storageKey: string,
      params: { detectedMimeType: string; checksumSha256: string },
    ): Promise<ResourceFileRow | null> {
      const result = await pool.query<ResourceFileRow>(
        `UPDATE resource_files
         SET status = 'UPLOADED', detected_mime_type = $2, checksum_sha256 = $3
         WHERE storage_key = $1 AND status = 'PENDING'
         RETURNING *`,
        [storageKey, params.detectedMimeType, params.checksumSha256],
      );
      return result.rows[0] ?? null;
    },

    async markReady(id: string): Promise<ResourceFileRow | null> {
      const result = await pool.query<ResourceFileRow>(
        `UPDATE resource_files SET status = 'READY' WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async markFailed(id: string): Promise<ResourceFileRow | null> {
      const result = await pool.query<ResourceFileRow>(
        `UPDATE resource_files SET status = 'FAILED' WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] ?? null;
    },
  },
};

export function toApiResource(row: ResourceRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    universityId: row.university_id,
    facultyId: row.faculty_id,
    programmeId: row.programme_id,
    subjectId: row.subject_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List rows carry a bit more than a single-resource fetch: just enough
// (a file id + its detected mime type — never the storage key) for the
// browse page to show an image thumbnail without an extra round trip
// per card to look up "does this resource have a ready image file",
// plus the uploader's display name for the byline.
export function toApiResourceListItem(row: ResourceListRow) {
  return {
    ...toApiResource(row),
    readyFileId: row.ready_file_id,
    readyFileMimeType: row.ready_file_mime_type,
    ownerName: row.owner_name,
  };
}

// storage_key is deliberately never included here — clients never see
// it directly, only through the signed download-url flow.
export function toApiResourceFile(row: ResourceFileRow) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    originalFilename: row.original_filename,
    declaredMimeType: row.declared_mime_type,
    detectedMimeType: row.detected_mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
