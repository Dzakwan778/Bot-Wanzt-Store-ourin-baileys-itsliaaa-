import { Request, Response, NextFunction } from 'express';
import { getSession } from '../services/authManager.ts';
import { impersonationTokens } from '../../admin-backend/services/adminAuthService.ts';
import { getMasterDb } from '../../admin-backend/database/masterSqlite.ts';
import { tenantContextStorage } from '../database/tenantContext.ts';
import { initTenantDb } from '../database/tenantDbManager.ts';

export interface AuthenticatedTenantSession {
  token: string;
  tenantId: string;
  username: string;
  isImpersonation: boolean;
}

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const rawVal = pair.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

/**
 * Ekstrak token sesi tenant hanya dari header Authorization Bearer atau cookie auth_token.
 * Tidak pernah menerima token atau tenant override dari URL query string maupun header X-Tenant-Id.
 */
export function extractTenantTokenFromReq(req: Request): string {
  const authHeader = req.headers?.authorization || '';
  if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (bearer) return bearer;
  }

  const reqCookies = (req as any).cookies;
  if (reqCookies && typeof reqCookies.auth_token === 'string' && reqCookies.auth_token.trim()) {
    return reqCookies.auth_token.trim();
  }

  const parsedCookies = parseCookieHeader(req.headers?.cookie);
  if (parsedCookies.auth_token && parsedCookies.auth_token.trim()) {
    return parsedCookies.auth_token.trim();
  }

  return '';
}

export function tenantExistsInMaster(tenantId: string): boolean {
  const cleanId = (tenantId || '').trim();
  if (!cleanId) return false;
  if (cleanId === 't_wanzt') return true;
  try {
    const masterDb = getMasterDb();
    const row = masterDb.prepare('SELECT 1 FROM tenants WHERE tenant_id = ?').get(cleanId);
    return Boolean(row);
  } catch {
    return false;
  }
}

export function resolveAuthenticatedTenant(req: Request): AuthenticatedTenantSession | null {
  const token = extractTenantTokenFromReq(req);
  if (!token) return null;

  // 1. Cek sesi impersonasi Master Admin
  if (impersonationTokens.has(token)) {
    const imp = impersonationTokens.get(token);
    if (imp && Date.now() < imp.expiresAt) {
      if (!tenantExistsInMaster(imp.tenantId)) {
        return null;
      }
      let username = `Tenant-${imp.tenantId}`;
      try {
        const masterDb = getMasterDb();
        const row = masterDb
          .prepare('SELECT username FROM tenants WHERE tenant_id = ?')
          .get(imp.tenantId) as { username?: string } | undefined;
        if (row?.username) {
          username = row.username;
        }
      } catch {}
      return {
        token,
        tenantId: imp.tenantId,
        username,
        isImpersonation: true,
      };
    } else if (imp) {
      impersonationTokens.delete(token);
    }
  }

  // 2. Cek sesi login reguler
  const session = getSession(token);
  if (!session || !session.tenantId) {
    return null;
  }

  if (!tenantExistsInMaster(session.tenantId)) {
    return null;
  }

  return {
    token,
    tenantId: session.tenantId,
    username: session.username,
    isImpersonation: false,
  };
}

export function requireTenantAuth(req: Request, res: Response, next: NextFunction): void {
  const session = resolveAuthenticatedTenant(req);
  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Akses ditolak. Sesi login tidak valid atau telah berakhir. Silakan login kembali.',
    });
    return;
  }

  try {
    initTenantDb(session.tenantId);
  } catch (err) {
    console.error(`[Tenant Auth] Gagal membuka DB tenant ${session.tenantId}:`, err);
    res.status(500).json({
      success: false,
      error: 'Gagal menginisialisasi konteks database tenant.',
    });
    return;
  }

  (req as any).authSession = session;
  (req as any).tenantId = session.tenantId;
  tenantContextStorage.run({ tenantId: session.tenantId, username: session.username }, () => next());
}

const MASK_MARKER = '••••';

export function maskSecret(secret?: string): string {
  const trimmed = typeof secret === 'string' ? secret.trim() : '';
  if (!trimmed) return '';
  if (trimmed.length <= 8) return MASK_MARKER + MASK_MARKER;
  return `${trimmed.slice(0, 4)}${MASK_MARKER}${trimmed.slice(-4)}`;
}

export function isMaskedSecret(value?: unknown): boolean {
  return typeof value === 'string' && value.includes(MASK_MARKER);
}

export function sanitizeBotStatusResponse(rawStatus: any): any {
  if (!rawStatus || typeof rawStatus !== 'object') return rawStatus;
  const cfg = rawStatus.config && typeof rawStatus.config === 'object' ? rawStatus.config : null;
  if (!cfg) return rawStatus;

  const hasXavieraApiKey = Boolean(cfg.xavieraApiKey && String(cfg.xavieraApiKey).trim());
  const hasLunasQrisApiKey = Boolean(cfg.lunasQrisApiKey && String(cfg.lunasQrisApiKey).trim());
  const hasLunasQrisSecretKey = Boolean(cfg.lunasQrisSecretKey && String(cfg.lunasQrisSecretKey).trim());

  return {
    ...rawStatus,
    config: {
      ...cfg,
      xavieraApiKey: maskSecret(cfg.xavieraApiKey),
      lunasQrisApiKey: maskSecret(cfg.lunasQrisApiKey),
      lunasQrisSecretKey: maskSecret(cfg.lunasQrisSecretKey),
      hasXavieraApiKey,
      hasLunasQrisApiKey,
      hasLunasQrisSecretKey,
    },
  };
}

export function sanitizeTelegramConfigResponse(cfg: any): any {
  if (!cfg || typeof cfg !== 'object') return cfg;
  const hasBotToken = Boolean(cfg.botToken && String(cfg.botToken).trim());
  return {
    ...cfg,
    botToken: maskSecret(cfg.botToken),
    hasBotToken,
  };
}
