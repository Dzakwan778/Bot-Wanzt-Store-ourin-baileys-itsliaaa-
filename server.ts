import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { serverApp } from './backend/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mode Development: Sambungkan Vite dev server middleware ke Express
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    // Mode Production: Sajikan file build statis dari folder frontend/dist atau dist
    const distPath = fs.existsSync(path.resolve(__dirname, 'frontend', 'dist'))
      ? path.resolve(__dirname, 'frontend', 'dist')
      : path.resolve(__dirname, 'dist');

    if (fs.existsSync(distPath)) {
      serverApp.use(express.static(distPath));
      serverApp.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wanzt Store] Server berjalan di http://0.0.0.0:${PORT}`);
    console.log(`[Wanzt Store] Mode: ${isProduction ? 'Production' : 'Development'}`);
  });
}

startServer();
