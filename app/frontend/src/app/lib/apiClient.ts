/**
 * Базовый HTTP-клиент для Katet CRM API.
 * — Берёт base URL из VITE_API_BASE_URL (по умолчанию http://localhost:3001/api/v1).
 * — Читает access-токен из localStorage ключа KATET_ACCESS_TOKEN.
 * — Пробрасывает 401 как AuthError, чтобы auth-контекст мог среагировать.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class AuthError extends ApiError {
  constructor(body: unknown) {
    super(401, 'Требуется авторизация', body);
    this.name = 'AuthError';
  }
}

export const ACCESS_TOKEN_KEY = 'KATET_ACCESS_TOKEN';
export const REFRESH_TOKEN_KEY = 'KATET_REFRESH_TOKEN';
const AUTH_CHANGED_EVENT = 'katet:auth-changed';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';
let refreshInFlight: Promise<string | null> | null = null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function resolveBaseUrl() {
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl;

  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(baseUrl.replace(/^\/+/, ''), `${origin}/`).toString();
}

function dispatchAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthChanged();
}

function isAuthBootstrapPath(path: string) {
  const normalized = path.replace(/^\/+/, '');
  return normalized === 'auth/login' || normalized === 'auth/refresh';
}

async function requestTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const refreshUrl = new URL('auth/refresh', resolveBaseUrl()).toString();
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    if (
      typeof body !== 'object'
      || body === null
      || !('accessToken' in body)
      || !('refreshToken' in body)
    ) {
      clearStoredTokens();
      return null;
    }

    const tokens = body as { accessToken: string; refreshToken: string };
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    dispatchAuthChanged();
    return tokens.accessToken;
  } catch {
    return null;
  }
}

function getRefreshedAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = requestTokenRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path.replace(/^\//, ''), resolveBaseUrl());
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const execute = async (accessTokenOverride?: string | null) => {
    const token = accessTokenOverride ?? localStorage.getItem(ACCESS_TOKEN_KEY);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(url.toString(), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  };

  let res = await execute();

  if (res.status === 401 && !isAuthBootstrapPath(path)) {
    const refreshed = await getRefreshedAccessToken();
    if (refreshed) {
      res = await execute(refreshed);
    }
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) throw new AuthError(body);
    const messageFromBody =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : null;
    const message = res.status === 403 ? 'Доступ запрещен (403)' : messageFromBody ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}
