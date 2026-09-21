import { Request, Response, NextFunction } from "express";
import { OpportunityModel, type OpportunityApplicationFile } from "../models/opportunityModel";
import { auditLogModel } from "../models/auditLogModel";
import { emailService } from "../services/emailService";
import { tutorService } from "../services/tutorService";
import { logger } from "../utils/logger";
import { env } from "../config/config/env";
import { AppError } from "../types/errors";
import { detectOpportunityFileMimeType } from "../utils/fileSniffer";
import { scanUploadOrThrow } from "../services/malwareScanner";

function marketplaceUrl(): string {
  return `${env.corsOrigins[0]}/marketplace`;
}

export class OpportunityService {
  static async getOpportunities(userId?: string) {
    return await OpportunityModel.getAllActive(userId);
  }

  static async getMyOpportunities(ownerId: string) {
    return await OpportunityModel.getAllForOwner(ownerId);
  }

  static async createOpportunity(
    ownerId: string,
    data: {
      title: string;
      description: string;
      subjectId?: string;
      listingType: string;
      mode: string;
      applicationDeadline?: string;
    },
  ) {
    if (data.listingType === "TUTORING" && !(await tutorService.isVerifiedTutor(ownerId))) {
      throw AppError.badRequest(
        "Apply to become a verified tutor before posting a tutoring listing.",
      );
    }
    return await OpportunityModel.create(ownerId, data);
  }

