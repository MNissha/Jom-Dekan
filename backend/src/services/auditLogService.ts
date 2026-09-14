import { auditLogModel } from "../models/auditLogModel";

interface ListFilters {
  page: number;
  pageSize: number;
  action?: string;
  search?: string;
}

/**
 * Two read views over the same append-only audit_logs table (see
 * auditLogModel — no update/delete is exported, and migration 029
 * blocks both at the DB layer too). The split is by actor_role,
 * captured at write time by every call site: it's the only reliable
 * way to tell "a user did this to themselves" apart from "an admin did
 * this to someone" for actions like RESOURCE_DELETED that fire from
 * the same code path for both an owner and an admin.
 */
export const auditLogService = {
  async listUserLogs(filters: ListFilters) {
    const { rows, total } = await auditLogModel.list({ actorRole: "USER", ...filters });
    return { data: rows, meta: { page: filters.page, pageSize: filters.pageSize, total } };
  },

  async listAdminLogs(filters: ListFilters) {
    const { rows, total } = await auditLogModel.list({ actorRole: "ADMIN", ...filters });
    return { data: rows, meta: { page: filters.page, pageSize: filters.pageSize, total } };
  },
};
