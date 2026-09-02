import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UploadProvider } from './context/UploadContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { FilesView } from './components/FilesView';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { SharedFile } from './pages/SharedFile';

function RedirectIfAuthed({ children }: { children: React.ReactElement }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="spinner-page">Loading…</div>;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />
          <Route path="/share/:token" element={<SharedFile />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <UploadProvider>
                  <AppLayout />
                </UploadProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<FilesView view="all" />} />
            <Route path="private" element={<FilesView view="private" />} />
            <Route path="shared" element={<FilesView view="shared" />} />
            <Route path="trash" element={<FilesView view="trash" />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
