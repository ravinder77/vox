import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  buildClearCookieOptions,
  buildClearCsrfCookieOptions,
  buildCookieOptions,
  buildCsrfCookieOptions,
  createCsrfToken,
  signAuthToken,
  verifyAuthToken,
} from '../src/utils/auth.js';
import { conversationAccessWhere } from '../src/utils/conversationAccess.js';
import { assert, HttpError } from '../src/utils/httpError.js';

describe('auth utils', () => {
  const originalNodeEnv = env.nodeEnv;
  const originalJwtExpiresIn = env.jwtExpiresIn;

  afterEach(() => {
    env.nodeEnv = originalNodeEnv;
    env.jwtExpiresIn = originalJwtExpiresIn;
  });

  it('signs and verifies auth tokens', () => {
    const token = signAuthToken('user-123');
    const payload = verifyAuthToken(token) as jwt.JwtPayload;

    expect(payload.sub).toBe('user-123');
  });

  it('builds auth and csrf cookie options', () => {
    expect(buildCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    expect(buildClearCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    expect(buildCsrfCookieOptions()).toMatchObject({
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    expect(buildClearCsrfCookieOptions()).toMatchObject({
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });

  it('supports production cookies and numeric expiry values', () => {
    env.nodeEnv = 'production';
    env.jwtExpiresIn = 3600 as any;

    expect(buildCookieOptions()).toMatchObject({
      secure: true,
      maxAge: 3600 * 1000,
    });
    expect(buildCsrfCookieOptions()).toMatchObject({
      secure: true,
      maxAge: 3600 * 1000,
    });
  });

  it('falls back to a 7-day max age for unsupported durations', () => {
    env.jwtExpiresIn = 'weird-value' as any;

    expect(buildCookieOptions().maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    expect(buildCsrfCookieOptions().maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('creates random csrf tokens', () => {
    const first = createCsrfToken();
    const second = createCsrfToken();

    expect(first).toMatch(/^[a-f0-9]{48}$/);
    expect(second).toMatch(/^[a-f0-9]{48}$/);
    expect(first).not.toBe(second);
  });
});

describe('http helpers', () => {
  it('builds conversation access filters', () => {
    expect(conversationAccessWhere('user-1')).toEqual({
      participants: {
        some: {
          userId: 'user-1',
        },
      },
    });

    expect(conversationAccessWhere('user-1', 'conv-1')).toEqual({
      id: 'conv-1',
      participants: {
        some: {
          userId: 'user-1',
        },
      },
    });
  });

  it('throws HttpError from assert when condition fails', () => {
    expect(() => assert(false, 403, 'Forbidden', { code: 'denied' })).toThrow(HttpError);

    try {
      assert(false, 403, 'Forbidden', { code: 'denied' });
    } catch (error) {
      expect(error).toMatchObject({
        status: 403,
        message: 'Forbidden',
        details: { code: 'denied' },
      });
    }
  });

  it('does not throw when assert condition passes', () => {
    expect(() => assert(true, 200, 'ok')).not.toThrow();
  });
});
