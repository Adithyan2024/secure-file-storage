import { useEffect, useState } from 'react';
import { FileItem, listFilesRequest } from '../api/files';
import { extractErrorMessage } from '../api/axios';
import { FileUpload } from '../components/FileUpload';
import { FileCard } from '../components/FileCard';
import { Topbar } from '../components/Topbar';
import { useToast } from '../context/ToastContext';

export function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  async function loadFiles() {
    try {
      const data = await listFilesRequest();
      setFiles(data);
    } catch (err) {
      showToast(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChanged(updated: FileItem) {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="app-shell">
      <Topbar />
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Your files</h1>
          <p>Upload files, then choose whether each one is public or private.</p>
        </div>

        <FileUpload onUploaded={loadFiles} />

        {isLoading ? (
          <div className="empty-state">Loading your files…</div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <h3>The vault is empty</h3>
            <div>Upload your first file above to get started.</div>
          </div>
        ) : (
          <div className="vault-grid">
            {files.map((file) => (
              <FileCard key={file.id} file={file} onChanged={handleChanged} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
