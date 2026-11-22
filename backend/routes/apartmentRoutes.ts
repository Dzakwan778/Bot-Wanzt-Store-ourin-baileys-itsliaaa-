import { Router, Request, Response, NextFunction } from 'express';
import {
  verifyMasterAdminLogin,
  createMasterAdminSession,
  validateMasterAdminSession,
  revokeMasterAdminSession,
  getAllTenants,
  getTenantById,
  createTenant,
  extendTenantLease,
  setTenantStatus,
  resetTenantPassword,
  deleteTenant,
  getApartmentStats,
} from '../services/apartmentManager.ts';
import { CreateTenantInput, ExtendLeaseInput, TenantStatus } from '../types/apartment.types.ts';

export const apartmentRouter = Router();

/**
 * Middleware untuk memverifikasi token sesi Master Admin
 */
function requireMasterAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-master-token'] as string) || (req.query.token as string);

  if (!token || !validateMasterAdminSession(token)) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Anda harus login sebagai Master Admin (Pengelola Apartemen).',
    });
  }

  next();
}

/**
 * POST /api/apartment/login
 * Otentikasi login Super Admin / Pengelola Apartemen
 */
apartmentRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username dan password wajib diisi.',
      });
    }

    const isValid = verifyMasterAdminLogin(String(username), String(password));
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Kredensial Master Admin tidak valid. Periksa kembali username atau password.',
      });
    }

    const token = createMasterAdminSession(String(username));
    return res.json({
      success: true,
      token,
      username: String(username),
      role: 'superadmin',
      message: 'Login Master Admin berhasil.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan pada server saat login Master Admin.',
    });
  }
});

/**
 * POST /api/apartment/logout
 * Hapus sesi login Master Admin
 */
apartmentRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-master-token'] as string);

  revokeMasterAdminSession(token);
  res.json({ success: true, message: 'Logout Master Admin berhasil.' });
});

/**
 * GET /api/apartment/verify-session
 * Verifikasi apakah sesi Master Admin masih aktif
 */
apartmentRouter.get('/verify-session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-master-token'] as string);

  const isValid = validateMasterAdminSession(token);
  res.json({ valid: isValid });
});

/**
 * GET /api/apartment/stats
 * Ambil ringkasan statistik sewa seluruh unit
 */
apartmentRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getApartmentStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/apartment/tenants
 * Ambil daftar seluruh unit apartemen (publik/terautentikasi)
 */
apartmentRouter.get('/tenants', (_req: Request, res: Response) => {
  try {
    const tenants = getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/apartment/current-lease
 * Ambil data sewa unit saat ini (Unit 101) untuk ditampilkan di banner dashboard toko
 */
apartmentRouter.get('/current-lease', (_req: Request, res: Response) => {
  try {
    // Ambil unit-101 sebagai unit utama toko aktif
    const tenant = getTenantById('unit-101');
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Unit toko utama tidak ditemukan' });
    }
    res.json({ success: true, data: tenant });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/apartment/tenants/:id
 * Ambil rincian satu unit apartemen
 */
apartmentRouter.get('/tenants/:id', (req: Request, res: Response) => {
  try {
    const tenant = getTenantById(String(req.params.id));
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Unit apartemen tidak ditemukan' });
    }
    res.json({ success: true, data: tenant });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/apartment/tenants
 * Tambah unit apartemen penyewa baru (Memerlukan Auth Master Admin)
 */
apartmentRouter.post('/tenants', requireMasterAdminAuth, (req: Request, res: Response) => {
  try {
    const input: CreateTenantInput = req.body;
    if (!input.name || !input.username || !input.password) {
      return res.status(400).json({
        success: false,
        error: 'Nama unit, username, dan password wajib diisi.',
      });
    }

    const created = createTenant(input);
    res.status(201).json({
      success: true,
      message: `Unit "${created.unitNumber}" (${created.name}) berhasil didaftarkan.`,
      data: created,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/apartment/tenants/:id/extend
 * Perpanjang masa sewa unit apartemen (Memerlukan Auth Master Admin)
 */
apartmentRouter.put('/tenants/:id/extend', requireMasterAdminAuth, (req: Request, res: Response) => {
  try {
    const input: ExtendLeaseInput = req.body;
    const updated = extendTenantLease(String(req.params.id), input);
    res.json({
      success: true,
      message: `Masa sewa ${updated.unitNumber} berhasil diperpanjang hingga ${new Date(updated.expiredDate).toLocaleDateString('id-ID')}.`,
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/apartment/tenants/:id/status
 * Ubah status sewa unit apartemen (active / suspended / expired) (Memerlukan Auth Master Admin)
 */
apartmentRouter.put('/tenants/:id/status', requireMasterAdminAuth, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status tidak valid. Pilihan: active, suspended, expired.',
      });
    }

    const updated = setTenantStatus(String(req.params.id), status as TenantStatus);
    res.json({
      success: true,
      message: `Status ${updated.unitNumber} berhasil diubah menjadi "${status}".`,
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/apartment/tenants/:id/reset-password
 * Reset password akun unit penyewa (Memerlukan Auth Master Admin)
 */
apartmentRouter.put('/tenants/:id/reset-password', requireMasterAdminAuth, (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password baru minimal 4 karakter.',
      });
    }

    resetTenantPassword(String(req.params.id), newPassword);
    res.json({
      success: true,
      message: 'Password akun unit apartemen berhasil direset.',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/apartment/tenants/:id
 * Hapus unit apartemen penyewa (Memerlukan Auth Master Admin)
 */
apartmentRouter.delete('/tenants/:id', requireMasterAdminAuth, (req: Request, res: Response) => {
  try {
    deleteTenant(String(req.params.id));
    res.json({
      success: true,
      message: 'Unit apartemen berhasil dihapus dari sistem.',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
