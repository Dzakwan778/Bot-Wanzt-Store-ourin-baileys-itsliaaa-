import { Router, Request, Response } from 'express';
import {
  initAuth,
  verifyLogin,
  createSession,
  revokeSession,
  updateTenantUsername,
  updateTenantPassword,
} from '../services/authManager.ts';
import { AdminAuthService } from '../../admin-backend/services/adminAuthService.ts';
import { TenantManager } from '../../admin-backend/services/tenantManager.ts';
import { saveStoreInfo, loadStoreInfo } from '../config/configManager.ts';
import { botManager } from '../botManager.ts';
import { toOfficialIndonesianPhone } from '../services/placeholderHelper.ts';
import { MasterAdminContactService } from '../../admin-backend/services/masterAdminContactService.ts';
import { TenantStatusService } from '../../admin-backend/services/tenantStatusService.ts';
import {
  requireTenantAuth,
  resolveAuthenticatedTenant,
  extractTenantTokenFromReq,
  tenantExistsInMaster,
} from '../middleware/tenantAuth.ts';
import { getMasterDb } from '../../admin-backend/database/masterSqlite.ts';

export const authRouter = Router();

// Inisialisasi akun default admin jika belum ada
initAuth();

export function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const xfProto = req.headers?.['x-forwarded-proto'];
  const proto = Array.isArray(xfProto) ? xfProto[0] : xfProto;
  if (typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https') {
    return true;
  }
  return false;
}

export function buildAuthCookieOptions(req: Request, maxAgeMs: number = 7 * 24 * 3600 * 1000) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttpsRequest(req),
    maxAge: maxAgeMs,
  };
}

function buildClearCookieOptions(req: Request) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttpsRequest(req),
  };
}

