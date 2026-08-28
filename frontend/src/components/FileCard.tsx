import { useState } from 'react';
import { deleteFileRequest, downloadOwnFile, FileItem, setVisibilityRequest } from '../api/files';
import { extractErrorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { formatBytes, formatDate } from '../utils/format';
import { LockIcon, UnlockIcon } from './icons';

interface Props {
  file: FileItem;
  onChanged: (updated: FileItem) => void;
  onDeleted: (id: string) => void;
}

export function FileCard({ file, onChanged, onDeleted }: Props) {
  const { showToast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function toggleVisibility() {
    setIsToggling(true);
    try {
      const updated = await setVisibilityRequest(file.id, !file.isPublic);
      onChanged(updated);
      showToast(updated.isPublic ? 'File is now public' : 'File is now private');
    } catch (err) {
      showToast(extractErrorMessage(err));
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${file.originalName}"? This can't be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteFileRequest(file.id);
      onDeleted(file.id);
    } catch (err) {
      showToast(extractErrorMessage(err));
      setIsDeleting(false);
    }
  }

  async function handleDownload() {
    try {
      await downloadOwnFile(file);
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  function copyShareLink() {
    if (!file.shareUrl) return;
    navigator.clipboard.writeText(file.shareUrl);
    showToast('Share link copied');
  }

  return (
    <div className="vault-box">
      <div className="vault-box-top">
        <div>
          <div className="vault-box-name">{file.originalName}</div>
          <div className="vault-box-meta">
            {formatBytes(file.size)} · {formatDate(file.createdAt)}
          </div>
        </div>
        <button
          className={`lock-toggle${file.isPublic ? ' is-public' : ''}`}
          onClick={toggleVisibility}
          disabled={isToggling}
          title={file.isPublic ? 'Public — click to make private' : 'Private — click to make public'}
          style={{ flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <span className="lock-dial">{file.isPublic ? <UnlockIcon /> : <LockIcon />}</span>
          <span className="lock-label">{file.isPublic ? 'Public' : 'Private'}</span>
        </button>
      </div>

      {file.isPublic && file.shareUrl && (
        <div className="share-row">
          <span>{file.shareUrl}</span>
          <button onClick={copyShareLink}>Copy</button>
        </div>
      )}

      <div className="vault-box-actions">
        <button className="btn" onClick={handleDownload}>
          Download
        </button>
        <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
