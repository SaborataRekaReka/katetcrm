import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  clearTokens,
  loginRequest,
  persistTokens,
  readStoredAccessToken,
} from '../lib/authApi';
import { meRequest } from '../lib/authApi';

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
    const token = readStoredAccessToken();
    if (!token) {
      setStatus('anonymous');
      return;
    }
    // пробуем валидировать токен через /auth/me
    meRequest()
      .then((payload) => {
        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          fullName: payload.email,
        });
        setStatus('authenticated');
      })
      .catch(() => {
        clearTokens();
        setStatus('anonymous');
      });
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
