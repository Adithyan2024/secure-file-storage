import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/axios';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Create your vault</h1>
          <p className="subtitle">Sign up to start storing and sharing files securely.</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="field-hint">At least 8 characters, including a number.</div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
