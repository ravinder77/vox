import type { NextFunction, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import type { ApiRequest } from '../types/api.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAuthToken } from '../utils/auth.js';

export async function requireAuth(req: ApiRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.cookieName];

    if (!token) {
      throw new HttpError(401, 'Authentication required');
    }

    const payload = verifyAuthToken(token) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid authentication token');
    }

    req.authUser = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired authentication token'));
  }
}
