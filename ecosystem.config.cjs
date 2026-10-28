/**
 * PM2 Ecosystem Configuration File
 * Domain: testbot.wanma2.my.id
 * VPS IP: 139.59.97.50
 * Struktur Direktori: bot-whatsapp/ (terpisah frontend/ & backend/)
 *
 * Cara Menjalankan:
 *   - Menjalankan Backend saja (Port 5000, Frontend disajikan via Nginx):
 *       pm2 start ecosystem.config.cjs --only bot-backend
 *   - Menjalankan Full-Stack (Port 3000):
 *       pm2 start ecosystem.config.cjs --only bot-fullstack
 */

module.exports = {
  apps: [
    // 1. Layanan Backend Murni (WhatsApp Baileys, REST API, Webhook) pada Port 5000
    {
      name: 'bot-backend',
      script: './node_modules/.bin/tsx',
      args: 'backend/server.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0',
        DOMAIN: 'testbot.wanma2.my.id',
      },
    },

    // 2. Alternatif: Layanan Full-Stack (Backend Express + Frontend terintegrasi) pada Port 3000
    {
      name: 'bot-fullstack',
      script: './node_modules/.bin/tsx',
      args: 'server.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        DOMAIN: 'testbot.wanma2.my.id',
      },
    },
  ],
};
