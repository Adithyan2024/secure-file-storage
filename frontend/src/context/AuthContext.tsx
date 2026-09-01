import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { googleSignInRequest, loginRequest, logoutRequest, meRequest, registerRequest, User } from '../api/auth';
import { apiClient } from '../api/axios';
import { setAccessToken } from '../api/tokenStore';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Used after a password change, which re-issues a fresh access token. */
  setSessionToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On first load there's no access token in memory (page refresh clears
    // JS state), but the httpOnly refresh cookie may still be valid - try a
    // silent refresh before deciding the user is logged out.
    (async () => {
      try {
        const res = await apiClient.post('/auth/refresh');
        setAccessToken(res.data.accessToken);
        const me = await meRequest();
        setUser(me);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await loginRequest(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function register(email: string, password: string, name: string) {
    const res = await registerRequest(email, password, name);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function loginWithGoogle(idToken: string) {
    const res = await googleSignInRequest(idToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function refreshUser() {
    const me = await meRequest();
    setUser(me);
  }

  function setSessionToken(token: string) {
    setAccessToken(token);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, loginWithGoogle, logout, refreshUser, setSessionToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
