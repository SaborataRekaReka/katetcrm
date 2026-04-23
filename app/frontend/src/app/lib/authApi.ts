import { apiRequest, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function loginRequest(email: string, password: string) {
  return apiRequest<AuthTokens>('auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function refreshRequest(refreshToken: string) {
  return apiRequest<AuthTokens>('auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function meRequest() {
  return apiRequest<{ sub: string; email: string; role: 'admin' | 'manager' }>('auth/me');
}

export function persistTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function readStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
