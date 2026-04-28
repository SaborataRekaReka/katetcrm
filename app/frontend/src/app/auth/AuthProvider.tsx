import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  clearTokens,
  loginRequest,
  persistTokens,
  readStoredAccessToken,
  readStoredRefreshToken,
  refreshRequest,
  meRequest,
} from '../lib/authApi';

interface AuthState {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const useApi = (import.meta.env.VITE_USE_API as string | undefined) === 'true';
  const [user, setUser] = useState<AuthUser | null>(
    useApi
      ? null
      : { id: 'mock-admin', email: 'admin@katet.local', role: 'admin', fullName: 'Mock Admin' },
  );
  const [status, setStatus] = useState<AuthState['status']>(useApi ? 'loading' : 'authenticated');

  useEffect(() => {
    if (!useApi) return;
    let cancelled = false;

    const hydrateSession = async () => {
      const accessToken = readStoredAccessToken();
      const refreshToken = readStoredRefreshToken();

      if (!accessToken && !refreshToken) {
        if (!cancelled) setStatus('anonymous');
        return;
      }

      try {
        if (!accessToken) throw new Error('Missing access token');

        const payload = await meRequest();
        if (cancelled) return;

        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          fullName: payload.email,
        });
        setStatus('authenticated');
      } catch {
        if (!refreshToken) {
          if (!cancelled) {
            clearTokens();
            setUser(null);
            setStatus('anonymous');
          }
          return;
        }

        try {
          const tokens = await refreshRequest(refreshToken);
          if (cancelled) return;

          persistTokens(tokens);
          setUser(tokens.user);
          setStatus('authenticated');
        } catch {
          if (!cancelled) {
            clearTokens();
            setUser(null);
            setStatus('anonymous');
          }
        }
      }
    };

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [useApi]);

  useEffect(() => {
    if (!useApi) return;

    const onAuthChanged = () => {
      if (!readStoredAccessToken()) {
        setUser(null);
        setStatus('anonymous');
      }
    };

    window.addEventListener('katet:auth-changed', onAuthChanged);
    return () => {
      window.removeEventListener('katet:auth-changed', onAuthChanged);
    };
  }, [useApi]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    persistTokens(tokens);
    setUser(tokens.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthState>(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
