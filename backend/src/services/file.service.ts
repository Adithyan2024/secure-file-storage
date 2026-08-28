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
}

export async function createFileRecord(input: CreateFileInput): Promise<IFile> {
  const file = await FileModel.create({
    ...input,
    isPublic: false,
    shareToken: nanoid(32),
  });
  return file;
}

export async function listUserFiles(ownerId: Types.ObjectId): Promise<IFile[]> {
  return FileModel.find({ owner: ownerId }).sort({ createdAt: -1 }).exec();
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
  // Re-check isPublic even though the token was hard to guess: if the owner
  // has since flipped the file back to private, access must be revoked
  // immediately without needing to rotate the token.
  if (!file || !file.isPublic) throw ApiError.notFound('File not found or no longer public');
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

export async function deleteFile(fileId: string, ownerId: Types.ObjectId): Promise<void> {
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

export function absoluteStoragePath(storageKey: string): string {
  return path.join(env.uploadDir, storageKey);
}
