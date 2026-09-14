import { z } from "zod";

export const userIdParamSchema = z
  .object({ id: z.string().uuid("Invalid id.") })
  .strict();

export const listAdminUsersQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export const adminUserSubListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    type: z.enum(["post", "comment"]).optional(),
  })
  .strict();

export const userOpportunityParamSchema = z.object({
  id: z.string().uuid("Invalid id."),
  listingType: z.enum(["TUTORING", "PROJECT_MENTORSHIP"]),
}).strict();

const adminRoleSchema = z.enum(["USER", "ADMIN"]);
const adminStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export const createAdminUserBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(120),
  role: adminRoleSchema.default("USER"),
}).strict();

export const updateAdminUserBodySchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(2).max(120),
  role: adminRoleSchema,
}).strict();

export const updateAdminUserStatusBodySchema = z.object({
  status: adminStatusSchema,
}).strict();
