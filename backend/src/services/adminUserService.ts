import { AppError } from "../types/errors";
import { userModel } from "../models/userModel";
import { sessionModel } from "../models/sessionModel";
import { auditLogModel } from "../models/auditLogModel";
import { emailService } from "./emailService";
import { logger } from "../utils/logger";
import {
  adminUserModel,
  toApiAdminUserListItem,
  toApiAdminUserProfile,
  toApiAdminUserResource,
  toApiAdminUserForumActivity,
  toApiAdminUserApplication,
} from "../models/adminUserModel";

function paginate(filters: { page: number; pageSize: number }) {
  return {
    limit: filters.pageSize,
    offset: (filters.page - 1) * filters.pageSize,
  };
}

interface ActionContext {
  requestId?: string;
  ipAddress?: string;
}

export const adminUserService = {
  async list(filters: { search?: string; page: number; pageSize: number }) {
    await userModel.reactivateExpiredSuspensions();
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
    await userModel.reactivateExpiredSuspensions();
    const row = await adminUserModel.getProfile(userId);
    if (!row) throw AppError.notFound("User not found.");
    return toApiAdminUserProfile(row);
  },

  async disable(
    actorUserId: string,
    userId: string,
    params: { until?: string; reason: string },
    ctx: ActionContext,
  ) {
    if (actorUserId === userId) {
      throw AppError.badRequest("You cannot disable your own account.");
    }
    const existing = await userModel.findById(userId);
    if (!existing) throw AppError.notFound("User not found.");

    const until = params.until ? new Date(params.until) : null;
    const updated = await userModel.suspend(userId, until);
    if (!updated) throw AppError.notFound("User not found.");

    // Immediate effect rather than waiting for the short-lived access
    // token to expire on its own.
    await sessionModel.revokeAllForUser(userId);

    await auditLogModel.record({
      actorUserId,
      action: "ACCOUNT_DISABLED",
      targetType: "user",
      targetId: userId,
      reason: params.reason,
      metadata: { until: until ? until.toISOString() : null },
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    // Best-effort, same reasoning as reportService's admin-notification
    // email: the account is already disabled either way.
    await emailService
      .sendEmail({
        to: existing.email,
        subject: "Your JomDekan account has been disabled",
        text: [
          "Your JomDekan account has been disabled by an administrator.",
          `Reason: ${params.reason}`,
          until
            ? `Your account will be automatically re-enabled on ${until.toLocaleString()}.`
            : "This disable is indefinite — an administrator will need to manually re-enable your account.",
          "If you believe this is a mistake, please contact support.",
        ].join("\n\n"),
      })
      .catch((err) => logger.error({ err, userId }, "Failed to email user about account being disabled"));

    const profile = await adminUserModel.getProfile(userId);
    return toApiAdminUserProfile(profile!);
  },

  async enable(actorUserId: string, userId: string, ctx: ActionContext) {
    const existing = await userModel.findById(userId);
    if (!existing) throw AppError.notFound("User not found.");

    const updated = await userModel.reactivate(userId);
    if (!updated) throw AppError.notFound("User not found.");

    await auditLogModel.record({
      actorUserId,
      action: "ACCOUNT_ENABLED",
      targetType: "user",
      targetId: userId,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    await emailService
      .sendEmail({
        to: existing.email,
        subject: "Your JomDekan account has been re-enabled",
        text: "Your JomDekan account has been re-enabled by an administrator. You can log in again.",
      })
      .catch((err) => logger.error({ err, userId }, "Failed to email user about account being re-enabled"));

    const profile = await adminUserModel.getProfile(userId);
    return toApiAdminUserProfile(profile!);
  },

  async remove(
    actorUserId: string,
    userId: string,
    params: { reason: string },
    ctx: ActionContext,
  ) {
    if (actorUserId === userId) {
      throw AppError.badRequest("You cannot delete your own account.");
    }
    const existing = await userModel.findById(userId);
    if (!existing) throw AppError.notFound("User not found.");

    const updated = await userModel.softDelete(userId);
    if (!updated) throw AppError.notFound("User not found.");

    await sessionModel.revokeAllForUser(userId);

    await auditLogModel.record({
      actorUserId,
      action: "ACCOUNT_DELETED",
      targetType: "user",
      targetId: userId,
      reason: params.reason,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    await emailService
      .sendEmail({
        to: existing.email,
        subject: "Your JomDekan account has been deleted",
        text: [
          "Your JomDekan account has been deleted by an administrator.",
          `Reason: ${params.reason}`,
          "If you believe this is a mistake, please contact support.",
        ].join("\n\n"),
      })
      .catch((err) => logger.error({ err, userId }, "Failed to email user about account deletion"));
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
    filters: { page: number; pageSize: number },
  ) {
    const { limit, offset } = paginate(filters);
    const { rows, total } = await adminUserModel.listForumActivityByAuthor(
      userId,
      limit,
      offset,
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
};
