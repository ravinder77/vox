import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';

export function errorHandler(
  err: Error | HttpError,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : 500;

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    details: err instanceof HttpError ? err.details : null,
  });
}
