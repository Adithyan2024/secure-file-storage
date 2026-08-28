import { apiClient } from './axios';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function registerRequest(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', { email, password, name });
  return res.data;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function meRequest(): Promise<User> {
  const res = await apiClient.get<{ user: User }>('/auth/me');
  return res.data.user;
}

export async function refreshRequest(): Promise<{ accessToken: string }> {
  const res = await apiClient.post<{ accessToken: string }>('/auth/refresh');
  return res.data;
}
