import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Runs after express-validator's chain() validators and turns any
 * accumulated errors into a single 400 ApiError with field-level details.
 */
export function validate(req: Request, _res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.type === 'field' ? e.path : undefined,
    message: e.msg,
  }));

  next(ApiError.badRequest('Validation failed', details));
}
