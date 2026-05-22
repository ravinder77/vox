import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { metricsHandler, metricsMiddleware } from './observability/metrics.js';
import apiRoutes from './routes/index.js';

type AppOptions = {
  isShuttingDown?: () => boolean;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.set('etag', false);

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.use(metricsMiddleware);

  app.get('/metrics', metricsHandler);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Vox backend is healthy',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/ready', (_req: Request, res: Response) => {
    if (options.isShuttingDown?.()) {
      res.status(503).json({
        success: false,
        message: 'Vox backend is shutting down',
        data: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.json({
      success: true,
      message: 'Vox backend is ready',
      data: {
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api', (_req: Request, res: Response, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
