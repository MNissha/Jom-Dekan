import { Request, Response, NextFunction } from "express";
import {
  ModerationModel,
  type ModerationDecision,
} from "../models/moderationModel";
import { emailService } from "../services/emailService";
import { logger } from "../utils/logger";

export class ModerationService {
  static async getNotifications(userId: string) {
    return await ModerationModel.getNotificationsForUser(userId);
  }

  static async markRead(id: string, userId: string) {
    return await ModerationModel.markNotificationRead(id, userId);
  }

  static async sendAnnouncement(
    adminId: string,
    input: { title: string; message: string; sendToAll: boolean; userIds: string[] },
  ) {
    return await ModerationModel.sendAnnouncement(adminId, input);
  }

  static async getQueue() {
    return await ModerationModel.getModerationQueue();
  }

  static async handleAction(
    targetType: string,
    id: string,
    action: string,
    adminId: string,
    reason: string,
    details?: {
      moderationDecision?: ModerationDecision;
      responseTitle?: string;
      notificationTitle?: string;
      notificationMessage?: string;
      emailSubject?: string;
      emailBody?: string;
      moderationNotes?: string;
    },
  ) {
    if (targetType === "resource") {
      const statusMap: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        quarantine: "quarantined",
      };
      return await ModerationModel.updateResourceModeration(
        id,
        statusMap[action],
        adminId,
        reason,
      );
    }
    if (targetType === "report") {
      if (
        !details?.moderationDecision ||
        !details.responseTitle ||
        !details.notificationTitle ||
        !details.notificationMessage ||
        !details.emailSubject ||
        !details.emailBody
      ) {
        throw new Error("A complete report decision and response are required.");
      }
      const status =
        action === "approve" ? "RESOLVED_APPROVED" : "RESOLVED_REJECTED";
      const report = await ModerationModel.resolveReport(
        id,
        status,
        details.moderationDecision,
        adminId,
        details.responseTitle,
        reason,
        details.notificationTitle,
        details.notificationMessage,
        details.moderationNotes,
      );
      if (report?.reporter_email) {
        try {
          await emailService
          .sendEmail({
            to: report.reporter_email,
            subject: details.emailSubject,
            text: details.emailBody,
          });
          await ModerationModel.updateReportEmailStatus(id, "SENT");
        } catch (error) {
          await ModerationModel.updateReportEmailStatus(id, "FAILED");
          logger.error({ error, reportId: id }, "Failed to email report outcome");
        }
      }
      if (
        report?.comment_owner_email &&
        status === "RESOLVED_APPROVED"
      ) {
        const ownerMessage =
          details.moderationDecision === "CONTENT_REMOVAL"
            ? `Your comment in "${report.discussion_title}" was removed because it violated JomDekan's Community Guidelines.`
            : details.moderationDecision === "CONTENT_RESTRICTION"
              ? `Your comment in "${report.discussion_title}" was restricted following a moderation review.`
              : `A policy warning was issued regarding your comment in "${report.discussion_title}".`;
        await emailService
          .sendEmail({
            to: report.comment_owner_email,
            subject: "Action taken on your JomDekan comment",
            text: `${ownerMessage}\n\nThe reporter's identity remains confidential.\n\nJomDekan Moderation Team`,
          })
          .catch((error) =>
            logger.error({ error, reportId: id }, "Failed to email comment owner"),
          );
      }
      return report;
    }
    throw new Error("Unsupported moderation target type");
  }
}

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const data = await ModerationService.getNotifications(userId);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = await ModerationService.markRead(id, userId);
    if (!data)
      return res
        .status(404)
        .json({
          error: { code: "NOT_FOUND", message: "Notification not found." },
        });
    return res.json({ message: "Notification marked as read", data });
  } catch (error) {
    return next(error);
  }
};

export const sendAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recipientCount = await ModerationService.sendAnnouncement(
      req.user!.id,
      req.body,
    );
    return res.status(201).json({
      message: "Announcement sent successfully.",
      data: { recipientCount },
    });
  } catch (error) {
    return next(error);
  }
};

export const getModerationQueue = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await ModerationService.getQueue();
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const handleModerationAction = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const adminId = req.user!.id;
    const { targetType, id } = req.params;
    const { action, reason } = req.body;

    const data = await ModerationService.handleAction(
      targetType,
      id,
      action,
      adminId,
      reason,
      req.body,
    );
    return res.json({
      message: "Moderation action recorded successfully",
      data,
    });
  } catch (error) {
    return next(error);
  }
};
