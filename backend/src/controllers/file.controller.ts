import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { streamFile } from '../utils/streamFile';
import { User } from '../models/User';
import {
  createFileRecord,
  FileView,
  getOwnedFile,
  getPublicFileByToken,
  getStorageUsage,
  listUserFiles,
  moveFileToFolder,
  permanentlyDeleteFile,
  restoreFile,
  setFileVisibility,
  trashFile,
} from '../services/file.service';
import { env } from '../config/env';

function serializeFile(file: {
  _id: unknown;
  originalName: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  shareToken: string;
  downloadCount: number;
  folder: unknown;
  trashedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: file._id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    isPublic: file.isPublic,
    downloadCount: file.downloadCount,
    folderId: file.folder,
    isTrashed: !!file.trashedAt,
    trashedAt: file.trashedAt,
    createdAt: file.createdAt,
    shareUrl: file.isPublic ? `${env.clientOrigin}/share/${file.shareToken}` : null,
  };
}

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded (field name must be "file")');

  const folderId = (req.body.folderId as string | undefined) || null;
  if (folderId && !/^[a-f0-9]{24}$/i.test(folderId)) {
    throw ApiError.badRequest('Invalid folder id');
  }

  const user = await User.findById(req.user!.id).exec();
  if (!user) throw ApiError.unauthorized();

  const file = await createFileRecord({
    owner: req.user!._id,
    originalName: req.file.originalname,
    storageKey: req.file.filename,
    mimeType: req.file.mimetype || 'application/octet-stream',
    size: req.file.size,
    folder: folderId ? new Types.ObjectId(folderId) : null,
    isPublic: user.defaultVisibility === 'public',
  });

  res.status(201).json({ file: serializeFile(file) });
});

const VALID_VIEWS: FileView[] = ['all', 'private', 'shared', 'trash'];

export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const view = (req.query.view as string) || 'all';
  if (!VALID_VIEWS.includes(view as FileView)) throw ApiError.badRequest('Invalid view');

  const folderId = (req.query.folderId as string | undefined) || null;
  const files = await listUserFiles(req.user!._id, view as FileView, folderId);
  res.status(200).json({ files: files.map(serializeFile) });
});

export const updateVisibility = asyncHandler(async (req: Request, res: Response) => {
  const { isPublic } = req.body as { isPublic: boolean };
  const file = await setFileVisibility(req.params.id, req.user!._id, isPublic);
  res.status(200).json({ file: serializeFile(file) });
});

export const moveFile = asyncHandler(async (req: Request, res: Response) => {
  const { folderId } = req.body as { folderId: string | null };
  const file = await moveFileToFolder(req.params.id, req.user!._id, folderId);
  res.status(200).json({ file: serializeFile(file) });
});

export const trashFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const file = await trashFile(req.params.id, req.user!._id);
  res.status(200).json({ file: serializeFile(file) });
});

export const restoreFileHandler = asyncHandler(async (req: Request, res: Response) => {
  const file = await restoreFile(req.params.id, req.user!._id);
  res.status(200).json({ file: serializeFile(file) });
});

export const permanentlyDeleteFileHandler = asyncHandler(async (req: Request, res: Response) => {
  await permanentlyDeleteFile(req.params.id, req.user!._id);
  res.status(204).send();
});

export const getStorage = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).exec();
  if (!user) throw ApiError.unauthorized();
  const { usedBytes, fileCount } = await getStorageUsage(req.user!._id);
  res.status(200).json({ usedBytes, fileCount, quotaBytes: user.storageQuotaBytes });
});

// Owner download - requires auth + ownership, works regardless of isPublic.
export const downloadOwnFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await getOwnedFile(req.params.id, req.user!._id);
  streamFile(req, res, file, true);
});

// Public download - no auth required, but only serves files explicitly
// marked public and not trashed, and re-validates that on every request.
export const downloadPublicFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await getPublicFileByToken(req.params.token);
  file.downloadCount += 1;
  await file.save();
  streamFile(req, res, file, false);
});

export const getPublicFileMeta = asyncHandler(async (req: Request, res: Response) => {
  const file = await getPublicFileByToken(req.params.token);
  res.status(200).json({
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt,
  });
});
