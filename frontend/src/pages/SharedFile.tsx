import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { UnlockIcon } from '../components/icons';
import { formatBytes } from '../utils/format';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface PublicMeta {
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/public/files/${token}`);
        setMeta(res.data);
      } catch {
        setError("This link is invalid, or the owner has made this file private.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const downloadUrl = `${API_BASE_URL}/api/public/files/${token}/download`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">SecureVault</div>
      </header>
      <div className="shared-page">
        <div className="shared-card">
          {isLoading ? (
            <div style={{ color: 'var(--text-faint)' }}>Loading…</div>
          ) : error ? (
            <>
              <h1 style={{ fontFamily: 'var(--font-ui)' }}>Not available</h1>
              <div className="meta">{error}</div>
            </>
          ) : (
            meta && (
              <>
                <div className="lock-dial" style={{ borderColor: 'var(--unlocked-dim)', margin: '0 auto 16px' }}>
                  <UnlockIcon />
                </div>
                <h1>{meta.originalName}</h1>
                <div className="meta">{formatBytes(meta.size)} · shared publicly</div>
                <a className="btn btn-primary" href={downloadUrl} style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Download
                </a>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
