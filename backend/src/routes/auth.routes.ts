import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
