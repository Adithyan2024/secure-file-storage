import { CookieOptions, Request, Response } from 'express';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/auth.service';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true, // not readable by JS -> mitigates XSS token theft
  secure: env.isProduction, // HTTPS only in prod; allow http in local dev
  sameSite: 'none', // mitigates CSRF for this cookie
  path: '/api/auth', // only sent to auth endpoints (refresh/logout)
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function issueTokens(res: Response, user: { id: string; email: string; refreshTokenVersion: number }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, version: user.refreshTokenVersion });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return accessToken;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email: string; password: string; name: string };

  const existing = await User.findOne({ email: email.toLowerCase() }).exec();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name });

  const accessToken = issueTokens(res, {
    id: user._id.toString(),
    email: user.email,
    refreshTokenVersion: user.refreshTokenVersion,
  });

  res.status(201).json({ user: user.toJSON(), accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  // Generic message on purpose: don't reveal whether the email exists.
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const accessToken = issueTokens(res, {
    id: user._id.toString(),
    email: user.email,
    refreshTokenVersion: user.refreshTokenVersion,
  });

  res.status(200).json({ user: user.toJSON(), accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).exec();
  if (!user || user.refreshTokenVersion !== payload.version) {
    // Version mismatch means the token was rotated/invalidated (e.g. after logout-all).
    throw ApiError.unauthorized('Refresh token has been invalidated');
  }

  const accessToken = issueTokens(res, {
    id: user._id.toString(),
    email: user.email,
    refreshTokenVersion: user.refreshTokenVersion,
  });

  res.status(200).json({ accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).exec();
  if (!user) throw ApiError.notFound('User not found');
  res.status(200).json({ user: user.toJSON() });
});
