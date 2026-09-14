import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../types/errors';
import { logger } from '../../utils/logger';

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.path}.`,
      details: [],
      requestId: req.requestId,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId: req.requestId }, 'Unhandled application error');
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
        requestId: req.requestId,
        ...(err.meta ? { meta: err.meta } : {}),
      },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unexpected error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
      requestId: req.requestId,
    },
  });
}
