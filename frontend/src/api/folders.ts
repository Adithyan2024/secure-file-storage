import { apiClient } from './axios';

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export async function listFoldersRequest(parentId: string | null): Promise<FolderItem[]> {
  const params: Record<string, string> = {};
  if (parentId) params.parentId = parentId;
  const res = await apiClient.get<{ folders: FolderItem[] }>('/folders', { params });
  return res.data.folders;
}

export async function createFolderRequest(name: string, parentId: string | null): Promise<FolderItem> {
  const res = await apiClient.post<{ folder: FolderItem }>('/folders', { name, parentId });
  return res.data.folder;
}

export async function deleteFolderRequest(id: string): Promise<void> {
  await apiClient.delete(`/folders/${id}`);
}
