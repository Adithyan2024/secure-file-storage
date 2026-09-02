import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // sends the httpOnly refresh cookie on same-site requests
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue concurrent requests that hit a 401 while a single refresh is in flight,
// instead of firing multiple parallel refresh calls.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

   const isAuthEndpoint =
  original?.url?.includes('/auth/login') ||
  original?.url?.includes('/auth/register') ||
  original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        setAccessToken(null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.message) return err.message;
  }
  return 'Something went wrong. Please try again.';
}
