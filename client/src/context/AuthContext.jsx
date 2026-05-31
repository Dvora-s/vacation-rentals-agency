import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getToken,
  setToken,
  clearToken,
  login as apiLogin,
  register as apiRegister,
  getMe,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await apiLogin({ email, password });
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await apiRegister(payload);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      logout();
    }
  }, [logout]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOwner: user?.role === 'owner' || user?.role === 'admin',
    login,
    register,
    logout,
    refresh,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
