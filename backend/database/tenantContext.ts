import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
  username?: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Mengambil tenant_id dari eksekusi request saat ini.
 * Jika di luar konteks request (misal worker latar belakang), default ke 't_wanzt'.
 */
export function getActiveTenantId(): string {
  const store = tenantContextStorage.getStore();
  return store?.tenantId || 't_wanzt';
}

/**
 * Menjalankan fungsi di dalam konteks tenant tertentu.
 */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return tenantContextStorage.run({ tenantId }, fn);
}
