import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteFolderRequest, FolderItem, listFoldersRequest } from '../api/folders';
import {
  downloadOwnFile,
  FileItem,
  FileView as ViewName,
  listFilesRequest,
  permanentlyDeleteFileRequest,
  restoreFileRequest,
  setVisibilityRequest,
  trashFileRequest,
} from '../api/files';
import { extractErrorMessage } from '../api/axios';
import { FileCard, FileListRow } from './FileCard';
import { FileDetailDrawer } from './FileDetailDrawer';
import { useToast } from '../context/ToastContext';
import { useUploads } from '../context/UploadContext';
import { EmptyFolderIllustration, FolderIcon, GridIcon, ListIcon } from './icons';

const VIEW_COPY: Record<ViewName, { title: string; subtitle: string }> = {
  all: { title: 'My Files', subtitle: "Everything you've uploaded, organized into folders." },
  private: { title: 'Private', subtitle: 'Only you can access these files.' },
  shared: { title: 'Shared', subtitle: 'Files with an active public share link.' },
  trash: { title: 'Trash', subtitle: 'Deleted files stay here until removed permanently.' },
};

type ViewMode = 'grid' | 'list';

function getViewMode(): ViewMode {
  return (localStorage.getItem('vault:viewMode') as ViewMode) || 'grid';
}

