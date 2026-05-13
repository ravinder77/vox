import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../src/config/env.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFound } from '../src/middleware/notFound.js';
import { requireAuth } from '../src/middleware/requireAuth.js';
import { requireCsrf } from '../src/middleware/requireCsrf.js';
import { prisma } from '../src/lib/prisma.js';
import { signAuthToken } from '../src/utils/auth.js';
import { HttpError } from '../src/utils/httpError.js';
import { replaceMethod, restoreMethods } from './helpers/replaceMethod.js';

afterEach(() => {
  restoreMethods();
  jest.restoreAllMocks();
});

describe('requireCsrf', () => {
  it('allows safe methods without a csrf token', () => {
    const next = jest.fn();

    requireCsrf({ method: 'GET' } as any, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects unsafe methods with a missing or invalid token', () => {
    const next = jest.fn();

    requireCsrf(
      {
        method: 'POST',
        cookies: { [env.csrfCookieName]: 'cookie-token' },
        get: () => 'different-token',
      } as any,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 403,
      message: 'Invalid CSRF token',
    }));
  });

  it('accepts matching csrf cookie and header values', () => {
    const next = jest.fn();

    requireCsrf(
      {
        method: 'PATCH',
        cookies: { [env.csrfCookieName]: 'csrf-token' },
        get: () => 'csrf-token',
      } as any,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAuth', () => {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
  };

  it('rejects missing auth cookies', async () => {
    const next = jest.fn();

    await requireAuth({ cookies: {} } as any, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'Authentication required',
    }));
  });

  it('rejects invalid auth tokens', async () => {
    const next = jest.fn();

    await requireAuth(
      { cookies: { [env.cookieName]: 'bad-token' } } as any,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'Invalid or expired authentication token',
    }));
  });

  it('rejects tokens for missing users', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => null as any);
    const next = jest.fn();
    const token = signAuthToken(user.id);

    await requireAuth(
      { cookies: { [env.cookieName]: token } } as any,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'Invalid authentication token',
    }));
  });

  it('loads the authenticated user and calls next', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => user as any);
    const next = jest.fn();
    const req = {
      cookies: { [env.cookieName]: signAuthToken(user.id) },
    } as any;

    await requireAuth(req, {} as Response, next);

    expect(req.authUser).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('error responses', () => {
  it('serializes http errors', () => {
    const json = jest.fn();
    const res = {
      headersSent: false,
      status: jest.fn(() => ({ json })),
    } as any;

    errorHandler(new HttpError(409, 'Conflict', { field: 'email' }), {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Conflict',
      details: { field: 'email' },
    });
  });

  it('falls through when headers have already been sent', () => {
    const next = jest.fn();

    errorHandler(new Error('boom'), {} as Request, { headersSent: true } as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns a route-not-found payload', () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => ({ json })),
    } as any;

    notFound({ method: 'GET', originalUrl: '/missing' } as Request, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Route not found: GET /missing',
    });
  });
});
