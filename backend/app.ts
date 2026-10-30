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
import { initDatabase } from './database/sqlite.ts';

export function createServerApp(): Express {
  // Pastikan database SQLite siap
  initDatabase();

  const app = express();

  // Middleware CORS & Body Parser
  app.use(cors());
  app.use(
    express.json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        // Simpan rawBody untuk verifikasi signature HMAC-SHA256 LunasQRIS
        (req as any).rawBody = buf.toString('utf-8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'bot-wanzt-backend', timestamp: new Date().toISOString() });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/bot', botRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/promos', promoRouter);
  app.use('/api/xaviera', xavieraRouter);
  app.use('/api/lunasqris', lunasQrisRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/media', mediaRouter);

  return app;
}

export const serverApp = createServerApp();
