import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { closeRealtime, initializeRealtime } from './realtime/socket.js';

const shutdownTimeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);
let isShuttingDown = false;

const app = createApp({
  isShuttingDown: () => isShuttingDown,
});
const server = createServer(app);

initializeRealtime(server);

server.listen(env.port, () => {
  console.log(`Vox backend listening on http://localhost:${env.port}`);
});

function closeHttpServer() {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function gracefulShutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`Received ${signal}. Gracefully shutting down Vox backend.`);

  const timeout = setTimeout(() => {
    console.error(`Graceful shutdown timed out after ${shutdownTimeoutMs}ms. Forcing exit.`);
    server.closeAllConnections();
    process.exit(1);
  }, shutdownTimeoutMs);
  timeout.unref();

  try {
    const httpClose = closeHttpServer();
    server.closeIdleConnections();

    await closeRealtime();
    await httpClose;
    await prisma.$disconnect();

    clearTimeout(timeout);
    console.info('Vox backend shutdown complete.');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error('Vox backend graceful shutdown failed.', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.once('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});
