import { useUploads } from '../context/UploadContext';

export function UploadTray() {
  const { uploads, cancelUpload, dismissUpload } = useUploads();

  if (uploads.length === 0) return null;

  return (
    <div className="upload-tray">
      <div className="upload-tray-header">
        Uploading {uploads.filter((u) => u.status === 'uploading').length || uploads.length} item
        {uploads.length === 1 ? '' : 's'}
      </div>
      <div className="upload-tray-list">
        {uploads.map((task) => (
          <div className="upload-tray-row" key={task.id}>
            <div className="upload-tray-row-top">
              <span className="upload-tray-name">{task.name}</span>
              {task.status === 'uploading' && (
                <button className="upload-tray-cancel" onClick={() => cancelUpload(task.id)} title="Cancel upload">
                  ✕
                </button>
              )}
              {(task.status === 'error' || task.status === 'canceled') && (
                <button className="upload-tray-cancel" onClick={() => dismissUpload(task.id)} title="Dismiss">
                  ✕
                </button>
              )}
              {task.status === 'done' && <span className="upload-tray-check">✓</span>}
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill${task.status === 'error' ? ' error' : ''}`}
                style={{
                  width: task.status === 'canceled' ? '100%' : `${task.progress}%`,
                  background: task.status === 'canceled' ? 'var(--text-faint)' : undefined,
                }}
              />
            </div>
            {task.status === 'error' && <div className="upload-tray-error">{task.error}</div>}
            {task.status === 'canceled' && <div className="upload-tray-error">Canceled</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
