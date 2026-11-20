import { useState, useEffect, useCallback, useRef } from 'react';

const TOKEN_KEY = 'wanzt_bot_auth_token';

export interface UserSession {
  username: string;
  tenantId?: string;
  accountStatus?: 'active' | 'suspended' | 'expired';
  isImpersonation?: boolean;
}

function extractAndClearHashImpersonateCode(): string | null {
  try {
    if (typeof window === 'undefined' || !window.location.hash) return null;
    const rawHash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(rawHash);
    const code = hashParams.get('impersonate_code');
    if (code && code.trim()) {
      hashParams.delete('impersonate_code');
      const remainingHash = hashParams.toString();
      const nextUrl =
        window.location.pathname +
        window.location.search +
        (remainingHash ? `#${remainingHash}` : '');
      window.history.replaceState({}, document.title, nextUrl);
      return code.trim();
    }
  } catch {}
  return null;
}

export function useAuth() {
  const pendingImpCodeRef = useRef<string | null>(extractAndClearHashImpersonateCode());

  const [token, setToken] = useState<string | null>(() => {
    try {
      if (pendingImpCodeRef.current) {
        return null;
      }
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Verifikasi validitas token sesi ke server (atau tukar kode impersonasi sekali pakai via POST)
  const checkSession = useCallback(async (tokenToCheck: string | null) => {
    const pendingCode = pendingImpCodeRef.current;
    if (pendingCode) {
      pendingImpCodeRef.current = null;
      try {
        const exchangeRes = await fetch('/api/auth/impersonate/exchange', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pendingCode }),
        });
        const exchangeData = await exchangeRes.json().catch(() => ({}));
        if (exchangeRes.ok && exchangeData.success && exchangeData.token) {
          const tenantId = exchangeData.user?.tenantId || 't_wanzt';
          const accountStatus = exchangeData.user?.accountStatus || 'active';
          try {
            localStorage.setItem(TOKEN_KEY, exchangeData.token);
            localStorage.setItem('wanzt_tenant_id', tenantId);
          } catch {}
          setToken(exchangeData.token);
          setUser({
            username: exchangeData.user?.username || 'admin',
            tenantId,
            accountStatus,
            isImpersonation: true,
          });
          setIsAuthenticated(true);
          setAuthLoading(false);
          return;
        }
      } catch {}
      setIsAuthenticated(false);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    if (!tokenToCheck) {
      setIsAuthenticated(false);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${tokenToCheck}`,
        },
      });

      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        const tenantId = data.user?.tenantId || 't_wanzt';
        const accountStatus = data.user?.accountStatus || 'active';
        setUser({
          username: data.user?.username || 'admin',
          tenantId,
          accountStatus,
          isImpersonation: Boolean(data.user?.isImpersonation),
        });
        try {
          localStorage.setItem('wanzt_tenant_id', tenantId);
        } catch {}
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

  useEffect(() => {
    const handleHashChange = () => {
      const code = extractAndClearHashImpersonateCode();
      if (code) {
        pendingImpCodeRef.current = code;
        checkSession(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [checkSession]);

  useEffect(() => {
    const handleRevoked = () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('wanzt_tenant_id');
      } catch {}
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('wanzt:session-revoked', handleRevoked);
    return () => window.removeEventListener('wanzt:session-revoked', handleRevoked);
  }, []);

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
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
        const tenantId = data.user?.tenantId || 't_wanzt';
        const accountStatus = data.user?.accountStatus || 'active';
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem('wanzt_tenant_id', tenantId);
        } catch {}
        setToken(data.token);
        setUser({
          username: data.user?.username || usernameInput.trim(),
          tenantId,
          accountStatus,
        });
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
          credentials: 'include',
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

  const updateUsernameState = useCallback((newUsername: string) => {
    setUser((prev) => (prev ? { ...prev, username: newUsername } : null));
  }, []);

  return {
    token,
    user,
    isAuthenticated,
    authLoading,
    login,
    logout,
    updateUsernameState,
  };
}
