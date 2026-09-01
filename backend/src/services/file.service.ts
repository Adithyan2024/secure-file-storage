import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import { FileModel, IFile } from '../models/File';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export interface CreateFileInput {
  owner: Types.ObjectId;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  folder: Types.ObjectId | null;
  isPublic: boolean;
}

export type FileView = 'all' | 'private' | 'shared' | 'trash';

export async function createFileRecord(input: CreateFileInput): Promise<IFile> {
  const file = await FileModel.create({
    ...input,
    shareToken: nanoid(32),
    trashedAt: null,
  });
  return file;
}

/**
 * Lists files for a given "view" (mirrors the sidebar: My Files / Private /
 * Shared / Trash), optionally scoped to a folder. Trashed files are always
 * excluded except when the view itself IS the trash.
 */
export async function listUserFiles(
  ownerId: Types.ObjectId,
  view: FileView,
  folderId: string | null | undefined
): Promise<IFile[]> {
  const query: Record<string, unknown> = { owner: ownerId };

  if (view === 'trash') {
    query.trashedAt = { $ne: null };
  } else {
    query.trashedAt = null;
    if (view === 'private') query.isPublic = false;
    if (view === 'shared') query.isPublic = true;
  }

  // Folder scoping only makes sense for the "My Files" (all) view; other
  // views intentionally show matching files regardless of which folder
  // they're in, same as Google Drive's Trash/Shared behave.
  if (view === 'all') {
    if (folderId) {
      if (!Types.ObjectId.isValid(folderId)) throw ApiError.badRequest('Invalid folder id');
      query.folder = folderId;
    } else {
      query.folder = null;
    }
  }

  return FileModel.find(query).sort({ createdAt: -1 }).exec();
}

/**
 * Loads a file and asserts the requester owns it. Throws 404 (not 403) when
 * the file doesn't belong to the requester, so we don't leak the existence
 * of other users' files via status-code probing.
 */
export async function getOwnedFile(fileId: string, ownerId: Types.ObjectId): Promise<IFile> {
  if (!Types.ObjectId.isValid(fileId)) throw ApiError.notFound('File not found');
  const file = await FileModel.findOne({ _id: fileId, owner: ownerId }).exec();
  if (!file) throw ApiError.notFound('File not found');
  return file;
}

export async function getPublicFileByToken(token: string): Promise<IFile> {
  const file = await FileModel.findOne({ shareToken: token }).exec();
  // Re-check isPublic (and not trashed) even though the token was hard to
  // guess: if the owner has since flipped the file back to private, or
  // trashed it, access must be revoked immediately without rotating the token.
  if (!file || !file.isPublic || file.trashedAt) {
    throw ApiError.notFound('File not found or no longer public');
  }
  return file;
}

export async function setFileVisibility(
  fileId: string,
  ownerId: Types.ObjectId,
  isPublic: boolean
): Promise<IFile> {
  const file = await getOwnedFile(fileId, ownerId);
  file.isPublic = isPublic;
  await file.save();
  return file;
}

export async function moveFileToFolder(
  fileId: string,
  ownerId: Types.ObjectId,
  folderId: string | null
): Promise<IFile> {
  const file = await getOwnedFile(fileId, ownerId);
  if (folderId && !Types.ObjectId.isValid(folderId)) throw ApiError.badRequest('Invalid folder id');
  file.folder = folderId ? new Types.ObjectId(folderId) : null;
  await file.save();
  return file;
}

export async function trashFile(fileId: string, ownerId: Types.ObjectId): Promise<IFile> {
  const file = await getOwnedFile(fileId, ownerId);
  file.trashedAt = new Date();
  await file.save();
  return file;
}

export async function restoreFile(fileId: string, ownerId: Types.ObjectId): Promise<IFile> {
  const file = await getOwnedFile(fileId, ownerId);
  file.trashedAt = null;
  await file.save();
  return file;
}

/** Permanently deletes a file - only meant to be called on an already-trashed file. */
export async function permanentlyDeleteFile(fileId: string, ownerId: Types.ObjectId): Promise<void> {
  const file = await getOwnedFile(fileId, ownerId);
  const absolutePath = path.join(env.uploadDir, file.storageKey);

  await FileModel.deleteOne({ _id: file._id }).exec();

  // Best-effort disk cleanup after the DB record is gone; if this fails we
  // log it but don't fail the request - an orphaned blob is recoverable via
  // a cleanup job, but a file record with no owner-facing way to delete it
  // is worse.
  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error(`[file-cleanup] failed to remove ${absolutePath}:`, err.message);
    }
  });
}

export async function getStorageUsage(ownerId: Types.ObjectId): Promise<{ usedBytes: number; fileCount: number }> {
  const result = await FileModel.aggregate([
    { $match: { owner: ownerId, trashedAt: null } },
    { $group: { _id: null, usedBytes: { $sum: '$size' }, fileCount: { $sum: 1 } } },
  ]).exec();

  if (result.length === 0) return { usedBytes: 0, fileCount: 0 };
  return { usedBytes: result[0].usedBytes, fileCount: result[0].fileCount };
}

export function absoluteStoragePath(storageKey: string): string {
  return path.join(env.uploadDir, storageKey);
}
