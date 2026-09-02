import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { UploadTray } from './UploadTray';

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <UploadTray />
    </div>
  );
}
