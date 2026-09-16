import type { Request, Response, NextFunction } from "express";
import { tutorService } from "../services/tutorService";

export const adminTutorController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as unknown as { status: "pending" | "approved" | "rejected" };
      const data = await tutorService.listApplications(status);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await tutorService.getApplicationById(id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await tutorService.deleteApplication(req.user!.id, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async decide(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { action, reason } = req.body as { action: "approve" | "reject"; reason?: string };
      const data = await tutorService.decideApplication(
        req.user!.id,
        id,
        action === "approve" ? "approved" : "rejected",
        reason,
      );
      res.status(200).json({ message: "Application decision recorded.", data });
    } catch (error) {
      next(error);
    }
  },
};
