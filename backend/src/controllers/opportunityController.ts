import { Request, Response, NextFunction } from "express";
import { OpportunityModel } from "../models/opportunityModel";
import { auditLogModel } from "../models/auditLogModel";

export class OpportunityService {
  static async getOpportunities() {
    return await OpportunityModel.getAllActive();
  }

  static async createOpportunity(
    ownerId: string,
    data: {
      title: string;
      description: string;
      subjectId?: string;
      listingType: string;
      mode: string;
    },
  ) {
    return await OpportunityModel.create(ownerId, data);
  }

  static async apply(
    opportunityId: string,
    applicantId: string,
    coverMessage: string,
  ) {
    return await OpportunityModel.createApplication(
      opportunityId,
      applicantId,
      coverMessage,
    );
  }

  static async getAllForAdmin() {
    return await OpportunityModel.getAllForAdmin();
  }

  static async updateStatus(adminId: string, id: string, status: string) {
    const result = await OpportunityModel.updateStatus(id, status);
    if (result) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_STATUS_UPDATED", targetType: "opportunity", targetId: id, metadata: { status } });
    return result;
  }

  static async adminCreate(adminId: string, data: { title: string; description: string; mode: string; listingType: string }) {
    const result = await OpportunityModel.create(adminId, data);
    await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_CREATED", targetType: "opportunity", targetId: result.id });
    return result;
  }

  static async adminUpdate(adminId: string, id: string, data: { title: string; description: string; mode: string }) {
    const result = await OpportunityModel.update(id, data);
    if (result) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_UPDATED", targetType: "opportunity", targetId: id });
    return result;
  }

  static async adminDelete(adminId: string, id: string) {
    const removed = await OpportunityModel.remove(id);
    if (removed) await auditLogModel.record({ actorUserId: adminId, actorRole: "ADMIN", action: "ADMIN_OPPORTUNITY_DELETED", targetType: "opportunity", targetId: id });
    return removed;
  }
}

export const getOpportunities = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await OpportunityService.getOpportunities();
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

export const applyToOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const applicantId = req.user!.id;
    const { id } = req.params;
    const { coverMessage } = req.body;

    const data = await OpportunityService.apply(id, applicantId, coverMessage);
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
