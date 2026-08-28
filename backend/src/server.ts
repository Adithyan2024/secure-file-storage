/// <reference path="./types/express.d.ts" />
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`, { env: env.nodeEnv });
  });

  // Large uploads (100MB+) over slow connections need generous timeouts,
  // otherwise Node's default socket timeout can kill an in-flight upload.
  server.requestTimeout = 10 * 60 * 1000; // 10 minutes
  server.headersTimeout = 10 * 60 * 1000 + 5000;

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
