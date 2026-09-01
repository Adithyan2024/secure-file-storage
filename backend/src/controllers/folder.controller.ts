import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createFolder, deleteFolder, listFolders } from '../services/folder.service';
import { IFolder } from '../models/Folder';

function serializeFolder(folder: IFolder) {
  return {
    id: folder._id,
    name: folder.name,
    parentId: folder.parent,
    createdAt: folder.createdAt,
  };
}

export const createFolderHandler = asyncHandler(async (req: Request, res: Response) => {
  const { name, parentId } = req.body as { name: string; parentId: string | null };
  const folder = await createFolder(req.user!._id, name, parentId || null);
  res.status(201).json({ folder: serializeFolder(folder) });
});

export const listFoldersHandler = asyncHandler(async (req: Request, res: Response) => {
  const parentId = (req.query.parentId as string | undefined) || null;
  const folders = await listFolders(req.user!._id, parentId);
  res.status(200).json({ folders: folders.map(serializeFolder) });
});

export const deleteFolderHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteFolder(req.params.id, req.user!._id);
  res.status(204).send();
});
