import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.ts';
import { botRouter } from './routes/botRoutes.ts';
import { xavieraRouter } from './routes/xavieraRoutes.ts';
import { lunasQrisRouter } from './routes/lunasQrisRoutes.ts';
import { transactionRouter } from './routes/transactionRoutes.ts';
import { mediaRouter } from './routes/mediaRoutes.ts';
import { pricingRouter } from './routes/pricingRoutes.ts';
import { promoRouter } from './routes/promoRoutes.ts';
import { apartmentRouter } from './routes/apartmentRoutes.ts';
import { tenantTemplateRouter } from './routes/tenantTemplateRoutes.ts';
import { tenantTokenRouter } from './routes/tenantTokenRoutes.ts';
import { telegramRouter } from './routes/telegramRoutes.ts';
import { adminRouter } from '../admin-backend/routes/adminRoutes.ts';
import { partnerPublicRouter } from '../admin-backend/routes/partnerPublicRoutes.ts';
import { initMasterDatabase } from '../admin-backend/database/masterSqlite.ts';
import { initTenantDb } from './database/tenantDbManager.ts';
import { initDatabase } from './database/sqlite.ts';

import { tenantContextStorage } from './database/tenantContext.ts';
import {
  requireTenantAuth,
  resolveAuthenticatedTenant,
  tenantExistsInMaster,
} from './middleware/tenantAuth.ts';

import { seedDefaultMedia } from './services/mediaManager.ts';

export function createServerApp(): Express {
  // Pastikan database SQLite dan media siap
  initDatabase();
  initMasterDatabase();
  initTenantDb('t_wanzt');
  try {
    seedDefaultMedia();
  } catch (err) {
    console.error('[Media Seed Error]:', err);
  }

  const app = express();

  // Middleware CORS & Body Parser (limit 25mb untuk upload gambar base64)
  app.use(cors());
  app.use(
    express.json({
      limit: '25mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        // Simpan rawBody untuk verifikasi signature HMAC-SHA256 LunasQRIS
        (req as any).rawBody = buf.toString('utf-8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount Partner REST API Publik sebelum middleware identifikasi sesi tenant
  app.use('/api/v1/partner', partnerPublicRouter);

  // Middleware Identifikasi Tenant (Strict Session-Only Isolation)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const session = resolveAuthenticatedTenant(req);
    if (session) {
      try {
        initTenantDb(session.tenantId);
      } catch (dbErr) {
        console.error(`[Tenant DB Error] Inisialisasi ${session.tenantId} gagal:`, dbErr);
      }
      (req as any).authSession = session;
      (req as any).tenantId = session.tenantId;
      tenantContextStorage.run({ tenantId: session.tenantId, username: session.username }, () => next());
      return;
    }

    // Khusus webhook callback pembayaran, izinkan ?tenant=<id> hanya jika tenant terdaftar di master.db
    let fallbackTenantId = 't_wanzt';
    if (req.path === '/api/lunasqris/webhook') {
      const candidateTenant = typeof req.query.tenant === 'string' ? req.query.tenant.trim() : '';
      if (candidateTenant && tenantExistsInMaster(candidateTenant)) {
        fallbackTenantId = candidateTenant;
        try {
          initTenantDb(fallbackTenantId);
        } catch {}
      }
    }

    tenantContextStorage.run({ tenantId: fallbackTenantId, username: 'anonymous' }, () => next());
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'bot-wanzt-backend', timestamp: new Date().toISOString() });
  });

  // Mount API Routers (seluruh router operasional tenant wajib melewati requireTenantAuth)
  app.use('/api/auth', authRouter);
  app.use('/api/bot', requireTenantAuth, botRouter);
  app.use('/api/bot', requireTenantAuth, tenantTemplateRouter);
  app.use('/api/bot', requireTenantAuth, tenantTokenRouter);
  app.use('/api/bot/telegram', requireTenantAuth, telegramRouter);
  app.use('/api/pricing', requireTenantAuth, pricingRouter);
  app.use('/api/promos', requireTenantAuth, promoRouter);
  app.use('/api/xaviera', requireTenantAuth, xavieraRouter);
  app.use('/api/lunasqris', lunasQrisRouter);
  app.use('/api/transactions', requireTenantAuth, transactionRouter);
  app.use('/api/media', requireTenantAuth, mediaRouter);
  app.use('/api/apartment', apartmentRouter);
  app.use('/api/admin', adminRouter);

  return app;
}

export const serverApp = createServerApp();
