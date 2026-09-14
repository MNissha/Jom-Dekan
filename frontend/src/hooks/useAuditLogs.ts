import { useQuery } from "@tanstack/react-query";
import { auditLogService } from "../service/auditLogService";
import type { AuditLogListParams } from "../types/auditLog";

export function useUserAuditLogs(params: AuditLogListParams, enabled = true) {
  return useQuery({
    queryKey: ["admin", "logs", "user", params],
    queryFn: () => auditLogService.listUserLogs(params),
    enabled,
  });
}

export function useAdminAuditLogs(params: AuditLogListParams, enabled = true) {
  return useQuery({
    queryKey: ["admin", "logs", "admin", params],
    queryFn: () => auditLogService.listAdminLogs(params),
    enabled,
  });
}
