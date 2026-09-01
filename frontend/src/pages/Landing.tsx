import { Link } from 'react-router-dom';
import { BrandMark } from '../components/icons';

export function Landing() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          SecureVault
        </div>
        <div className="topbar-right">
          <Link to="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <div className="landing-hero">
        <h1>
          Store, organize, and share files
          <br />
          <span className="landing-hero-gradient">without compromising on security.</span>
        </h1>
        <p>
          SecureVault gives every file a home — folders to organize, a trash you can recover from, and
          one-click control over what's public and what stays private.
        </p>
        <div className="landing-cta">
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 24px' }}>
            Get started — it's free
          </Link>
          <Link to="/login" className="btn" style={{ fontSize: 15, padding: '12px 24px' }}>
            I already have an account
          </Link>
        </div>

        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">📁</div>
            <h3>Folders &amp; organization</h3>
            <p>Structure your files exactly how you think about them.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🔒</div>
            <h3>Private by default</h3>
            <p>Every upload starts private. Share only what you choose to.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🗑️</div>
            <h3>Recoverable trash</h3>
            <p>Deleted something by accident? Restore it before it's gone for good.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
