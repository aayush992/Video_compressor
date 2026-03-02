/**
 * auth.ts – Authentication API helpers + JWT localStorage utilities.
 */
import axios from 'axios';
import type { AuthResponse, RegisterRequest, LoginRequest, GoogleLoginRequest, User, Job } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

const authClient = axios.create({ baseURL: API_BASE });

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'authToken';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  authClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  delete authClient.defaults.headers.common['Authorization'];
}

/** Rehydrate token from localStorage on page load */
export function initAuthToken(): void {
  const token = getStoredToken();
  if (token) {
    authClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

export async function registerUser(req: RegisterRequest): Promise<AuthResponse> {
  const res = await authClient.post<AuthResponse>('/auth/register', req);
  return res.data;
}

export async function loginUser(req: LoginRequest): Promise<AuthResponse> {
  const res = await authClient.post<AuthResponse>('/auth/login', req);
  return res.data;
}

export async function loginWithGoogle(req: GoogleLoginRequest): Promise<AuthResponse> {
  const res = await authClient.post<AuthResponse>('/auth/google', req);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await authClient.get<User>('/auth/me');
  return res.data;
}

export async function getHistory(): Promise<Job[]> {
  const res = await authClient.get<Job[]>('/history');
  return res.data;
}

/** Build a ZIP download URL for given filenames (POST) */
export async function downloadZip(filenames: string[]): Promise<Blob> {
  const res = await authClient.post('/download/zip', { filenames }, { responseType: 'blob' });
  return res.data;
}
