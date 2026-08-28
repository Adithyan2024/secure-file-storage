import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      apiError = ApiError.payloadTooLarge(`File exceeds the maximum allowed size`);
    } else {
      apiError = ApiError.badRequest(`Upload error: ${err.message}`);
    }
  } else if (err && typeof err === 'object' && (err as { name?: string }).name === 'ValidationError') {
    // Mongoose validation error
    apiError = ApiError.badRequest('Validation failed', (err as { message?: string }).message);
  } else if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
    // Mongo duplicate key error
    apiError = ApiError.conflict('A resource with that value already exists');
  } else {
    // Unknown/unexpected error: never leak internals to the client.
    apiError = ApiError.internal();
  }

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    logger.error('Unhandled error', {
      path: req.originalUrl,
      method: req.method,
      error: err instanceof Error ? err.stack : String(err),
    });
  }

  res.status(apiError.statusCode).json({
    error: {
      message: apiError.message,
      details: apiError.details,
      ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}
