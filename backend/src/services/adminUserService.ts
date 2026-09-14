import { AppError } from "../types/errors";
import {
  adminUserModel,
  toApiAdminUserListItem,
  toApiAdminUserProfile,
  toApiAdminUserResource,
  toApiAdminUserForumActivity,
  toApiAdminUserApplication,
  toApiAdminUserOpportunity,
} from "../models/adminUserModel";
import bcrypt from "bcryptjs";
import { userModel } from "../models/userModel";
import { sessionModel } from "../models/sessionModel";
import { auditLogModel } from "../models/auditLogModel";

function paginate(filters: { page: number; pageSize: number }) {
  return {
    limit: filters.pageSize,
    offset: (filters.page - 1) * filters.pageSize,
  };
}

export const adminUserService = {
  async create(input: { email: string; password: string; displayName: string; role: "USER" | "ADMIN" }, adminId: string) {
    if (await userModel.findByEmail(input.email)) {
      throw AppError.conflict("An account with this email already exists.");
    }
    const row = await adminUserModel.create({
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      displayName: input.displayName,
      role: input.role,
    });
    await auditLogModel.record({ actorUserId: adminId, action: "ADMIN_USER_CREATED", targetType: "user", targetId: row.id, metadata: { role: input.role } });
    return toApiAdminUserProfile(row);
  },

  async update(userId: string, input: { email: string; displayName: string; role: "USER" | "ADMIN" }, adminId: string) {
    if (userId === adminId && input.role !== "ADMIN") {
      throw AppError.badRequest("You cannot remove your own admin access.");
    }
    const emailOwner = await userModel.findByEmail(input.email);
    if (emailOwner && emailOwner.id !== userId) throw AppError.conflict("An account with this email already exists.");
    const row = await adminUserModel.update(userId, input);
    if (!row) throw AppError.notFound("User not found.");
    if (userId !== adminId) await sessionModel.revokeAllForUser(userId);
    await auditLogModel.record({ actorUserId: adminId, action: "ADMIN_USER_UPDATED", targetType: "user", targetId: userId, metadata: { role: input.role } });
    return toApiAdminUserProfile(row);
  },

  async updateStatus(userId: string, status: "ACTIVE" | "SUSPENDED", adminId: string) {
    if (userId === adminId) throw AppError.badRequest("You cannot suspend your own admin account.");
    const row = await adminUserModel.updateStatus(userId, status);
    if (!row) throw AppError.notFound("User not found.");
    if (status === "SUSPENDED") await sessionModel.revokeAllForUser(userId);
    await auditLogModel.record({ actorUserId: adminId, action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED", targetType: "user", targetId: userId });
    return toApiAdminUserProfile(row);
  },

  async remove(userId: string, adminId: string) {
    if (userId === adminId) throw AppError.badRequest("You cannot delete your own admin account.");
    if (!(await adminUserModel.softDelete(userId))) throw AppError.notFound("User not found.");
    await sessionModel.revokeAllForUser(userId);
    await auditLogModel.record({ actorUserId: adminId, action: "ADMIN_USER_DELETED", targetType: "user", targetId: userId });
  },

  async list(filters: { search?: string; page: number; pageSize: number }) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listWithStats({
      search: filters.search,
      limit,
      offset,
    });
    return {
      data: rows.map(toApiAdminUserListItem),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },

  async getProfile(userId: string) {
    const row = await adminUserModel.getProfile(userId);
    if (!row) throw AppError.notFound("User not found.");
    return toApiAdminUserProfile(row);
  },

  async getResources(
    userId: string,
    filters: { page: number; pageSize: number },
  ) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listResourcesByOwner(
      userId,
      limit,
      offset,
    );
    return {
      data: rows.map(toApiAdminUserResource),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },

  async getForumActivity(
    userId: string,
    filters: { page: number; pageSize: number; type?: "post" | "comment" },
  ) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listForumActivityByAuthor(
      userId,
      limit,
      offset,
      filters.type,
    );
    return {
      data: rows.map(toApiAdminUserForumActivity),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },

  async getApplications(
    userId: string,
    filters: { page: number; pageSize: number },
  ) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listApplicationsByApplicant(
      userId,
      limit,
      offset,
    );
    return {
      data: rows.map(toApiAdminUserApplication),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },

  async getOpportunities(userId: string, listingType: "TUTORING" | "PROJECT_MENTORSHIP", filters: { page: number; pageSize: number }) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listOpportunitiesByOwner(userId, listingType, limit, offset);
    return { data: rows.map(toApiAdminUserOpportunity), meta: { page: filters.page, pageSize: filters.pageSize, total } };
  },
};