export function FilesView({ view }: { view: ViewName }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = view === 'all' ? searchParams.get('folder') : null;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(getViewMode());
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { showToast } = useToast();
  const { startUpload } = useUploads();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [filesData, foldersData] = await Promise.all([
        listFilesRequest(view, folderId),
        view === 'all' ? listFoldersRequest(folderId) : Promise.resolve([]),
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (err) {
      showToast(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, folderId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (view !== 'all' || !folderId) setFolderPath([]);
  }, [view, folderId]);

  useEffect(() => {
    function handleExternalChange() {
      load();
    }
    window.addEventListener('vault:files-changed', handleExternalChange);
    return () => window.removeEventListener('vault:files-changed', handleExternalChange);
  }, [load]);

  function openFolder(folder: FolderItem) {
    setFolderPath((prev) => [...prev, folder]);
    setSearchParams({ folder: folder.id });
  }

  function goToBreadcrumb(index: number) {
    if (index < 0) {
      setFolderPath([]);
      setSearchParams({});
      return;
    }
    const target = folderPath[index];
    setFolderPath(folderPath.slice(0, index + 1));
    setSearchParams({ folder: target.id });
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!window.confirm(`Delete folder "${folder.name}"? It must be empty.`)) return;
    try {
      await deleteFolderRequest(folder.id);
      load();
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('vault:viewMode', mode);
  }

  async function handleToggleVisibility(file: FileItem) {
    try {
      const updated = await setVisibilityRequest(file.id, !file.isPublic);
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (selectedFile?.id === updated.id) setSelectedFile(updated);
      showToast(updated.isPublic ? 'File is now public' : 'File is now private');
      // If we're viewing a filtered tab (Private/Shared), the toggled file
      // may no longer belong here - refetch so the list stays accurate.
      if (view !== 'all') load();
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handleDownload(file: FileItem) {
    try {
      await downloadOwnFile(file);
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handleTrash(file: FileItem) {
    try {
      await trashFileRequest(file.id);
      setSelectedFile(null);
      load();
      showToast('Moved to trash');
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handleRestore(file: FileItem) {
    try {
      await restoreFileRequest(file.id);
      setSelectedFile(null);
      load();
      showToast('File restored');
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handlePermanentDelete(file: FileItem) {
    if (!window.confirm(`Permanently delete "${file.originalName}"? This can't be undone.`)) return;
    try {
      await permanentlyDeleteFileRequest(file.id);
      setSelectedFile(null);
      load();
      showToast('File permanently deleted');
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  async function handleDeleteAllHere() {
    if (files.length === 0) return;
    if (!window.confirm(`Move all ${files.length} file${files.length === 1 ? '' : 's'} here to trash?`)) return;
    setIsBulkProcessing(true);
    try {
      const results = await Promise.allSettled(files.map((f) => trashFileRequest(f.id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      load();
      showToast(failed > 0 ? `Moved to trash, but ${failed} failed` : 'All files moved to trash');
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleRestoreAll() {
    if (files.length === 0) return;
    if (!window.confirm(`Restore all ${files.length} file${files.length === 1 ? '' : 's'} from trash?`)) return;
    setIsBulkProcessing(true);
    try {
      const results = await Promise.allSettled(files.map((f) => restoreFileRequest(f.id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      load();
      showToast(failed > 0 ? `Restored, but ${failed} failed` : 'All files restored');
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleEmptyTrash() {
    if (files.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete all ${files.length} file${files.length === 1 ? '' : 's'} in trash? This can't be undone.`
      )
    )
      return;
    setIsBulkProcessing(true);
    try {
      const results = await Promise.allSettled(files.map((f) => permanentlyDeleteFileRequest(f.id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      load();
      showToast(failed > 0 ? `Trash emptied, but ${failed} failed` : 'Trash emptied');
    } finally {
      setIsBulkProcessing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragActive(false);
    if (view !== 'all') return;
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;
    for (const file of Array.from(droppedFiles)) {
      startUpload(file, folderId);
    }
  }

  const copy = VIEW_COPY[view];
  const isEmpty = !isLoading && files.length === 0 && folders.length === 0;

  return (
    <div
      onDragOver={(e) => {
        if (view !== 'all') return;
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={isDragActive ? 'drag-active' : ''}
    >
      <div className="content-header">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {view === 'all' && files.length > 0 && (
            <button className="btn" onClick={handleDeleteAllHere} disabled={isBulkProcessing}>
              Delete all
            </button>
          )}
          {view === 'trash' && files.length > 0 && (
            <>
              <button className="btn" onClick={handleRestoreAll} disabled={isBulkProcessing}>
                Recover all
              </button>
              <button className="btn btn-danger" onClick={handleEmptyTrash} disabled={isBulkProcessing}>
                Empty trash
              </button>
            </>
          )}
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => changeViewMode('grid')} title="Grid view">
              <GridIcon />
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => changeViewMode('list')} title="List view">
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {view === 'all' && folderPath.length > 0 && (
        <div className="breadcrumbs">
          <button onClick={() => goToBreadcrumb(-1)}>My Files</button>
          {folderPath.map((f, i) => (
            <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>/</span>
              {i === folderPath.length - 1 ? (
                <span className="current">{f.name}</span>
              ) : (
                <button onClick={() => goToBreadcrumb(i)}>{f.name}</button>
              )}
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="empty-state">Loading…</div>
      ) : isEmpty ? (
        <div className="empty-state-minimal">
          <div className="empty-state-badge">
            <EmptyFolderIllustration />
          </div>
          <h3>
            {view === 'trash'
              ? 'Trash is empty'
              : view === 'all'
                ? 'Nothing here yet'
                : `No ${view} files yet`}
          </h3>
          <p>
            {view === 'all'
              ? "Drag and drop files anywhere, or use + New in the sidebar."
              : view === 'trash'
                ? 'Deleted files will show up here.'
                : 'Files you mark this way will show up here.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="vault-grid">
          {folders.map((folder) => (
            <div key={folder.id} className="vault-box folder-tile" onClick={() => openFolder(folder)}>
              <FolderIcon />
              <div className="folder-tile-name">{folder.name}</div>
              <button
                className="btn btn-ghost"
                style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: 11 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder);
                }}
              >
                Delete
              </button>
            </div>
          ))}
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onOpen={() => setSelectedFile(file)}
              onToggleVisibility={() => handleToggleVisibility(file)}
            />
          ))}
        </div>
      ) : (
        <div className="file-list">
          {folders.map((folder) => (
            <div key={folder.id} className="file-list-row" onClick={() => openFolder(folder)}>
              <div className="file-list-icon">
                <FolderIcon />
              </div>
              <div className="file-list-name">{folder.name}</div>
              <div className="file-list-meta" />
              <div className="file-list-meta" />
            </div>
          ))}
          {files.map((file) => (
            <FileListRow
              key={file.id}
              file={file}
              onOpen={() => setSelectedFile(file)}
              onToggleVisibility={() => handleToggleVisibility(file)}
            />
          ))}
        </div>
      )}

      {selectedFile && (
        <FileDetailDrawer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={() => handleDownload(selectedFile)}
          onTrash={() => handleTrash(selectedFile)}
          onRestore={() => handleRestore(selectedFile)}
          onPermanentDelete={() => handlePermanentDelete(selectedFile)}
          onToggleVisibility={() => handleToggleVisibility(selectedFile)}
        />
      )}
    </div>
  );
}
