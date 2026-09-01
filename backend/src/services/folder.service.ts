import { Types } from 'mongoose';
import { Folder, IFolder } from '../models/Folder';
import { FileModel } from '../models/File';
import { ApiError } from '../utils/ApiError';

export async function createFolder(
  ownerId: Types.ObjectId,
  name: string,
  parentId: string | null
): Promise<IFolder> {
  if (parentId) {
    if (!Types.ObjectId.isValid(parentId)) throw ApiError.badRequest('Invalid parent folder id');
    const parent = await Folder.findOne({ _id: parentId, owner: ownerId }).exec();
    if (!parent) throw ApiError.notFound('Parent folder not found');
  }

  return Folder.create({ owner: ownerId, name, parent: parentId || null });
}

export async function listFolders(ownerId: Types.ObjectId, parentId: string | null | undefined): Promise<IFolder[]> {
  const query: Record<string, unknown> = { owner: ownerId };
  if (parentId) {
    if (!Types.ObjectId.isValid(parentId)) throw ApiError.badRequest('Invalid parent folder id');
    query.parent = parentId;
  } else {
    query.parent = null;
  }
  return Folder.find(query).sort({ name: 1 }).exec();
}

export async function getOwnedFolder(folderId: string, ownerId: Types.ObjectId): Promise<IFolder> {
  if (!Types.ObjectId.isValid(folderId)) throw ApiError.notFound('Folder not found');
  const folder = await Folder.findOne({ _id: folderId, owner: ownerId }).exec();
  if (!folder) throw ApiError.notFound('Folder not found');
  return folder;
}

/**
 * Deletes a folder. Refuses if it still contains files or subfolders, so
 * users don't accidentally orphan or silently lose nested content - they
 * have to empty it first, same as most file managers.
 */
export async function deleteFolder(folderId: string, ownerId: Types.ObjectId): Promise<void> {
  const folder = await getOwnedFolder(folderId, ownerId);

  const [fileCount, subfolderCount] = await Promise.all([
    FileModel.countDocuments({ folder: folder._id, trashedAt: null }).exec(),
    Folder.countDocuments({ parent: folder._id }).exec(),
  ]);

  if (fileCount > 0 || subfolderCount > 0) {
    throw ApiError.conflict('Folder is not empty. Move or delete its contents first.');
  }

  await Folder.deleteOne({ _id: folder._id }).exec();
}
