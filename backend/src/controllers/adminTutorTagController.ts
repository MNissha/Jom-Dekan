import type { Request, Response, NextFunction } from "express";
import { tutorService } from "../services/tutorService";

export const adminTutorTagController = {
  async grant(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const data = await tutorService.adminGrantTutorTag(req.user!.id, userId, req.body);
      res.status(201).json({ message: "Tutor tag granted.", data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const data = await tutorService.adminUpdateTutorTag(req.user!.id, userId, req.body);
      res.status(200).json({ message: "Tutor tag updated.", data });
    } catch (error) {
      next(error);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      await tutorService.adminRevokeTutorTag(req.user!.id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
