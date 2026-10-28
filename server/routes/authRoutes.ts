import { Router, Request, Response } from 'express';
import {
  initAuth,
  verifyLogin,
  createSession,
  validateSession,
  revokeSession,
} from '../services/authManager.ts';
import { saveStoreInfo, loadStoreInfo } from '../config/configManager.ts';
import { botManager } from '../botManager.ts';

export const authRouter = Router();

// Inisialisasi akun default admin jika belum ada
initAuth();

// 1. Verifikasi Login (POST /api/auth/login)
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    const isValid = verifyLogin(username, password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }
    const token = createSession(username);
    return res.json({ success: true, token, user: { username } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 2. Cek Validitas Sesi (GET /api/auth/session)
authRouter.get('/session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || (req.query.token as string) || '';
  const isValid = validateSession(token);
  return res.json({ authenticated: isValid, user: isValid ? { username: 'admin' } : null });
});

// 3. Logout Sesi (POST /api/auth/logout)
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  revokeSession(token);
  return res.json({ success: true });
});

// 4. Cek Kelengkapan Data Store Info Wajib (GET /api/auth/store-status)
authRouter.get('/store-status', (_req: Request, res: Response) => {
  const currentInfo = loadStoreInfo();
  const isComplete = Boolean(
    currentInfo.storeName && currentInfo.storeName.trim() &&
    currentInfo.ownerName && currentInfo.ownerName.trim() &&
    currentInfo.ownerNumber && currentInfo.ownerNumber.trim()
  );
  return res.json({ complete: isComplete, storeInfo: currentInfo });
});

// 5. Setup Wajib Data Store Info (POST /api/auth/store-setup)
authRouter.post('/store-setup', (req: Request, res: Response) => {
  try {
    const { storeName, ownerName, ownerNumber } = req.body || {};
    if (!storeName?.trim() || !ownerName?.trim() || !ownerNumber?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nama Toko, Nama Owner, dan Nomer Owner wajib diisi!',
      });
    }

    const cleanOwnerNumber = ownerNumber.trim().replace(/[^0-9]/g, '');
    const updated = saveStoreInfo({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      ownerNumber: cleanOwnerNumber,
    });

    botManager.saveConfig({
      ...botManager.config,
      storeInfo: updated,
    });

    return res.json({ success: true, storeInfo: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});
