import { Router, Request, Response } from 'express';
import { TenantManager } from '../services/tenantManager.ts';
import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';
import crypto from 'crypto';

export const adminRouter = Router();

// In-memory token sederhana untuk sesi Master Admin & Impersonation
export const activeAdminTokens = new Set<string>();
export const impersonationTokens = new Map<string, { tenantId: string; expiresAt: number }>();

// 1. Auth Super Admin
adminRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const db = getMasterDb();
    const admin = db.prepare('SELECT * FROM super_admins WHERE username = ?').get(username) as any;

    if (!admin || admin.password_hash !== hashPassword(password)) {
      return res.status(401).json({ success: false, message: 'Kredensial Super Admin tidak valid' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

adminRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token && activeAdminTokens.has(token)) {
    return res.json({ success: true, authenticated: true });
  }
  return res.status(401).json({ success: false, authenticated: false });
});

// 2. Statistik Global
adminRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = TenantManager.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Daftar Seluruh Tenant
adminRouter.get('/tenants', (_req: Request, res: Response) => {
  try {
    const tenants = TenantManager.getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Buat Tenant Baru
adminRouter.post('/tenants', (req: Request, res: Response) => {
  try {
    const { store_name, owner_name, owner_phone, username, password, package_name, duration_days, max_groups, notes } = req.body;
    if (!store_name || !owner_name || !owner_phone || !username) {
      return res.status(400).json({ success: false, message: 'Nama toko, pemilik, nomor WA, dan username wajib diisi' });
    }

    const newTenant = TenantManager.createTenant({
      store_name,
      owner_name,
      owner_phone,
      username,
      password,
      package_name,
      duration_days: parseInt(duration_days || '30', 10),
      max_groups: parseInt(max_groups || '10', 10),
      notes,
    });

    res.json({ success: true, message: 'Unit tenant berhasil dibuat', data: newTenant });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Perpanjang Durasi Sewa Tenant
adminRouter.post('/tenants/:id/extend', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { days, note } = req.body;
    const daysToAdd = parseInt(days, 10);

    if (isNaN(daysToAdd) || daysToAdd <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah hari harus berupa angka positif' });
    }

    const updated = TenantManager.extendDuration(tenantId, daysToAdd, note);
    res.json({ success: true, message: `Masa sewa berhasil diperpanjang +${daysToAdd} hari`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Ubah Status Tenant (Suspend / Aktif)
adminRouter.post('/tenants/:id/status', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { status } = req.body;

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const updated = TenantManager.setStatus(tenantId, status);
    res.json({ success: true, message: `Status tenant diubah menjadi ${status}`, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Hapus Tenant
adminRouter.delete('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    TenantManager.deleteTenant(tenantId);
    res.json({ success: true, message: `Tenant ${tenantId} berhasil dihapus permanen` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Impersonasi (Masuk Langsung ke Dashboard Tenant)
adminRouter.post('/tenants/:id/impersonate', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const tenant = TenantManager.getTenant(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });

    const impToken = crypto.randomBytes(24).toString('hex');
    impersonationTokens.set(impToken, {
      tenantId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
    });

    res.json({
      success: true,
      token: impToken,
      redirectUrl: `/?impersonate=${impToken}&tenant=${tenantId}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
