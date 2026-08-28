/**
 * Standardized operational error. Anything thrown as ApiError is trusted
 * to carry a safe, user-facing message and correct HTTP status code.
 * Unexpected (non-ApiError) errors are treated as bugs and never leak
 * their internal message to the client (see errorHandler middleware).
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static payloadTooLarge(message = 'File too large') {
    return new ApiError(413, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
