import { Request, Response, NextFunction } from "express";
import { supportRequestModel, type SupportRequestType } from "../models/supportRequestModel";
import { notificationModel } from "../models/notificationModel";
import { emailService } from "../services/emailService";
import { logger } from "../utils/logger";

export class SupportRequestService {
  static async submit(
    userId: string,
    userEmail: string,
    data: { type: SupportRequestType; subject?: string; message: string },
  ) {
    const isSuggestion = data.type === "SUGGESTION";
    const subject = data.subject?.trim() || "New suggestion";

    const request = await supportRequestModel.create(userId, {
      type: data.type,
      subject,
      message: data.message,
    });

    await notificationModel.notifyAdmins(
      isSuggestion ? "SUGGESTION_SUBMITTED" : "SUPPORT_REQUEST_SUBMITTED",
      {
        title: isSuggestion ? "New suggestion submitted" : "New support request",
        message: `${userEmail} — "${subject}"`,
        supportRequestId: request.id,
      },
    );

    // Best-effort: the request is already recorded and admins already have
    // an in-app notification even if email delivery fails — same reasoning
    // as reportService's admin-notification email.
    const admins = await supportRequestModel.listAdmins();
    await Promise.all(
      admins.map((admin) =>
        emailService
          .sendEmail({
            to: admin.email,
            subject: `JomDekan ${isSuggestion ? "suggestion" : "support request"}: ${subject}`,
            text: [
              `${userEmail} submitted a ${isSuggestion ? "suggestion" : "support request"} on JomDekan.`,
              `Subject: ${subject}`,
              "",
              data.message,
              "",
              `Reply directly to: ${userEmail}`,
            ].join("\n"),
          })
          .catch((err) =>
            logger.error({ err, requestId: request.id }, "Failed to email admin about support request"),
          ),
      ),
    );

    return request;
  }
}

export const submitSupportRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await SupportRequestService.submit(req.user!.id, req.user!.email, req.body);
    return res.status(201).json({ message: "Thanks — we'll get back to you soon.", data });
  } catch (error) {
    return next(error);
  }
};
