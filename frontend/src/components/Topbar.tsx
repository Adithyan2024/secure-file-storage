import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from './icons';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        SecureVault
      </div>
      {user && (
        <div className="topbar-right">
          <span>{user.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
