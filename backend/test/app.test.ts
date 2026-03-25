import request from 'supertest';
import { createApp } from '../src/app.js';

describe('backend app', () => {
  const app = createApp();

  it('returns a healthy response from /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Vox backend is healthy',
    });
    expect(response.body.data).toEqual(
      expect.objectContaining({
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      }),
    );
  });

  it('rejects forgot-password requests with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'invalid-email' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'A valid email address is required',
    });
  });

  it('accepts forgot-password requests with a valid email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Reset link sent',
      data: {
        email: 'user@example.com',
      },
    });
    expect(response.body.data.sentAt).toEqual(expect.any(String));
  });
});
