import type { Request, Response, NextFunction } from "express";
import { resourceAgentService } from "../services/resourceAgentService";

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

export const resourceAgentController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params as { resourceId: string };
      const { resourceFileId } = req.body as { resourceFileId?: string };
      const data = await resourceAgentService.getOrCreateSession(resourceId, ctxFrom(req), resourceFileId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId, sessionId } = req.params as { resourceId: string; sessionId: string };
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const data = await resourceAgentService.listMessages(resourceId, sessionId, ctxFrom(req), { page, pageSize });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async askQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId, sessionId } = req.params as { resourceId: string; sessionId: string };
      const { question, idempotencyKey } = req.body as { question: string; idempotencyKey?: string };
      // A validated header takes precedence when both are present — the
      // header is the more conventional place for retry-safety keys.
      const headerKey = req.headers["idempotency-key"];
      const key = typeof headerKey === "string" && headerKey.trim().length > 0 ? headerKey : idempotencyKey;
      const data = await resourceAgentService.askQuestion(resourceId, sessionId, ctxFrom(req), {
        question,
        idempotencyKey: key,
      });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async clearSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId, sessionId } = req.params as { resourceId: string; sessionId: string };
      const data = await resourceAgentService.clearSession(resourceId, sessionId, ctxFrom(req));
      res.status(200).json({ message: "Conversation cleared.", data });
    } catch (err) {
      next(err);
    }
  },

  async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params as { resourceId: string };
      const { resourceFileId } = req.query as { resourceFileId?: string };
      const data = await resourceAgentService.getSuggestions(resourceId, ctxFrom(req), resourceFileId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
};
