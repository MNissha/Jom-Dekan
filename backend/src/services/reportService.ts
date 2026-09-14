import { reportModel, toApiReport, type ReportCategory, type ReportTargetType } from "../models/reportModel";
import { resourceService } from "./resourceService";
import { forumModel } from "../models/forumModel";
import { OpportunityModel } from "../models/opportunityModel";
import { emailService } from "./emailService";
import { auditLogModel } from "../models/auditLogModel";
import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

// Same existence gate as favoriteService's assertTargetExists — a
// report can't be filed against something that doesn't exist or (for a
// resource) isn't visible to this user.
async function assertTargetExists(targetType: ReportTargetType, targetId: string, ctx: ActorContext): Promise<string | undefined> {
  if (targetType === "resource") {
    await resourceService.getById(targetId, ctx);
    return undefined;
  }
  if (targetType === "forum_post") {
    const post = await forumModel.posts.findById(targetId);
    if (!post || post.deleted_at) throw AppError.notFound("Post not found.");
    return undefined;
  }
  const opportunity = await OpportunityModel.findById(targetId);
  if (!opportunity) throw AppError.notFound("Listing not found.");
  return opportunity.listing_type;
}

export const reportService = {
  async create(
    input: {
      targetType: ReportTargetType;
      targetId: string;
      category: ReportCategory;
      reporterName: string;
      reporterPhone: string;
      reporterEmail: string;
      description: string;
      parentId?: string;
      evidence?: { filename: string; mimeType: string; data: Buffer };
    },
    ctx: ActorContext,
  ) {
    let listingType: string | undefined;
    if (input.targetType === "forum_comment") {
      const comment = await forumModel.comments.findById(input.targetId);
      if (!comment || comment.deleted_at) throw AppError.notFound("Comment not found.");
      if (comment.post_id !== input.parentId) throw AppError.badRequest("Comment does not belong to this discussion.");
      if (comment.author_id === ctx.actorUserId) throw AppError.badRequest("You cannot report your own comment.");
    } else {
      listingType = await assertTargetExists(input.targetType, input.targetId, ctx);
    }

    let report;
    try {
      report = await reportModel.create({
        entityType: input.targetType,
        entityId: input.targetId,
        reporterId: ctx.actorUserId,
        category: input.category,
        reporterName: input.reporterName,
        reporterPhone: input.reporterPhone,
        reporterEmail: input.reporterEmail,
        description: input.description,
        evidence: input.evidence,
        parentId: input.parentId,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw AppError.conflict(
          "You have already reported this comment. Our moderation team will review your existing report.",
        );
      }
      throw error;
    }

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      action: "REPORT_SUBMITTED",
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: { reportId: report.id, category: input.category },
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    const admins = await reportModel.listAdmins();
    await reportModel.notifyAdmins(
      admins.map((a) => a.id),
      { reportId: report.id, entityType: input.targetType, entityId: input.targetId, category: input.category, listingType },
    );

    // Best-effort: a report is already recorded and admins already have
    // an in-app notification even if email delivery fails, so this
    // never fails the request itself.
    await Promise.all(
      admins.map((admin) =>
        emailService
          .sendEmail({
            to: admin.email,
            subject: `New JomDekan report: ${input.category.replace(/_/g, " ").toLowerCase()}`,
            text: [
              `A new report was filed on a ${input.targetType.replace("_", " ")}.`,
              `Category: ${input.category}`,
              `Reported by: ${input.reporterName} (${input.reporterEmail}, ${input.reporterPhone})`,
              "",
              input.description,
              "",
              `Report id: ${report.id}`,
            ].join("\n"),
          })
          .catch((err) => logger.error({ err, adminId: admin.id }, "Failed to email admin about new report")),
      ),
    );

    return toApiReport(report);
  },
};
