import type { Request, Response, NextFunction } from "express";
import { reportService } from "../services/reportService";
import { reportModel } from "../models/reportModel";

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

export const reportController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.create(
        {
          ...req.body,
          evidence: req.file
            ? {
                filename: req.file.originalname,
                mimeType: req.file.mimetype,
                data: req.file.buffer,
              }
            : undefined,
        },
        ctxFrom(req),
      );
      res.status(201).json({ message: "Report submitted.", data });
    } catch (err) {
      next(err);
    }
  },
  async evidence(req: Request, res: Response, next: NextFunction) {
    try {
      const evidence = await reportModel.getEvidence(req.params.id);
      if (!evidence?.evidence_data || !evidence.evidence_mime_type) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Report evidence not found." },
        });
      }
      res.setHeader("Content-Type", evidence.evidence_mime_type);
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "private, max-age=300");
      return res.send(evidence.evidence_data);
    } catch (err) {
      return next(err);
    }
  },
};
