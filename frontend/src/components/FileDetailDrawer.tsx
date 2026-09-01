import { FileItem } from '../api/files';
import { formatBytes, formatDate } from '../utils/format';
import { DownloadIcon, RestoreIcon, TrashIcon } from './icons';

interface Props {
  file: FileItem;
  onClose: () => void;
  onDownload: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onToggleVisibility: () => void;
}

function fileEmoji(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎞️';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
  return '📁';
}

export function FileDetailDrawer({
  file,
  onClose,
  onDownload,
  onTrash,
  onRestore,
  onPermanentDelete,
  onToggleVisibility,
}: Props) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="drawer-icon">{fileEmoji(file.mimeType)}</div>
        <h2>{file.originalName}</h2>

        <div className="drawer-field">
          <span className="label">Size</span>
          <span className="value">{formatBytes(file.size)}</span>
        </div>
        <div className="drawer-field">
          <span className="label">Type</span>
          <span className="value">{file.mimeType || 'unknown'}</span>
        </div>
        <div className="drawer-field">
          <span className="label">Added</span>
          <span className="value">{formatDate(file.createdAt)}</span>
        </div>
        <div className="drawer-field">
          <span className="label">Visibility</span>
          <span className="value">{file.isPublic ? 'Public' : 'Private'}</span>
        </div>
        {file.isPublic && (
          <div className="drawer-field">
            <span className="label">Downloads</span>
            <span className="value">{file.downloadCount}</span>
          </div>
        )}

        <div className="drawer-actions">
          {!file.isTrashed && (
            <button className="btn" onClick={onToggleVisibility}>
              Make {file.isPublic ? 'private' : 'public'}
            </button>
          )}
          {!file.isTrashed ? (
            <>
              <button className="btn btn-primary" onClick={onDownload}>
                <DownloadIcon /> Download
              </button>
              <button className="btn btn-danger" onClick={onTrash}>
                <TrashIcon /> Move to trash
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={onRestore}>
                <RestoreIcon /> Restore
              </button>
              <button className="btn btn-danger" onClick={onPermanentDelete}>
                <TrashIcon /> Delete forever
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
