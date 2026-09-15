/**
 * Typed, local-only errors for the agent's read-only layers (chunking,
 * tool execution) — thrown before any OpenAI call, so
 * resourceAgentService can map them to a safe, specific AppError without
 * ever spending a daily-limit slot on a source the agent can't actually
 * ground answers in. Deliberately not `AppError` subclasses: these
 * modules have no business knowing about HTTP status codes (see
 * architecture.md's model/service layering).
 */
export type AgentUnsupportedReason =
  | "NO_CACHED_SUMMARY"
  | "INSUFFICIENT_EVIDENCE";

export class AgentUnsupportedSourceError extends Error {
  readonly reason: AgentUnsupportedReason;

  constructor(reason: AgentUnsupportedReason, message: string) {
    super(message);
    this.name = "AgentUnsupportedSourceError";
    this.reason = reason;
  }
}
