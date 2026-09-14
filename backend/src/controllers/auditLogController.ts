import type { Request, Response, NextFunction } from "express";
import { auditLogService } from "../services/auditLogService";

export const auditLogController = {
  async listUserLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, meta } = await auditLogService.listUserLogs(
        req.query as unknown as Parameters<typeof auditLogService.listUserLogs>[0],
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async listAdminLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, meta } = await auditLogService.listAdminLogs(
        req.query as unknown as Parameters<typeof auditLogService.listAdminLogs>[0],
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },
};
