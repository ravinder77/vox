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

  it('returns a ready response from /ready', async () => {
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Vox backend is ready',
    });
    expect(response.body.data).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });

  it('exposes Prometheus metrics from /metrics', async () => {
    await request(app).get('/health');

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('voxchat_http_requests_total');
    expect(response.text).toContain('voxchat_realtime_connections');
  });

  it('uses a bounded metrics route label for unmatched requests', async () => {
    await request(app).get('/does-not-exist');

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('route="not_found"');
    expect(response.text).not.toContain('route="/does-not-exist"');
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
