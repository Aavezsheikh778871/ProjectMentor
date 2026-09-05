import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have a token, resolve the current user.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const { user: u } = await authApi.me();
        if (!cancelled) setUser(u);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: u, token } = await authApi.login(credentials);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (body) => {
    const { user: u, token } = await authApi.register(body);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Re-fetch the current user so freshly-updated stats (ideas generated,
  // mentor sessions) show without needing to log out and back in.
  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return null;
    try {
      const { user: u } = await authApi.me();
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const value = { user, setUser, loading, login, register, logout, refreshUser, isAuthed: Boolean(user) };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
