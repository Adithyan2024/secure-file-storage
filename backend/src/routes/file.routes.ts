import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as fileController from '../controllers/file.controller';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimiter';

// Authenticated routes: /api/files/*
export const fileRouter = Router();
fileRouter.use(requireAuth, apiRateLimiter);

fileRouter.post('/upload', upload.single('file'), fileController.uploadFile);

fileRouter.get(
  '/',
  [
    query('view').optional().isIn(['all', 'private', 'shared', 'trash']),
    query('folderId').optional().isMongoId(),
  ],
  validate,
  fileController.listFiles
);

fileRouter.get('/storage', fileController.getStorage);

fileRouter.get('/:id/download', [param('id').isMongoId()], validate, fileController.downloadOwnFile);

fileRouter.patch(
  '/:id/visibility',
  [param('id').isMongoId(), body('isPublic').isBoolean()],
  validate,
  fileController.updateVisibility
);

fileRouter.patch(
  '/:id/move',
  [param('id').isMongoId(), body('folderId').optional({ nullable: true }).isMongoId()],
  validate,
  fileController.moveFile
);

fileRouter.patch('/:id/trash', [param('id').isMongoId()], validate, fileController.trashFileHandler);
fileRouter.patch('/:id/restore', [param('id').isMongoId()], validate, fileController.restoreFileHandler);
fileRouter.delete('/:id', [param('id').isMongoId()], validate, fileController.permanentlyDeleteFileHandler);

// Public routes: /api/public/files/* - intentionally NOT behind requireAuth.
export const publicFileRouter = Router();
// nanoid's default alphabet includes '-' and '_', so we match that rather
// than isAlphanumeric() (which would reject valid tokens).
const shareTokenValidator = param('token')
  .isLength({ min: 10, max: 64 })
  .matches(/^[A-Za-z0-9_-]+$/);

publicFileRouter.get('/:token/download', [shareTokenValidator], validate, fileController.downloadPublicFile);
publicFileRouter.get('/:token', [shareTokenValidator], validate, fileController.getPublicFileMeta);
