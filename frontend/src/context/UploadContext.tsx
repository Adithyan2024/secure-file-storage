import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { uploadFileRequest } from '../api/files';

export interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error' | 'canceled';
  error?: string;
}

interface UploadContextValue {
  uploads: UploadTask[];
  startUpload: (file: File, folderId: string | null) => void;
  cancelUpload: (id: string) => void;
  dismissUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

/** Other parts of the app (e.g. the currently mounted file list) listen for
 * this to know when to refetch, without needing direct prop/context wiring
 * back from wherever an upload happened to be triggered. */
function notifyFilesChanged() {
  window.dispatchEvent(new Event('vault:files-changed'));
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const controllers = useRef<Map<string, AbortController>>(new Map());

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setUploads((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const startUpload = useCallback(
    (file: File, folderId: string | null) => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const controller = new AbortController();
      controllers.current.set(id, controller);

      setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'uploading' }]);

      uploadFileRequest(
        file,
        folderId,
        (percent) => updateTask(id, { progress: percent }),
        controller.signal
      )
        .then(() => {
          updateTask(id, { progress: 100, status: 'done' });
          notifyFilesChanged();
          // Auto-clear successful uploads from the tray after a moment so it
          // doesn't accumulate clutter, but leave errors/cancellations
          // visible until the user dismisses them.
          window.setTimeout(() => {
            setUploads((prev) => prev.filter((t) => t.id !== id));
          }, 2500);
        })
        .catch((err) => {
          const canceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
          if (canceled) {
            updateTask(id, { status: 'canceled' });
          } else {
            const message =
              err?.response?.data?.error?.message || err?.message || 'Upload failed';
            updateTask(id, { status: 'error', error: message });
          }
        })
        .finally(() => {
          controllers.current.delete(id);
        });
    },
    [updateTask]
  );

  const cancelUpload = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const dismissUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startUpload, cancelUpload, dismissUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploads must be used within an UploadProvider');
  return ctx;
}
