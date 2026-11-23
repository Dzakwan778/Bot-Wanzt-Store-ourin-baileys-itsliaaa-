import { Router, Request, Response, NextFunction } from 'express';
import { authAdminRouter } from './authAdminRoutes.ts';
import { statsRouter } from './statsRoutes.ts';
import { tenantRouter } from './tenantRoutes.ts';
import { messageRouter } from './messageRoutes.ts';
import { impersonateRouter } from './impersonateRoutes.ts';
import { templateRouter } from './templateRoutes.ts';
import { expiryRouter } from './expiryRoutes.ts';
import { telegramAdminRouter } from './telegramAdminRoutes.ts';
import { tokenRouter } from './tokenRoutes.ts';
import { partnerAdminRouter } from './partnerAdminRoutes.ts';
import { masterSettingsRouter } from './masterSettingsRoutes.ts';
import { broadcastRouter } from './broadcastRoutes.ts';
import { reportAdminRouter } from './reportAdminRoutes.ts';
import {
  AdminAuthService,
  impersonationTokens,
} from '../services/adminAuthService.ts';

export const adminRouter = Router();

// Re-export untuk backward compatibility
export { impersonationTokens };

export function requireMasterAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = AdminAuthService.verifySession(req.headers.authorization);
  if (!session.valid || !session.admin) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Silakan login terlebih dahulu sebagai Master Admin.',
    });
  }

  (req as any).masterAdmin = session.admin;
  (req as any).masterAdminSessionToken = session.token;
  next();
}

// Rute autentikasi Master Admin (login, logout, me, change-password)
adminRouter.use('/auth', authAdminRouter);

// Proteksi wajib untuk seluruh endpoint manajemen Master Admin di bawah /api/admin/*
adminRouter.use(requireMasterAdminAuth);

// Mount modular sub-routers (seluruhnya terproteksi sesi Master Admin)
adminRouter.use('/', statsRouter);
adminRouter.use('/', tenantRouter);
adminRouter.use('/', messageRouter);
adminRouter.use('/', impersonateRouter);
adminRouter.use('/', templateRouter);
adminRouter.use('/', expiryRouter);
adminRouter.use('/', tokenRouter);
adminRouter.use('/', partnerAdminRouter);
adminRouter.use('/', masterSettingsRouter);
adminRouter.use('/', broadcastRouter);
adminRouter.use('/', reportAdminRouter);
adminRouter.use('/telegram', telegramAdminRouter);
