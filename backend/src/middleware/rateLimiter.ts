import rateLimit from 'express-rate-limit';

// Auth endpoints are brute-force targets: keep this tight.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts, please try again later' } },
});

// General API limiter, more permissive.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please slow down' } },
});
