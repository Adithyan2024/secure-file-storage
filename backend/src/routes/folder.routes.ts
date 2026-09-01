import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as folderController from '../controllers/folder.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const folderRouter = Router();
folderRouter.use(requireAuth, apiRateLimiter);

folderRouter.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Folder name is required'),
    body('parentId').optional({ nullable: true }).isMongoId(),
  ],
  validate,
  folderController.createFolderHandler
);

folderRouter.get('/', [query('parentId').optional().isMongoId()], validate, folderController.listFoldersHandler);

folderRouter.delete('/:id', [param('id').isMongoId()], validate, folderController.deleteFolderHandler);
