import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../services/auth.service';

/**
 * Requires a valid, non-expired access token in the Authorization header
 * (Bearer scheme). Populates req.user. Does NOT touch the database on
 * every request by design (that's the point of short-lived access tokens) -
 * ownership checks happen per-resource in the route handlers instead.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      _id: new Types.ObjectId(payload.sub),
      email: payload.email,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
