import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getToken,
  setToken,
  clearToken,
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  verifyEmail as apiVerifyEmail,
  getMe,
} from '../services/api';

const AuthContext = createContext(null);

/** מונע קריאת /auth/me עם טוקן שפג או פגום — מקור נפוץ ל-401 בקונסול. */
function isStoredTokenUsable(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getToken();
      if (!token || !isStoredTokenUsable(token)) {
        if (token) clearToken();
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

  // הרשמה רגילה אינה מחברת אוטומטית — המשתמש צריך לאמת את האימייל קודם.
  const register = useCallback(async (payload) => {
    return apiRegister(payload);
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const result = await apiLoginWithGoogle(credential);
    setUser(result.user);
    return result.user;
  }, []);

  // אימות אימייל מהקישור במייל — מחבר את המשתמש אוטומטית אם התקבל טוקן.
  const completeEmailVerification = useCallback(async (token) => {
    const result = await apiVerifyEmail(token);
    if (result?.user) setUser(result.user);
    return result;
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
    loginWithGoogle,
    completeEmailVerification,
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