// 1. Verifikasi Login (POST /api/auth/login)
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    const authResult = verifyLogin(username, password);
    if (!authResult) {
      return res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }
    const resolvedUsername = authResult.username || username;
    const resolvedTenantId = authResult.tenantId || 't_wanzt';
    const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(resolvedTenantId);

    if (accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        suspended: true,
        error: 'Akun toko Anda sedang ditangguhkan (Suspended) oleh Master Admin. Silakan hubungi Master Admin untuk mengaktifkan akun.',
      });
    }

    const token = createSession(resolvedUsername, resolvedTenantId);
    const cookieOpts = buildAuthCookieOptions(req);

    // Set cookie aman (HttpOnly + SameSite=Lax + Secure saat HTTPS)
    res.cookie('tenant_id', resolvedTenantId, cookieOpts);
    res.cookie('auth_token', token, cookieOpts);

    return res.json({
      success: true,
      token,
      user: { username: resolvedUsername, tenantId: resolvedTenantId, accountStatus },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 1b. Penukaran Kode Impersonasi Sekali Pakai via POST (POST /api/auth/impersonate/exchange)
authRouter.post('/impersonate/exchange', async (req: Request, res: Response) => {
  try {
    const { code } = req.body || {};
    const exchange = AdminAuthService.exchangeImpersonationCode(String(code || ''));
    if (exchange.success === false) {
      return res.status(401).json({ success: false, error: exchange.error });
    }

    if (!tenantExistsInMaster(exchange.tenantId)) {
      return res.status(404).json({ success: false, error: 'Tenant tidak ditemukan.' });
    }

    const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(exchange.tenantId);
    if (accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        suspended: true,
        error: 'Akun tenant sedang ditangguhkan (Suspended).',
      });
    }

    let username = `Tenant-${exchange.tenantId}`;
    try {
      const masterDb = getMasterDb();
      const row = masterDb
        .prepare('SELECT username FROM tenants WHERE tenant_id = ?')
        .get(exchange.tenantId) as { username?: string } | undefined;
      if (row?.username) {
        username = row.username;
      }
    } catch {}

    const cookieOpts = buildAuthCookieOptions(req, 30 * 60 * 1000);
    res.cookie('tenant_id', exchange.tenantId, cookieOpts);
    res.cookie('auth_token', exchange.token, cookieOpts);

    return res.json({
      success: true,
      token: exchange.token,
      user: {
        username,
        tenantId: exchange.tenantId,
        accountStatus,
        isImpersonation: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menukar kode impersonasi' });
  }
});

// 2. Cek Validitas Sesi (GET /api/auth/session)
authRouter.get('/session', async (req: Request, res: Response) => {
  const session = resolveAuthenticatedTenant(req);
  if (session) {
    const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(session.tenantId);
    if (accountStatus === 'suspended') {
      res.clearCookie('tenant_id', buildClearCookieOptions(req));
      res.clearCookie('auth_token', buildClearCookieOptions(req));
      return res.json({ authenticated: false, user: null, suspended: true });
    }
    const cookieOpts = buildAuthCookieOptions(req);
    res.cookie('tenant_id', session.tenantId, cookieOpts);
    res.cookie('auth_token', session.token, cookieOpts);
    return res.json({
      authenticated: true,
      user: {
        username: session.username,
        tenantId: session.tenantId,
        accountStatus,
        isImpersonation: session.isImpersonation,
      },
    });
  }

  return res.json({ authenticated: false, user: null });
});

// 3. Logout Sesi (POST /api/auth/logout)
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = extractTenantTokenFromReq(req);
  revokeSession(token);
  const clearOpts = buildClearCookieOptions(req);
  res.clearCookie('tenant_id', clearOpts);
  res.clearCookie('auth_token', clearOpts);
  return res.json({ success: true });
});

// 4. Cek Kelengkapan Data Store Info Wajib (GET /api/auth/store-status)
authRouter.get('/store-status', requireTenantAuth, async (req: Request, res: Response) => {
  const currentInfo = loadStoreInfo();
  const isComplete = Boolean(
    currentInfo.storeName && currentInfo.storeName.trim() &&
    currentInfo.ownerName && currentInfo.ownerName.trim() &&
    currentInfo.ownerNumber && currentInfo.ownerNumber.trim()
  );

  // Ambil status akun tenant aktif secara ketat dari sesi terautentikasi
  const tenantId = (req as any).authSession.tenantId;
  const accountStatus = await TenantStatusService.enforceRealtimeTenantExpiry(tenantId);

  return res.json({ complete: isComplete, storeInfo: currentInfo, accountStatus, tenantId });
});

// 5. Setup Wajib Data Store Info (POST /api/auth/store-setup)
authRouter.post('/store-setup', requireTenantAuth, (req: Request, res: Response) => {
  try {
    const { storeName, ownerName, ownerNumber } = req.body || {};
    if (!storeName?.trim() || !ownerName?.trim() || !ownerNumber?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nama Toko, Nama Owner, dan Nomer Owner wajib diisi!',
      });
    }

    const tenantId = (req as any).authSession.tenantId;
    const officialOwnerNumber = toOfficialIndonesianPhone(ownerNumber);
    const updated = saveStoreInfo({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      ownerNumber: officialOwnerNumber,
    });

    // Sinkronkan ke master.db milik Master Admin
    TenantManager.updateStoreInfo(
      tenantId,
      storeName.trim(),
      ownerName.trim(),
      officialOwnerNumber
    );

    botManager.saveConfig({
      ...botManager.config,
      storeInfo: updated,
    });

    return res.json({ success: true, storeInfo: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Helper untuk mengekstrak identitas tenant & username yang terotentikasi (strict, tanpa fallback)
function getAuthSessionFromReq(req: Request): { username: string; tenantId: string } | null {
  const session = resolveAuthenticatedTenant(req);
  if (!session) return null;
  return { username: session.username, tenantId: session.tenantId };
}

// 6. Ubah Username Tenant Mandiri (POST /api/auth/profile/update-username)
authRouter.post('/profile/update-username', requireTenantAuth, (req: Request, res: Response) => {
  try {
    const session = getAuthSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Sesi login tidak valid. Silakan login kembali.' });
    }

    const { newUsername } = req.body || {};
    const result = updateTenantUsername(session.tenantId, session.username, newUsername);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      username: result.newUsername,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 7. Ubah Password Tenant Mandiri (POST /api/auth/profile/update-password)
authRouter.post('/profile/update-password', requireTenantAuth, (req: Request, res: Response) => {
  try {
    const session = getAuthSessionFromReq(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Sesi login tidak valid. Silakan login kembali.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    // Cabut seluruh sesi lama (termasuk token pemanggil lama) lalu terbitkan token rotasi baru
    const result = updateTenantPassword(
      session.tenantId,
      session.username,
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    const rotatedToken = createSession(session.username, session.tenantId);
    const cookieOpts = buildAuthCookieOptions(req);
    res.cookie('tenant_id', session.tenantId, cookieOpts);
    res.cookie('auth_token', rotatedToken, cookieOpts);

    return res.json({
      success: true,
      message: result.message,
      token: rotatedToken,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 8. Ambil 1 Kontak Master Admin Acak Berbobot untuk Rujukan Tenant (GET /api/auth/master-admin-contact)
authRouter.get('/master-admin-contact', (_req: Request, res: Response) => {
  try {
    const picked = MasterAdminContactService.pickRandomMasterAdmin();
    return res.json({
      success: true,
      admin: {
        id: picked.id,
        name: picked.name,
        phone: picked.phone,
        cleanPhone: picked.cleanPhone,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memuat kontak Master Admin.',
    });
  }
});

