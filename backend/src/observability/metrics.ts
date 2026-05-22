import type { NextFunction, Request, Response } from 'express';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  prefix: 'voxchat_',
  register: metricsRegistry,
});

const httpRequestsTotal = new Counter({
  name: 'voxchat_http_requests_total',
  help: 'Total number of HTTP requests handled by the backend.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'voxchat_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

const realtimeConnections = new Gauge({
  name: 'voxchat_realtime_connections',
  help: 'Current number of active Socket.IO connections.',
  registers: [metricsRegistry],
});

function routeLabel(req: Request, res: Response): string {
  if (req.route?.path) {
    return `${req.baseUrl}${String(req.route.path)}`;
  }

  if (res.statusCode === 404) {
    return 'not_found';
  }

  return req.baseUrl ? `${req.baseUrl}/*` : 'unmatched';
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') {
    next();
    return;
  }

  const endTimer = httpRequestDurationSeconds.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req, res),
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
}

export function recordRealtimeConnectionOpened() {
  realtimeConnections.inc();
}

export function recordRealtimeConnectionClosed() {
  realtimeConnections.dec();
}
