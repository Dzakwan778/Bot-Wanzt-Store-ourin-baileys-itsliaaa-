import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Fetch Interceptor untuk Apartemen Multi-Tenancy
// Memastikan setiap pemanggilan /api/* menyertakan Authorization Bearer dan x-tenant-id
try {
  const originalFetch = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : fetch;
  const interceptedFetch: typeof window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
      if (url.startsWith('/api') || url.includes('/api/')) {
        let token: string | null = null;
        let tenantId: string | null = null;
        try {
          token = localStorage.getItem('wanzt_bot_auth_token');
          tenantId = localStorage.getItem('wanzt_tenant_id');
        } catch {
          // Abaikan jika ada batasan akses storage di iframe sandbox
        }

        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));

        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (tenantId && !headers.has('x-tenant-id')) {
          headers.set('x-tenant-id', tenantId);
        }

        return originalFetch(url, {
          ...init,
          headers,
        });
      }
    } catch {
      // Fallback jika parsing headers gagal
    }
    return originalFetch(input, init);
  };

  // Gunakan Object.defineProperty pada window agar tidak melempar TypeError pada getter-only property
  try {
    Object.defineProperty(window, 'fetch', {
      value: interceptedFetch,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    try {
      (window as any).fetch = interceptedFetch;
    } catch {}
  }
} catch (err) {
  console.warn('[Wanzt Store] Fetch interceptor fallback aktif:', err);
}

createRoot(document.getElementById('root')!).render(<App />);
