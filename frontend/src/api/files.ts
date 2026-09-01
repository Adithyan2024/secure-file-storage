import axios from 'axios';
import { apiClient } from './axios';
import { getAccessToken } from './tokenStore';

export type FileView = 'all' | 'private' | 'shared' | 'trash';

export interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  downloadCount: number;
  folderId: string | null;
  isTrashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  shareUrl: string | null;
}

export interface StorageStats {
  usedBytes: number;
  fileCount: number;
  quotaBytes: number;
}

export async function listFilesRequest(view: FileView, folderId: string | null): Promise<FileItem[]> {
  const params: Record<string, string> = { view };
  if (folderId) params.folderId = folderId;
  const res = await apiClient.get<{ files: FileItem[] }>('/files', { params });
  return res.data.files;
}

export async function uploadFileRequest(
  file: File,
  folderId: string | null,
  onProgress: (percent: number) => void
): Promise<FileItem> {
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);

  const res = await apiClient.post<{ file: FileItem }>('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
  return res.data.file;
}

export async function setVisibilityRequest(id: string, isPublic: boolean): Promise<FileItem> {
  const res = await apiClient.patch<{ file: FileItem }>(`/files/${id}/visibility`, { isPublic });
  return res.data.file;
}

export async function moveFileRequest(id: string, folderId: string | null): Promise<FileItem> {
  const res = await apiClient.patch<{ file: FileItem }>(`/files/${id}/move`, { folderId });
  return res.data.file;
}

export async function trashFileRequest(id: string): Promise<FileItem> {
  const res = await apiClient.patch<{ file: FileItem }>(`/files/${id}/trash`);
  return res.data.file;
}

export async function restoreFileRequest(id: string): Promise<FileItem> {
  const res = await apiClient.patch<{ file: FileItem }>(`/files/${id}/restore`);
  return res.data.file;
}

export async function permanentlyDeleteFileRequest(id: string): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

export async function getStorageRequest(): Promise<StorageStats> {
  const res = await apiClient.get<StorageStats>('/files/storage');
  return res.data;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Owner downloads need the Authorization header, which a plain <a href>
 * can't attach - so we fetch as a blob and trigger a client-side download.
 */
export async function downloadOwnFile(file: FileItem): Promise<void> {
  const token = getAccessToken();
  const res = await axios.get(`${API_BASE_URL}/api/files/${file.id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    responseType: 'blob',
  });
  triggerBrowserDownload(res.data, file.originalName);
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
