import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { signAuthToken } from '../src/utils/auth.js';
import { replaceMethod, restoreMethods } from './helpers/replaceMethod.js';

afterEach(() => {
  restoreMethods();
  jest.restoreAllMocks();
});

const app = createApp();

const userRecord = {
  id: 'user-1',
  email: 'alex@example.com',
  name: 'Alex Rivera',
  username: 'alex',
  initials: 'AR',
  role: 'Member',
  status: 'online',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('auth routes', () => {
  it('rejects login with missing password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password is required');
  });

  it('rejects login when credentials do not match', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => userRecord as any);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Incorrect email or password');
  });

  it('logs a user in and sets auth cookies', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => userRecord as any);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@example.com', password: 'Password1!' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Welcome back, Alex Rivera',
      data: {
        id: 'user-1',
        email: 'alex@example.com',
      },
      meta: {
        csrfCookieName: env.csrfCookieName,
      },
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${env.cookieName}=`),
        expect.stringContaining(`${env.csrfCookieName}=`),
      ]),
    );
  });

  it('rejects signup when password lacks an uppercase letter', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Alex Rivera',
        username: 'alex',
        email: 'alex@example.com',
        password: 'password1!',
        confirmPassword: 'password1!',
        acceptTerms: true,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password must contain at least one uppercase letter');
  });

  it('rejects signup when the user already exists', async () => {
    replaceMethod(prisma.user, 'findFirst', async () => userRecord as any);

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Alex Rivera',
        username: 'alex',
        email: 'alex@example.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        acceptTerms: true,
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email or username already exists');
  });

  it('creates a new account and returns auth cookies', async () => {
    replaceMethod(prisma.user, 'findFirst', async () => null as any);
    replaceMethod(prisma.user, 'create', async () => userRecord as any);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: ' Alex Rivera ',
        username: 'alex',
        email: 'alex@example.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        acceptTerms: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Account created for Alex Rivera');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${env.cookieName}=`),
        expect.stringContaining(`${env.csrfCookieName}=`),
      ]),
    );
  });

  it('returns the current user and issues a csrf cookie', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => userRecord as any);
    const token = signAuthToken(userRecord.id);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${env.cookieName}=${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'user-1',
        email: 'alex@example.com',
      },
      meta: {
        csrfCookieName: env.csrfCookieName,
      },
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${env.csrfCookieName}=`)]),
    );
  });

  it('logs a user out when auth and csrf cookies are valid', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => userRecord as any);
    const token = signAuthToken(userRecord.id);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [
        `${env.cookieName}=${token}`,
        `${env.csrfCookieName}=csrf-token`,
      ])
      .set('x-csrf-token', 'csrf-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Signed out successfully',
      meta: {
        csrfCookieName: env.csrfCookieName,
      },
    });
  });
});
