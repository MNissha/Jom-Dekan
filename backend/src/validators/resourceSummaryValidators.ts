import { z } from "zod";

export const resourceSummaryResourceIdParamSchema = z
  .object({ resourceId: z.string().uuid("Invalid resource id.") })
  .strict();

// Optional everywhere it appears — a single-file or text-only resource
// never needs it, and an unset value falls back to the same deterministic
// recommendation resourceSourceSelectionService would otherwise show.
const resourceFileIdSchema = z.string().uuid("Invalid file id.").optional();

export const resourceSummaryGetQuerySchema = z
  .object({ resourceFileId: resourceFileIdSchema })
  .strict();

export const resourceSummaryGenerateBodySchema = z
  .object({ resourceFileId: resourceFileIdSchema })
  .strict();

export const resourceSummaryDownloadQuerySchema = z
  .object({
    format: z.enum(["pdf", "docx"], {
      errorMap: () => ({ message: "format must be 'pdf' or 'docx'." }),
    }),
    resourceFileId: resourceFileIdSchema,
  })
  .strict();
