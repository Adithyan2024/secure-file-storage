import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { uploadFileRequest } from '../api/files';
import { extractErrorMessage } from '../api/axios';
import { formatBytes } from '../utils/format';

const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadEntry {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export function FileUpload({ folderId, onUploaded }: { folderId: string | null; onUploaded: () => void }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach(uploadOne);
  }

  async function uploadOne(file: File) {
    const id = `${file.name}-${Date.now()}-${Math.random()}`;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setEntries((prev) => [
        ...prev,
        { id, name: file.name, progress: 0, error: `Exceeds the ${MAX_FILE_SIZE_MB}MB limit (${formatBytes(file.size)})` },
      ]);
      return;
    }

    setEntries((prev) => [...prev, { id, name: file.name, progress: 0 }]);

    try {
      await uploadFileRequest(file, folderId, (percent) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, progress: percent } : e)));
      });
      // Give the user a moment to see 100% before the row disappears.
      window.setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }, 700);
      onUploaded();
    } catch (err) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, error: extractErrorMessage(err) } : e)));
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        className={`dropzone${isDragActive ? ' active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <div>
          <strong>Click to upload</strong> or drag and drop
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5 }}>Any file type, up to {MAX_FILE_SIZE_MB}MB</div>
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {entries.length > 0 && (
        <div className="upload-progress-list">
          {entries.map((entry) => (
            <div className="upload-progress-row" key={entry.id}>
              <div className="name">
                <span>{entry.name}</span>
                <span>{entry.error ? 'Failed' : `${entry.progress}%`}</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill${entry.error ? ' error' : ''}`}
                  style={{ width: `${entry.error ? 100 : entry.progress}%` }}
                />
              </div>
              {entry.error && (
                <div style={{ marginTop: 6, color: 'var(--danger)', fontSize: 12 }}>{entry.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
