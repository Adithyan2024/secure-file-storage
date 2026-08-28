import { Router } from 'express';
import { body, param } from 'express-validator';
import * as fileController from '../controllers/file.controller';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimiter';

// Authenticated routes: /api/files/*
export const fileRouter = Router();
fileRouter.use(requireAuth, apiRateLimiter);

fileRouter.post('/upload', upload.single('file'), fileController.uploadFile);
fileRouter.get('/', fileController.listFiles);
fileRouter.get('/:id/download', [param('id').isMongoId()], validate, fileController.downloadOwnFile);
fileRouter.patch(
  '/:id/visibility',
  [param('id').isMongoId(), body('isPublic').isBoolean()],
  validate,
  fileController.updateVisibility
);
fileRouter.delete('/:id', [param('id').isMongoId()], validate, fileController.removeFile);

// Public routes: /api/public/files/* - intentionally NOT behind requireAuth.
export const publicFileRouter = Router();
// nanoid's default alphabet includes '-' and '_', so we match that rather
// than isAlphanumeric() (which would reject valid tokens).
const shareTokenValidator = param('token')
  .isLength({ min: 10, max: 64 })
  .matches(/^[A-Za-z0-9_-]+$/);

publicFileRouter.get('/:token/download', [shareTokenValidator], validate, fileController.downloadPublicFile);
publicFileRouter.get('/:token', [shareTokenValidator], validate, fileController.getPublicFileMeta);
