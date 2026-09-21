/**
 * A typed application error carrying an HTTP status and a stable,
 * machine-readable error code that the frontend can branch on without
 * parsing message strings.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ field?: string; message: string }>;
  /** Small, structured, machine-readable extras (e.g. a lockout expiry
   * timestamp) that don't fit the validation-error `details` shape. */
  readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field?: string; message: string }>,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.meta = meta;
  }

  static badRequest(message: string, details?: Array<{ field?: string; message: string }>): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required.', meta?: Record<string, unknown>): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message, undefined, meta);
  }

  /** Account temporarily locked out after too many failed login attempts. */
  static locked(lockoutUntil: Date, message = 'Too many failed login attempts. Your account is temporarily locked.'): AppError {
    return new AppError(423, 'ACCOUNT_LOCKED', message, undefined, { lockoutUntil: lockoutUntil.toISOString() });
  }

  static forbidden(message = 'You do not have permission to perform this action.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'The requested resource could not be found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.'): AppError {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'An unexpected error occurred.'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }

  /** A required backing service (e.g. the malware scanner) is unreachable — the caller should retry shortly. */
  static serviceUnavailable(message = 'This action is temporarily unavailable. Please try again shortly.'): AppError {
    return new AppError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
