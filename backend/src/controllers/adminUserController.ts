import type { Request, Response, NextFunction } from "express";
import { adminUserService } from "../services/adminUserService";

export const adminUserController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUserService.create(req.body, req.user!.id);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUserService.update(req.params.id, req.body, req.user!.id);
      res.status(200).json({ data });
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUserService.updateStatus(req.params.id, req.body.status, req.user!.id);
      res.status(200).json({ data });
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, meta } = await adminUserService.list(
        req.query as unknown as Parameters<typeof adminUserService.list>[0],
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await adminUserService.getProfile(id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getResources(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { data, meta } = await adminUserService.getResources(
        id,
        req.query as unknown as { page: number; pageSize: number },
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async getForumActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { data, meta } = await adminUserService.getForumActivity(
        id,
        req.query as unknown as { page: number; pageSize: number; type?: "post" | "comment" },
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { data, meta } = await adminUserService.getApplications(
        id,
        req.query as unknown as { page: number; pageSize: number },
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await adminUserService.disable(
        req.user!.id,
        id,
        req.body as { until?: string; reason: string },
        { requestId: req.requestId, ipAddress: req.ip },
      );
      res.status(200).json({ message: "Account disabled.", data });
    } catch (err) {
      next(err);
    }
  },

  async enable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await adminUserService.enable(req.user!.id, id, {
        requestId: req.requestId,
        ipAddress: req.ip,
      });
      res.status(200).json({ message: "Account re-enabled.", data });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await adminUserService.remove(
        req.user!.id,
        id,
        req.body as { reason: string },
        { requestId: req.requestId, ipAddress: req.ip },
      );
      res.status(200).json({ message: "Account deleted." });
    } catch (err) {
      next(err);
    }
  },

  async getOpportunities(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, listingType } = req.params as { id: string; listingType: "TUTORING" | "PROJECT_MENTORSHIP" };
      const { data, meta } = await adminUserService.getOpportunities(id, listingType, req.query as unknown as { page: number; pageSize: number });
      res.status(200).json({ data, meta });
    } catch (err) { next(err); }
  },
};
