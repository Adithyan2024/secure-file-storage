import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { streamFile } from '../utils/streamFile';
import {
  createFileRecord,
  deleteFile,
  getOwnedFile,
  getPublicFileByToken,
  listUserFiles,
  setFileVisibility,
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
  createdAt: Date;
}) {
  return {
    id: file._id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    isPublic: file.isPublic,
    downloadCount: file.downloadCount,
    createdAt: file.createdAt,
    shareUrl: file.isPublic ? `${env.clientOrigin}/share/${file.shareToken}` : null,
  };
}

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded (field name must be "file")');

  const file = await createFileRecord({
    owner: req.user!._id,
    originalName: req.file.originalname,
    storageKey: req.file.filename,
    mimeType: req.file.mimetype || 'application/octet-stream',
    size: req.file.size,
  });

  res.status(201).json({ file: serializeFile(file) });
});

export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await listUserFiles(req.user!._id);
  res.status(200).json({ files: files.map(serializeFile) });
});

export const updateVisibility = asyncHandler(async (req: Request, res: Response) => {
  const { isPublic } = req.body as { isPublic: boolean };
  const file = await setFileVisibility(req.params.id, req.user!._id, isPublic);
  res.status(200).json({ file: serializeFile(file) });
});

export const removeFile = asyncHandler(async (req: Request, res: Response) => {
  await deleteFile(req.params.id, req.user!._id);
  res.status(204).send();
});

// Owner download - requires auth + ownership, works regardless of isPublic.
export const downloadOwnFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await getOwnedFile(req.params.id, req.user!._id);
  streamFile(req, res, file, true);
});

// Public download - no auth required, but only serves files explicitly
// marked public, and re-validates that flag on every request (see
// getPublicFileByToken for why).
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
