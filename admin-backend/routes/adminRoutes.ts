import { Router, Request, Response } from 'express';
import { TenantManager } from '../services/tenantManager.ts';
import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';
import { getBotManager } from '../../backend/botManager.ts';
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

// 4. Buat Tenant Baru (Mendukung pembuatan otomatis tanpa wajib isi profil toko)
adminRouter.post('/tenants', (req: Request, res: Response) => {
  try {
    const { store_name, owner_name, owner_phone, username, password, duration_days, notes } = req.body || {};

    const newTenant = TenantManager.createTenant({
      store_name: store_name ? String(store_name).trim() : '',
      owner_name: owner_name ? String(owner_name).trim() : '',
      owner_phone: owner_phone ? String(owner_phone).trim() : '',
      username: username ? String(username).trim() : undefined,
      password: password ? String(password).trim() : undefined,
      duration_days: parseInt(duration_days || '365', 10),
      notes: notes ? String(notes).trim() : undefined,
    });

    res.json({
      success: true,
      message: 'Unit tenant berhasil dibuat',
      data: newTenant,
    });
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

// 7. Reset Password Tenant
adminRouter.post('/tenants/:id/reset-password', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { new_password } = req.body;
    const result = TenantManager.resetPassword(tenantId, new_password);
    res.json({
      success: true,
      message: `Password tenant ${tenantId} berhasil diperbarui`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Hapus Tenant
adminRouter.delete('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    TenantManager.deleteTenant(tenantId);
    res.json({ success: true, message: `Tenant ${tenantId} berhasil dihapus permanen` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Impersonasi (Masuk Langsung ke Dashboard Tenant)
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

// 10. Kirim Pesan WhatsApp dari Master Admin ke Owner Tenant
adminRouter.post('/tenants/:id/send-message', async (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Isi pesan tidak boleh kosong' });
    }

    const tenant = TenantManager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Unit tenant tidak ditemukan' });
    }

    if (!tenant.owner_phone || !tenant.owner_phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nomor WhatsApp pemilik (owner) pada unit ini belum diisi oleh tenant',
      });
    }

    const bot = getBotManager(tenantId);
    if (bot.status !== 'connected' || !bot.sock) {
      return res.status(400).json({
        success: false,
        botOffline: true,
        message: `Bot WhatsApp toko ${tenant.store_name || tenantId} sedang Offline. Tidak dapat mengirim pesan otomatis via bot.`,
      });
    }

    await bot.sendTextMessage(tenant.owner_phone, message.trim());

    res.json({
      success: true,
      message: `Pesan resmi Master Admin berhasil dikirim ke nomor WhatsApp owner (${tenant.owner_phone}) via bot toko`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal mengirim pesan' });
  }
});

