import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import { fileRouter, publicFileRouter } from './routes/file.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // needed for correct client IPs behind a reverse proxy (rate limiting, logging)

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true, // required so the refresh-token cookie is sent/received
    })
  );
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // JSON/urlencoded bodies only need to be small - file bytes never pass
  // through here, they're streamed directly by multer.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize()); // strips keys starting with $ or containing . to prevent NoSQL injection

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRouter);
  app.use('/api/public/files', publicFileRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
