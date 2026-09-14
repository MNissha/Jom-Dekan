import { z } from "zod";

export const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    action: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
