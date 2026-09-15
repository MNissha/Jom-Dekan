import type { Request, Response, NextFunction } from "express";
import { resourceSummaryService } from "../services/resourceSummaryService";
import {
  buildSummaryDocumentViewModel,
  renderSummaryDocx,
  renderSummaryPdf,
} from "../services/resourceSummaryDocumentService";
import { sanitizeFilenameForHeader } from "../utils/storagePaths";

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

function buildContentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function buildDownloadFilename(title: string, format: "pdf" | "docx"): string {
  const clean = sanitizeFilenameForHeader(title).replace(/\s+/g, "-").slice(0, 80).replace(/^-+|-+$/g, "");
  return `JomDekan-${clean || "Resource"}-AI-Summary.${format}`;
}

const MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export const resourceSummaryController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params as { resourceId: string };
      const { resourceFileId } = req.query as { resourceFileId?: string };
      const data = await resourceSummaryService.getSummary(resourceId, ctxFrom(req), resourceFileId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async generateSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params as { resourceId: string };
      const { resourceFileId } = req.body as { resourceFileId?: string };
      const data = await resourceSummaryService.generateSummary(resourceId, ctxFrom(req), resourceFileId);
      res.status(200).json({ message: "Summary ready.", data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Never calls OpenAI: resourceSummaryService.getReadySummaryForDownload
   * requires an existing READY row and throws otherwise. The PDF/DOCX
   * bytes are generated fresh on every request (deterministic, from the
   * cached JSON) rather than cached themselves — cheap relative to the
   * AI call this route never makes.
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params as { resourceId: string };
      const { format, resourceFileId } = req.query as { format: "pdf" | "docx"; resourceFileId?: string };

      const { resource, subjectName, summary, generatedAt } =
        await resourceSummaryService.getReadySummaryForDownload(resourceId, ctxFrom(req), resourceFileId);

      const viewModel = buildSummaryDocumentViewModel({
        resourceTitle: resource.title,
        category: resource.category,
        subjectName,
        generatedAt,
        summary,
      });

      const buffer = format === "pdf" ? await renderSummaryPdf(viewModel) : await renderSummaryDocx(viewModel);
      const filename = buildDownloadFilename(resource.title, format);

      res.setHeader("Content-Type", MIME_TYPES[format]);
      res.setHeader("Content-Disposition", buildContentDisposition(filename));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  },
};
