import type { Request, Response, NextFunction } from "express";
import { messageService } from "../services/messageService";

export const messageController = {
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const { data, meta } = await messageService.listConversations(req.user!.id, { page, pageSize });
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async createOrGetConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body as { userId: string };
      const data = await messageService.findOrCreateConversation(req.user!.id, userId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params as { conversationId: string };
      const data = await messageService.getConversation(conversationId, req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params as { conversationId: string };
      const { limit, before } = req.query as unknown as { limit: number; before?: string };
      const data = await messageService.listMessages(conversationId, req.user!.id, { limit, before });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params as { conversationId: string };
      const { body } = req.body as { body: string };
      const data = await messageService.sendMessage(conversationId, req.user!.id, body);
      res.status(201).json({ message: "Message sent.", data });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params as { conversationId: string };
      await messageService.markRead(conversationId, req.user!.id);
      res.status(200).json({ message: "Conversation marked as read." });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await messageService.getUnreadCount(req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
};
