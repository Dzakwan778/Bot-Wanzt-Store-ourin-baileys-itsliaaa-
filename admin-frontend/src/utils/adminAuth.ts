export const ADMIN_TOKEN_STORAGE_KEY = 'wanzt_master_admin_token';

export interface MasterAdminProfile {
  id: number;
  username: string;
  name: string;
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    // Abaikan error penyimpanan jika browser membatasi localStorage
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // Abaikan error penyimpanan
  }
}

export function onAdminUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  clearAdminToken();
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // Abaikan error listener
    }
  }
}

function resolveRequestPathname(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    if (input.startsWith('/')) return input;
    try {
      const parsed = new URL(input, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname;
      }
    } catch {
      return '';
    }
    return '';
  }

  if (input instanceof URL) {
    return input.origin === window.location.origin ? input.pathname : '';
  }

  try {
    const parsed = new URL(input.url, window.location.origin);
    return parsed.origin === window.location.origin ? parsed.pathname : '';
  } catch {
    return '';
  }
}

export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const pathname = resolveRequestPathname(input);
  const isLoginEndpoint = pathname === '/api/admin/auth/login';
  const isMeEndpoint = pathname === '/api/admin/auth/me';

  if (isLoginEndpoint) {
    return window.fetch(input, init);
  }

  const token = getAdminToken();
  const mergedHeaders = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );

  if (token && !mergedHeaders.has('Authorization')) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  const nextInit: RequestInit = {
    ...init,
    headers: mergedHeaders,
  };

  const response = await window.fetch(input, nextInit);

  if (response.status === 401 && !isMeEndpoint) {
    notifyUnauthorized();
  }

  return response;
}