  static async apply(
    opportunityId: string,
    applicantId: string,
    input: {
      coverMessage: string;
      cvUrl?: string;
      portfolioUrl?: string;
      cv?: OpportunityApplicationFile;
      portfolio?: OpportunityApplicationFile;
    },
    ctx: { requestId?: string; actorRole: "USER" | "ADMIN" },
  ) {
    const opportunity = await OpportunityModel.findById(opportunityId);
    if (!opportunity) throw AppError.notFound("Listing not found.");
    if (opportunity.status !== "active") {
      throw AppError.badRequest("This listing is no longer accepting applications.");
    }
    if (opportunity.owner_id === applicantId) {
      throw AppError.badRequest("You cannot apply to your own listing.");
    }

    // Multer's fileFilter only checked the browser-declared Content-Type
    // (applicationUpload in opportunityRoutes.ts) — never trust that
    // alone. Re-derive the real type from the bytes for each attached
    // file and use that everywhere downstream, then scan before the
    // application (and its files) are ever persisted.
    const cv = await verifyAndScanApplicationFile(input.cv, "cv", opportunityId, applicantId, ctx);
    const portfolio = await verifyAndScanApplicationFile(
      input.portfolio,
      "portfolio",
      opportunityId,
      applicantId,
      ctx,
    );

    const application = await OpportunityModel.createApplication(
      opportunityId,
      applicantId,
      input.coverMessage,
      {
        cv,
        cvUrl: input.cvUrl,
        portfolio,
        portfolioUrl: input.portfolioUrl,
      },
    );

    const applicant = await OpportunityModel.findApplicationById(application.id);

    await OpportunityModel.notifyUser(opportunity.owner_id, "OPPORTUNITY_APPLICATION_RECEIVED", {
      title: "New application received",
      message: `${applicant?.applicant_name ?? "A student"} applied to "${opportunity.title}".`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      applicationId: application.id,
    });

    // Best-effort: the application is already recorded and the poster
    // already has an in-app notification even if email delivery fails —
    // same reasoning as reportService's admin-notification email.
    await emailService
      .sendEmail({
        to: applicant?.applicant_email ?? "",
        subject: `New application for "${opportunity.title}"`,
        text: [
          `${applicant?.applicant_name ?? "A student"} applied to your listing "${opportunity.title}".`,
          `Applicant email: ${applicant?.applicant_email ?? "unknown"}`,
          "",
          "Cover message:",
          input.coverMessage,
          "",
          ...(input.cv || input.cvUrl ? ["A CV was attached — view it from your listing's applications."] : []),
          ...(input.portfolio || input.portfolioUrl ? ["A portfolio was attached — view it from your listing's applications."] : []),
          "",
          `Review this application: ${marketplaceUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, opportunityId }, "Failed to email poster about new application"));

    return application;
  }

  static async getApplicationsForOpportunity(
    actorId: string,
    actorRole: "USER" | "ADMIN",
    opportunityId: string,
  ) {
    const opportunity = await OpportunityModel.findById(opportunityId);
    if (!opportunity) throw AppError.notFound("Listing not found.");
    if (opportunity.owner_id !== actorId && actorRole !== "ADMIN") throw AppError.forbidden();
    return await OpportunityModel.getApplicationsForOpportunity(opportunityId);
  }

  static async updateApplicationStatus(
    actorId: string,
    actorRole: "USER" | "ADMIN",
    applicationId: string,
    status: "accepted" | "declined",
  ) {
    const application = await OpportunityModel.findApplicationById(applicationId);
    if (!application) throw AppError.notFound("Application not found.");
    if (application.opportunity_owner_id !== actorId && actorRole !== "ADMIN") throw AppError.forbidden();
    if (application.status !== "pending") {
      throw AppError.badRequest("This application has already been decided.");
    }

    const updated = await OpportunityModel.updateApplicationStatus(applicationId, status);

    await auditLogModel.record({
      actorUserId: actorId,
      actorRole,
      action: "OPPORTUNITY_APPLICATION_DECIDED",
      targetType: "opportunity_application",
      targetId: applicationId,
      reason: `${status === "accepted" ? "Accepted" : "Declined"} the application for "${application.opportunity_title}".`,
      metadata: { status },
    });

    await OpportunityModel.notifyUser(
      application.applicant_id,
      status === "accepted" ? "OPPORTUNITY_APPLICATION_ACCEPTED" : "OPPORTUNITY_APPLICATION_DECLINED",
      {
        title: status === "accepted" ? "Your application was accepted" : "Your application was declined",
        message: `Your application for "${application.opportunity_title}" was ${status}.`,
        opportunityId: application.opportunity_id,
        opportunityTitle: application.opportunity_title,
        applicationId,
      },
    );

    await emailService
      .sendEmail({
        to: application.applicant_email,
        subject: `Your application for "${application.opportunity_title}" was ${status}`,
        text: [
          `Your application for "${application.opportunity_title}" was ${status} by the poster.`,
          `View the marketplace: ${marketplaceUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, applicationId }, "Failed to email applicant about application decision"));

    return updated;
  }

  static async getApplicationFile(
    actorId: string,
    actorRole: "USER" | "ADMIN",
    applicationId: string,
    kind: "cv" | "portfolio",
  ) {
    const application = await OpportunityModel.findApplicationById(applicationId);
    if (!application) throw AppError.notFound("Application not found.");
    const isAuthorized =
      actorRole === "ADMIN" ||
      application.opportunity_owner_id === actorId ||
      application.applicant_id === actorId;
    if (!isAuthorized) throw AppError.forbidden();

    const file = await OpportunityModel.getApplicationFile(applicationId, kind);
    if (!file) throw AppError.notFound("File not found.");
    return file;
  }

  static async getAllForAdmin() {
    return await OpportunityModel.getAllForAdmin();
  }

  static async updateStatus(adminId: string, id: string, status: string) {
    const result = await OpportunityModel.updateStatus(id, status);
    if (result) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_STATUS_UPDATED", targetType: "opportunity", targetId: id, reason: `Set "${result.title}" to ${status}.`, metadata: { status } });
    return result;
  }

  static async adminCreate(adminId: string, data: { title: string; description: string; mode: string; listingType: string }) {
    const result = await OpportunityModel.create(adminId, data);
    await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_CREATED", targetType: "opportunity", targetId: result.id, reason: `Created "${data.title}".` });
    return result;
  }

  static async adminUpdate(adminId: string, id: string, data: { title: string; description: string; mode: string }) {
    const result = await OpportunityModel.update(id, data);
    if (result) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_UPDATED", targetType: "opportunity", targetId: id, reason: `Updated "${data.title}".` });
    return result;
  }

  static async adminDelete(adminId: string, id: string) {
    const existing = await OpportunityModel.findById(id);
    const removed = await OpportunityModel.remove(id);
    if (removed) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_DELETED", targetType: "opportunity", targetId: id, reason: existing ? `Deleted "${existing.title}".` : undefined });
    return removed;
  }
}

export const getOpportunities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.getOpportunities(req.user?.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const getMyOpportunities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.getMyOpportunities(req.user!.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const createOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ownerId = req.user!.id;
    const data = await OpportunityService.createOpportunity(ownerId, req.body);
    return res
      .status(201)
      .json({ message: "Opportunity created successfully", data });
  } catch (error) {
    return next(error);
  }
};

function fileFromField(files: Record<string, Express.Multer.File[]> | undefined, field: string): OpportunityApplicationFile | undefined {
  const file = files?.[field]?.[0];
  if (!file) return undefined;
  return { filename: file.originalname, mimeType: file.mimetype, data: file.buffer };
}

/**
 * Content-sniffs and malware-scans one attached application file
 * (cv/portfolio), returning it with its mimeType replaced by the
 * content-detected value — so a relabeled file can never be persisted
 * (and later served back) under a spoofed Content-Type. Throws before
 * anything is persisted, so there is nothing to clean up on rejection.
 */
async function verifyAndScanApplicationFile(
  file: OpportunityApplicationFile | undefined,
  fieldName: "cv" | "portfolio",
  opportunityId: string,
  applicantId: string,
  ctx: { requestId?: string; actorRole: "USER" | "ADMIN" },
): Promise<OpportunityApplicationFile | undefined> {
  if (!file) return undefined;
  const detected = detectOpportunityFileMimeType(file.data);
  if (!detected) {
    throw AppError.badRequest(
      `The uploaded ${fieldName === "cv" ? "CV" : "portfolio file"} does not match any supported file type (PDF, Word, JPEG, PNG).`,
    );
  }
  await scanUploadOrThrow(
    { buffer: file.data, filename: file.filename, mimeType: detected },
    {
      requestId: ctx.requestId,
      actorUserId: applicantId,
      actorRole: ctx.actorRole,
      targetType: `opportunity_application_${fieldName}`,
      targetId: opportunityId,
    },
  );
  return { ...file, mimeType: detected };
}

export const applyToOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applicantId = req.user!.id;
    const { id } = req.params;
    const { coverMessage, cvUrl, portfolioUrl } = req.body;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    const data = await OpportunityService.apply(
      id,
      applicantId,
      {
        coverMessage,
        cvUrl: cvUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        cv: fileFromField(files, "cv"),
        portfolio: fileFromField(files, "portfolio"),
      },
      { requestId: req.requestId, actorRole: req.user!.role },
    );
    return res
      .status(201)
      .json({ message: "Application submitted successfully", data });
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "23505") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_APPLICATION",
          message: "You have already applied to this opportunity.",
        },
      });
    }
    return next(error);
  }
};

