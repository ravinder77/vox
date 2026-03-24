import type { NextFunction, Response } from 'express';
import type { ApiRequest } from '../types/api.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function requireCsrf(req: ApiRequest, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies?.[env.csrfCookieName];
  const csrfHeader = req.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return next(new HttpError(403, 'Invalid CSRF token'));
  }

  next();
}
