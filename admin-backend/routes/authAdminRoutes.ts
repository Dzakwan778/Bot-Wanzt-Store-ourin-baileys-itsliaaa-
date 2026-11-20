import { Router, Request, Response } from 'express';
import { AdminAuthError, AdminAuthService } from '../services/adminAuthService.ts';
import { normalizeClientIp } from '../utils/adminSecurityUtils.ts';

export const authAdminRouter = Router();

authAdminRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    const clientIp = normalizeClientIp(req.ip, req.socket?.remoteAddress);
    const result = AdminAuthService.login(username, password, clientIp);

    return res.json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt,
      admin: result.admin,
    });
  } catch (err: any) {
    const statusCode = err instanceof AdminAuthError ? err.statusCode : 401;
    return res.status(statusCode).json({
      success: false,
      message: err?.message || 'Login gagal.',
      remainingSeconds: err instanceof AdminAuthError ? err.remainingSeconds : undefined,
      lockedUntil: err instanceof AdminAuthError ? err.lockedUntil : undefined,
    });
  }
});

authAdminRouter.post('/logout', (req: Request, res: Response) => {
  try {
    AdminAuthService.logout(req.headers.authorization);
    return res.json({ success: true, message: 'Berhasil keluar dari sesi Master Admin.' });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal logout.',
    });
  }
});

authAdminRouter.get('/me', (req: Request, res: Response) => {
  const session = AdminAuthService.verifySession(req.headers.authorization);

  if (session.valid && session.admin) {
    return res.json({
      success: true,
      authenticated: true,
      admin: session.admin,
      expiresAt: session.expiresAt,
    });
  }

  return res.status(401).json({
    success: false,
    authenticated: false,
    message: 'Sesi tidak valid atau telah berakhir.',
  });
});

authAdminRouter.post('/change-password', (req: Request, res: Response) => {
  const session = AdminAuthService.verifySession(req.headers.authorization);
  if (!session.valid || !session.admin) {
    return res.status(401).json({
      success: false,
      message: 'Sesi Master Admin tidak valid atau telah berakhir. Silakan login kembali.',
    });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    AdminAuthService.changePassword(
      session.admin.id,
      String(currentPassword || ''),
      String(newPassword || ''),
      String(confirmPassword || ''),
      session.token
    );

    return res.json({
      success: true,
      message: 'Password Master Admin berhasil diperbarui.',
    });
  } catch (err: any) {
    const statusCode = err instanceof AdminAuthError ? err.statusCode : 400;
    return res.status(statusCode).json({
      success: false,
      message: err?.message || 'Gagal mengubah password.',
    });
  }
});
