import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initializeRealtime } from './realtime/socket.js';

const app = createApp();
const server = createServer(app);

initializeRealtime(server);

server.listen(env.port, () => {
  console.log(`Vox backend listening on http://localhost:${env.port}`);
});
