import type { Request, Response, NextFunction } from 'express';
import { createReadStream } from 'fs';
import { resourceService } from '../services/resourceService';
import { AppError } from '../types/errors';

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

function buildContentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const resourceController = {
  async createUploadIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await resourceService.createUploadIntent(req.body, ctxFrom(req));
      res.status(201).json({ message: 'Upload intent created.', data });
    } catch (err) {
      next(err);
    }
  },

  async createTextResource(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await resourceService.createTextResource(req.body, ctxFrom(req));
      res.status(201).json({ message: 'Resource posted.', data });
    } catch (err) {
      next(err);
    }
  },

  async receiveUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.storageToken) {
        next(AppError.unauthorized('Invalid or expired link.'));
        return;
      }
      if (!req.file) {
        next(AppError.badRequest('No file was uploaded.'));
        return;
      }
      const data = await resourceService.receiveUpload(req.storageToken.key, req.file.buffer);
      res.status(200).json({ message: 'File uploaded.', data });
    } catch (err) {
      next(err);
    }
  },

  async confirmUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params as { fileId: string };
      const data = await resourceService.confirmUpload(fileId, ctxFrom(req));
      res.status(200).json({ message: 'Upload confirmed.', data });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, meta } = await resourceService.list(
        req.query as unknown as Parameters<typeof resourceService.list>[0],
        ctxFrom(req),
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async listAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, meta } = await resourceService.listAdmin(
        req.query as unknown as Parameters<typeof resourceService.listAdmin>[0],
        ctxFrom(req),
      );
      res.status(200).json({ data, meta });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await resourceService.getById(id, ctxFrom(req));
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await resourceService.update(id, req.body, ctxFrom(req));
      res.status(200).json({ message: 'Resource updated.', data });
    } catch (err) {
      next(err);
    }
  },

  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { action } = req.body as { action: 'ARCHIVE' | 'RESTORE' };
      const data = await resourceService.setStatus(id, action, ctxFrom(req));
      res.status(200).json({
        message: action === 'ARCHIVE' ? 'Resource archived.' : 'Resource restored.',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await resourceService.remove(id, ctxFrom(req));
      res.status(200).json({ message: 'Resource deleted.' });
    } catch (err) {
      next(err);
    }
  },

  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params as { fileId: string };
      const data = await resourceService.getDownloadUrl(fileId, ctxFrom(req));
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.storageToken) {
        next(AppError.unauthorized('Invalid or expired link.'));
        return;
      }
      const { path, mimeType, filename } = await resourceService.resolveDownload(req.storageToken.key);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', buildContentDisposition(filename));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const stream = createReadStream(path);
      stream.on('error', () => next(AppError.notFound('File not found.')));
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
};
