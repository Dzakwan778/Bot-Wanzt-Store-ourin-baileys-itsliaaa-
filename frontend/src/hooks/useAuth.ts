import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'wanzt_bot_auth_token';

export interface UserSession {
  username: string;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const impToken = params.get('impersonate');
        if (impToken) {
          localStorage.setItem(TOKEN_KEY, impToken);
          window.history.replaceState({}, document.title, window.location.pathname);
          return impToken;
        }
      }
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Verifikasi validitas token sesi ke server
  const checkSession = useCallback(async (tokenToCheck: string | null) => {
    if (!tokenToCheck) {
      setIsAuthenticated(false);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${tokenToCheck}`,
        },
      });

      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user || { username: 'admin' });
        if (data.user?.tenantId) {
          try {
            localStorage.setItem('wanzt_tenant_id', data.user.tenantId);
          } catch {}
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('wanzt_tenant_id');
        } catch {}
      }
    } catch {
      // Jika terjadi gangguan jaringan, anggap tidak terotentikasi demi keamanan
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession(token);
  }, [checkSession, token]);

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
          if (data.user?.tenantId) {
            localStorage.setItem('wanzt_tenant_id', data.user.tenantId);
          }
        } catch {}
        setToken(data.token);
        setUser(data.user || { username: usernameInput.trim() });
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Username atau password salah!',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Gagal terhubung ke server login.',
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {}

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('wanzt_tenant_id');
    } catch {}

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    token,
    user,
    isAuthenticated,
    authLoading,
    login,
    logout,
  };
}
