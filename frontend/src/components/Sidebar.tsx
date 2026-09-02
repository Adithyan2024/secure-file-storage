import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUploads } from '../context/UploadContext';
import { extractErrorMessage } from '../api/axios';
import { createFolderRequest } from '../api/folders';
import {
  BrandMark,
  FilesIcon,
  FolderPlusIcon,
  SettingsIcon,
  ShareIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
} from './icons';

const NAV_ITEMS = [
  { to: '/app', label: 'My Files', icon: FilesIcon, exact: true },
  { to: '/app/private', label: 'Private', icon: ShieldIcon, exact: false },
  { to: '/app/shared', label: 'Shared', icon: ShareIcon, exact: false },
  { to: '/app/trash', label: 'Trash', icon: TrashIcon, exact: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { startUpload } = useUploads();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isMyFiles = location.pathname === '/app';
  const currentFolderId = isMyFiles ? searchParams.get('folder') : null;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleFilesSelected(fileList: FileList | null) {
    setMenuOpen(false);
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      startUpload(file, currentFolderId);
    }
    if (!isMyFiles) navigate('/app');
  }

  async function handleNewFolder() {
    setMenuOpen(false);
    const name = window.prompt('Folder name');
    if (!name || !name.trim()) return;
    try {
      await createFolderRequest(name.trim(), currentFolderId);
      window.dispatchEvent(new Event('vault:files-changed'));
      if (!isMyFiles) navigate('/app');
    } catch (err) {
      showToast(extractErrorMessage(err));
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark />
        SecureVault
      </div>

      <div className="new-btn-wrap">
        <button className="new-btn" onClick={() => setMenuOpen((v) => !v)}>
          + New
        </button>
        {menuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 15 }}
              onClick={() => setMenuOpen(false)}
            />
            <div className="new-menu">
              <button onClick={handleNewFolder}>
                <FolderPlusIcon /> New folder
              </button>
              <button onClick={() => fileInputRef.current?.click()}>
                <UploadIcon /> Upload file
              </button>
              <button onClick={() => folderInputRef.current?.click()}>
                <UploadIcon /> Upload folder
              </button>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          hidden
          multiple
          // @ts-expect-error - non-standard attributes for directory upload, supported by Chrome/Edge/Firefox
          webkitdirectory=""
          directory=""
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <Link key={to} to={to} className={`sidebar-nav-item${active ? ' active' : ''}`}>
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-bottom">
        <div className="sidebar-user">{user?.email}</div>
        <Link to="/app/settings" className={`sidebar-nav-item${location.pathname === '/app/settings' ? ' active' : ''}`}>
          <SettingsIcon />
          Settings
        </Link>
        <button className="sidebar-nav-item" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
