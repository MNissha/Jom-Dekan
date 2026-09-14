export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  actor_role: "USER" | "ADMIN" | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  action?: string;
  search?: string;
}