export const getApplicationsForOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.getApplicationsForOpportunity(
      req.user!.id,
      req.user!.role,
      req.params.id,
    );
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.updateApplicationStatus(
      req.user!.id,
      req.user!.role,
      req.params.applicationId,
      req.body.status,
    );
    return res.json({ message: "Application updated", data });
  } catch (error) {
    return next(error);
  }
};

export const getApplicationFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { applicationId, kind } = req.params as { applicationId: string; kind: "cv" | "portfolio" };
    const file = await OpportunityService.getApplicationFile(req.user!.id, req.user!.role, applicationId, kind);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'")}"`,
    );
    return res.send(file.data);
  } catch (error) {
    return next(error);
  }
};

export const getAllOpportunitiesForAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.getAllForAdmin();
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};

export const updateOpportunityStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await OpportunityService.updateStatus(req.user!.id, id, status);
    if (!data) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Opportunity not found." } });
    }
    return res.json({ message: "Opportunity status updated", data });
  } catch (error) {
    return next(error);
  }
};

export const adminCreateOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await OpportunityService.adminCreate(req.user!.id, req.body); return res.status(201).json({ data }); }
  catch (error) { return next(error); }
};

export const adminUpdateOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await OpportunityService.adminUpdate(req.user!.id, req.params.id, req.body);
    if (!data) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Opportunity not found." } });
    return res.json({ data });
  } catch (error) { return next(error); }
};

export const adminDeleteOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await OpportunityService.adminDelete(req.user!.id, req.params.id))) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Opportunity not found." } });
    return res.status(204).send();
  } catch (error) { return next(error); }
};

/**
 * @openapi
 * /api/v1/opportunities:
 *   get:
 *, summary: Get all active marketplace opportunities
 *     tags: [Opportunities]
 *     responses:
 *       200:
 *         description: List of active opportunities
 */
