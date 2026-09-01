import { FileItem } from '../api/files';
import { formatBytes, formatDate } from '../utils/format';
import { LockIcon, UnlockIcon } from './icons';

function fileEmoji(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎞️';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
  return '📁';
}

interface CardProps {
  file: FileItem;
  onOpen: () => void;
  onToggleVisibility: () => void;
}

export function FileCard({ file, onOpen, onToggleVisibility }: CardProps) {
  return (
    <div className="vault-box" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="vault-box-top">
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>{fileEmoji(file.mimeType)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="vault-box-name">{file.originalName}</div>
            <div className="vault-box-meta">
              {formatBytes(file.size)} · {formatDate(file.createdAt)}
            </div>
          </div>
        </div>
        <button
          className={`lock-toggle${file.isPublic ? ' is-public' : ''}`}
          style={{ flexShrink: 0, flexDirection: 'column', alignItems: 'center', gap: 3 }}
          title={file.isPublic ? 'Public — click to make private' : 'Private — click to make public'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          <span className="lock-dial">{file.isPublic ? <UnlockIcon /> : <LockIcon />}</span>
        </button>
      </div>
    </div>
  );
}

export function FileListRow({ file, onOpen, onToggleVisibility }: CardProps) {
  return (
    <div className="file-list-row" onClick={onOpen}>
      <div className="file-list-icon">{fileEmoji(file.mimeType)}</div>
      <div className="file-list-name">{file.originalName}</div>
      <button
        className={`lock-toggle file-list-badge${file.isPublic ? ' is-public' : ''}`}
        title={file.isPublic ? 'Public — click to make private' : 'Private — click to make public'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
      >
        <span className="lock-dial" style={{ width: 28, height: 28 }}>
          {file.isPublic ? <UnlockIcon /> : <LockIcon />}
        </span>
      </button>
      <div className="file-list-meta">{formatBytes(file.size)}</div>
      <div className="file-list-meta">{formatDate(file.createdAt)}</div>
    </div>
  );
}
