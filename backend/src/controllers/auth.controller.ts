import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import type { ApiRequest } from '../types/api.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { mapUser } from '../utils/chatMapper.js';
import { assert, HttpError } from '../utils/httpError.js';
import {
  buildClearCookieOptions,
  buildClearCsrfCookieOptions,
  buildCookieOptions,
  buildCsrfCookieOptions,
  createCsrfToken,
  signAuthToken,
} from '../utils/auth.js';

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authMeta() {
  return {
    csrfCookieName: env.csrfCookieName,
  };
}

export const getCurrentUser = asyncHandler(async function getCurrentUser(req, res) {
  const typedReq = req as ApiRequest;
  const typedRes = res as Response;
  const csrfToken = req.cookies?.[env.csrfCookieName] || createCsrfToken();
  typedRes.cookie(env.csrfCookieName, csrfToken, buildCsrfCookieOptions());

  typedRes.json({
    success: true,
    data: mapUser(typedReq.authUser),
    meta: authMeta(),
  });
});

export const login = asyncHandler(async function login(req, res) {
  const typedReq = req as ApiRequest<any, any, Record<string, any>>;
  const typedRes = res as Response;
  const { email, password } = typedReq.body;

  assert(validEmail(email || ''), 400, 'A valid email address is required');
  assert(password, 400, 'Password is required');

  const user = await prisma.user.findUnique({
    where: { email: email.trim() },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }

  const token = signAuthToken(user.id);
  const csrfToken = createCsrfToken();
  typedRes.cookie(env.cookieName, token, buildCookieOptions());
  typedRes.cookie(env.csrfCookieName, csrfToken, buildCsrfCookieOptions());

  typedRes.json({
    success: true,
    message: `Welcome back, ${user.name}`,
    data: mapUser(user),
    meta: authMeta(),
  });
});

export const signup = asyncHandler(async function signup(req, res) {
  const typedReq = req as ApiRequest<any, any, Record<string, any>>;
  const typedRes = res as Response;
  const { name, username, email, password, confirmPassword, acceptTerms } = typedReq.body;

  assert((name || '').trim().length >= 2, 400, 'Name must be at least 2 characters');
  assert(
    /^[a-zA-Z0-9_.]{3,}$/.test(username || ''),
    400,
    'Username must be 3+ chars and use letters, numbers, _ or .',
  );
  assert(validEmail(email || ''), 400, 'A valid email address is required');
  assert((password || '').length >= 8, 400, 'Password must be at least 8 characters');
  assert(/[A-Z]/.test(password || ''), 400, 'Password must contain at least one uppercase letter');
  assert(password === confirmPassword, 400, 'Passwords do not match');
  assert(Boolean(acceptTerms), 400, 'Terms of Service must be accepted');

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: email.trim() }, { username: username.trim() }],
    },
  });

  if (existingUser) {
    throw new HttpError(409, 'Email or username already exists');
  }

  const user = await prisma.user.create({
    data: {
      id: `user-${crypto.randomUUID()}`,
      email: email.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      name: name.trim(),
      username: username.trim(),
      initials:
        name
          .trim()
          .split(/\s+/)
          .map((part: string) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'U',
      role: 'Member',
      status: 'online',
    },
  });

  const token = signAuthToken(user.id);
  const csrfToken = createCsrfToken();
  typedRes.cookie(env.cookieName, token, buildCookieOptions());
  typedRes.cookie(env.csrfCookieName, csrfToken, buildCsrfCookieOptions());

  typedRes.status(201).json({
    success: true,
    message: `Account created for ${user.name}`,
    data: mapUser(user),
    meta: authMeta(),
  });
});

export const forgotPassword = asyncHandler(async function forgotPassword(req, res) {
  const typedReq = req as ApiRequest<any, any, Record<string, any>>;
  const typedRes = res as Response;
  const { email } = typedReq.body;

  assert(validEmail(email || ''), 400, 'A valid email address is required');

  typedRes.json({
    success: true,
    message: 'Reset link sent',
    data: {
      email,
      sentAt: new Date().toISOString(),
    },
  });
});

export const logout = asyncHandler(async function logout(req, res) {
  const typedRes = res as Response;
  typedRes.clearCookie(env.cookieName, buildClearCookieOptions());
  typedRes.clearCookie(env.csrfCookieName, buildClearCsrfCookieOptions());

  typedRes.json({
    success: true,
    message: 'Signed out successfully',
    meta: authMeta(),
  });
});
