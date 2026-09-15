/**
 * Typed, local-only errors for the text-extraction step — thrown before
 * any OpenAI call is ever made, so resourceSummaryService can persist
 * them as UNSUPPORTED without spending a daily-limit slot or a request
 * to OpenAI. Deliberately not `AppError` subclasses: this module has no
 * business knowing about HTTP status codes (see architecture.md's
 * model/service layering) — resourceSummaryService maps these to a safe
 * AppError at the boundary where that mapping belongs.
 */
export type ResourceSummaryUnsupportedCode =
  | "UNSUPPORTED_MIME_TYPE"
  | "INSUFFICIENT_CONTENT"
  | "IMAGE_TOO_LARGE";

export class ResourceSummaryUnsupportedError extends Error {
  readonly code: ResourceSummaryUnsupportedCode;

  constructor(code: ResourceSummaryUnsupportedCode, message: string) {
    super(message);
    this.name = "ResourceSummaryUnsupportedError";
    this.code = code;
  }
}
