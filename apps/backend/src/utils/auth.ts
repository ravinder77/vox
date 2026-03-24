import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { CookieOptions } from 'express';
import type { StringValue } from 'ms';
import { env } from '../config/env.js';

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as StringValue,
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.jwtSecret);
}

function parseDurationToMs(value: string | number): number {
  if (typeof value === 'number') {
    return value * 1000;
  }

  const match = String(value).trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof multipliers;

  return amount * multipliers[unit];
}

export function buildCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: parseDurationToMs(env.jwtExpiresIn),
  };
}

export function buildClearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  };
}

export function buildCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: parseDurationToMs(env.jwtExpiresIn),
  };
}

export function buildClearCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  };
}

export function createCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
