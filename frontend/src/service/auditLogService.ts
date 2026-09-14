import axiosInstance from "../api/axiosInstance";
import type { AuditLogEntry, AuditLogListParams } from "../types/auditLog";
import type { PaginatedMeta } from "../types/adminUser";

interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

export const auditLogService = {
  async listUserLogs(params: AuditLogListParams): Promise<Paginated<AuditLogEntry>> {
    const res = await axiosInstance.get<Paginated<AuditLogEntry>>("/admin/logs/users", { params });
    return res.data;
  },

  async listAdminLogs(params: AuditLogListParams): Promise<Paginated<AuditLogEntry>> {
    const res = await axiosInstance.get<Paginated<AuditLogEntry>>("/admin/logs/admin", { params });
    return res.data;
  },
};
