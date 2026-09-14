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
  })
  .strict();

// `until` is optional — an indefinite disable, same as omitting a
// lockout expiry, just means an admin has to manually re-enable it.
export const disableUserSchema = z
  .object({
    until: z.string().datetime({ message: "Invalid date/time." }).optional(),
    reason: z.string().trim().min(5, "A reason of at least 5 characters is required.").max(2000),
  })
  .strict()
  .refine((data) => !data.until || new Date(data.until).getTime() > Date.now(), {
    message: "The disable-until time must be in the future.",
    path: ["until"],
  });

export const deleteUserSchema = z
  .object({
    reason: z.string().trim().min(5, "A reason of at least 5 characters is required.").max(2000),
  })
  .strict();
