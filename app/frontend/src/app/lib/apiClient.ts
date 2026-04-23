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

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(path.replace(/^\//, ''), BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
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
    if (res.status === 401) throw new AuthError(body);
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}
