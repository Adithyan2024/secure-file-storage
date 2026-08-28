import axios from 'axios';
import { apiClient } from './axios';
import { getAccessToken } from './tokenStore';

export interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  shareUrl: string | null;
}

export async function listFilesRequest(): Promise<FileItem[]> {
  const res = await apiClient.get<{ files: FileItem[] }>('/files');
  return res.data.files;
}

export async function uploadFileRequest(
  file: File,
  onProgress: (percent: number) => void
): Promise<FileItem> {
  const form = new FormData();
  form.append('file', file);

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

export async function deleteFileRequest(id: string): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Owner downloads need the Authorization header, which a plain <a href>
 * can't attach - so we fetch as a blob and trigger a client-side download.
 * Fine for this use case; a true streaming-to-disk download for huge files
 * would use the browser's native download via a short-lived signed URL
 * instead (noted as a future improvement in the README).
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
