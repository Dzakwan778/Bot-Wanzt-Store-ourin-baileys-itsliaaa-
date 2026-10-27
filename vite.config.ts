import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

import { botManager } from './server/botManager.ts';
import {
  getLunasQrisBalance,
  createLunasQrisTransaction,
  checkLunasQrisStatus,
  verifyLunasQrisSignature,
} from './server/services/lunasQrisService.ts';
import {
  getAllTransactions,
  getTransactionSummary,
  updateTransactionStatus,
  deleteTransaction,
} from './server/services/transactionManager.ts';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'bot-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/media')) {
              if (req.method === 'GET' && req.url === '/api/media/pictures') {
                res.setHeader('Content-Type', 'application/json');
                const dir = path.join(process.cwd(), 'src', 'media', 'picture');
                let pictures: string[] = [];
                try {
                  if (fs.existsSync(dir)) {
                    pictures = fs.readdirSync(dir).filter(f => {
                      const ext = path.extname(f).toLowerCase();
                      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
                    });
                  }
                } catch {}
                res.end(JSON.stringify({ pictures }));
                return;
              }

              if (req.method === 'GET' && req.url.startsWith('/api/media/view')) {
                const urlObj = new URL(req.url, 'http://localhost');
                const filename = urlObj.searchParams.get('name');
                if (filename) {
                  const safeName = path.basename(filename);
                  const filePath = path.join(process.cwd(), 'src', 'media', 'picture', safeName);
                  if (fs.existsSync(filePath)) {
                    const ext = path.extname(filePath).toLowerCase();
                    const mimeMap: Record<string, string> = {
                      '.jpg': 'image/jpeg',
                      '.jpeg': 'image/jpeg',
                      '.png': 'image/png',
                      '.webp': 'image/webp',
                      '.gif': 'image/gif'
                    };
                    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
                    res.end(fs.readFileSync(filePath));
                    return;
                  }
                }
                res.statusCode = 404;
                res.end('Not found');
                return;
              }
            }

            if (req.url?.startsWith('/api/xaviera/profile')) {
              res.setHeader('Content-Type', 'application/json');
              const apiKey = botManager.config.xavieraApiKey?.trim();
              const baseUrl = (botManager.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

              if (!apiKey) {
                res.end(JSON.stringify({
                  configured: false,
                  message: 'API Key belum diisi di tab06'
                }));
                return;
              }

              try {
                // Fetch profile/me from Xaviera API with Bearer token
                const response = await fetch(`${baseUrl}/me`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                if (!response.ok) {
                  res.end(JSON.stringify({
                    configured: true,
                    success: false,
                    status: response.status,
                    error: data.error || 'Gagal memverifikasi API Key'
                  }));
                  return;
                }

                res.end(JSON.stringify({
                  configured: true,
                  success: true,
                  data: data
                }));
              } catch (err: any) {
                res.end(JSON.stringify({
                  configured: true,
                  success: false,
                  error: err?.message || 'Gagal terhubung ke server Xaviera'
                }));
              }
              return;
            }

            if (req.url?.startsWith('/api/xaviera/products')) {
              res.setHeader('Content-Type', 'application/json');
              const apiKey = botManager.config.xavieraApiKey?.trim();
              const baseUrl = (botManager.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

              if (!apiKey) {
                res.end(JSON.stringify({
                  configured: false,
                  message: 'API Key belum diisi di tab Connection'
                }));
                return;
              }

              try {
                const response = await fetch(`${baseUrl}/products`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                if (!response.ok) {
                  res.end(JSON.stringify({
                    configured: true,
                    success: false,
                    status: response.status,
                    error: data.error || 'Gagal memuat produk dari Xaviera API'
                  }));
                  return;
                }

                res.end(JSON.stringify({
                  configured: true,
                  success: true,
                  data: data
                }));
              } catch (err: any) {
                res.end(JSON.stringify({
                  configured: true,
                  success: false,
                  error: err?.message || 'Gagal terhubung ke server Xaviera'
                }));
              }
              return;
            }

            if (req.url?.startsWith('/api/xaviera/smm')) {
              res.setHeader('Content-Type', 'application/json');
              const apiKey = botManager.config.xavieraApiKey?.trim();
              const baseUrl = (botManager.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

              if (!apiKey) {
                res.end(JSON.stringify({
                  configured: false,
                  message: 'API Key belum diisi di tab Connection'
                }));
                return;
              }

              try {
                const response = await fetch(`${baseUrl}/smm/services`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                if (!response.ok) {
                  res.end(JSON.stringify({
                    configured: true,
                    success: false,
                    status: response.status,
                    error: data.error || 'Gagal memuat layanan SMM dari Xaviera API'
                  }));
                  return;
                }

                res.end(JSON.stringify({
                  configured: true,
                  success: true,
                  data: data
                }));
              } catch (err: any) {
                res.end(JSON.stringify({
                  configured: true,
                  success: false,
                  error: err?.message || 'Gagal terhubung ke server Xaviera'
                }));
              }
              return;
            }

            if (req.url?.startsWith('/api/xaviera/games')) {
              res.setHeader('Content-Type', 'application/json');
              const apiKey = botManager.config.xavieraApiKey?.trim();
              const baseUrl = (botManager.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

              if (!apiKey) {
                res.end(JSON.stringify({
                  configured: false,
                  message: 'API Key belum diisi di tab Connection'
                }));
                return;
              }

              try {
                const response = await fetch(`${baseUrl}/games`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                  }
                });

                const data = await response.json();
                if (!response.ok) {
                  res.end(JSON.stringify({
                    configured: true,
                    success: false,
                    status: response.status,
                    error: data.error || 'Gagal memuat game dari Xaviera API'
                  }));
                  return;
                }

                res.end(JSON.stringify({
                  configured: true,
                  success: true,
                  data: data
                }));
              } catch (err: any) {
                res.end(JSON.stringify({
                  configured: true,
                  success: false,
                  error: err?.message || 'Gagal terhubung ke server Xaviera'
                }));
              }
              return;
            }

            if (req.url?.startsWith('/api/lunasqris')) {
              res.setHeader('Content-Type', 'application/json');

              // 1. Cek Saldo Merchant LunasQRIS
              if (req.method === 'GET' && req.url.startsWith('/api/lunasqris/balance')) {
                const urlObj = new URL(req.url, 'http://localhost');
                const queryKey = urlObj.searchParams.get('apikey');
                const queryBase = urlObj.searchParams.get('baseurl');
                const apiKey = (queryKey || botManager.config.lunasQrisApiKey || '').trim();
                const baseUrl = (queryBase || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

                const result = await getLunasQrisBalance(apiKey, baseUrl);
                res.end(JSON.stringify(result));
                return;
              }

              // 2. Cek Status Transaksi LunasQRIS
              if (req.method === 'GET' && req.url.startsWith('/api/lunasqris/transaction/status')) {
                const urlObj = new URL(req.url, 'http://localhost');
                const orderId = urlObj.searchParams.get('order_id') || undefined;
                const trxId = urlObj.searchParams.get('trx_id') || undefined;
                const apiKey = (urlObj.searchParams.get('apikey') || botManager.config.lunasQrisApiKey || '').trim();
                const baseUrl = (urlObj.searchParams.get('baseurl') || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

                try {
                  const result = await checkLunasQrisStatus(apiKey, { orderId, trxId }, baseUrl);
                  res.end(JSON.stringify(result));
                } catch (err: any) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: err?.message }));
                }
                return;
              }

              // 3. Webhook / Callback Receiver dari LunasQRIS
              if (req.method === 'POST' && req.url.startsWith('/api/lunasqris/webhook')) {
                let rawBody = '';
                req.on('data', (chunk) => { rawBody += chunk; });
                req.on('end', async () => {
                  try {
                    const secretKey = (botManager.config.lunasQrisSecretKey || '').trim();
                    const timestamp = (req.headers['x-callback-timestamp'] as string) || '';
                    const signature = (req.headers['x-callback-signature'] as string) || '';

                    // Jika secret key terpasang, verifikasi tanda tangan HMAC-SHA256
                    if (secretKey) {
                      const isValid = verifyLunasQrisSignature(rawBody, timestamp, signature, secretKey);
                      if (!isValid) {
                        botManager.addLog('warning', '⚠️ Webhook LunasQRIS ditolak: Signature HMAC-SHA256 tidak valid.');
                        res.statusCode = 401;
                        res.end(JSON.stringify({ success: false, error: 'Invalid webhook signature' }));
                        return;
                      }
                    }

                    const payload = rawBody ? JSON.parse(rawBody) : {};
                    const event = (req.headers['x-callback-event'] as string) || payload.event || 'unknown';
                    const data = payload.data || {};

                    botManager.addLog(
                      'info',
                      `📡 Webhook LunasQRIS diterima (${event}): Order ${data.order_id || data.trx_id} (Status: ${data.status || 'unknown'})`
                    );

                    // Update status transaksi di database lokal jika webhook mengonfirmasi
                    if (data.order_id || data.trx_id) {
                      const normStatus = (data.status || '').toLowerCase();
                      if (normStatus === 'paid' || normStatus === 'success' || event === 'transaction.paid') {
                        updateTransactionStatus(data.order_id || data.trx_id, 'paid');
                      } else if (normStatus === 'cancelled' || normStatus === 'cancel' || normStatus === 'expired') {
                        updateTransactionStatus(data.order_id || data.trx_id, 'cancel');
                      }
                    }

                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, message: 'Webhook processed' }));
                  } catch (err: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: err?.message }));
                  }
                });
                return;
              }

              // 4. Buat Transaksi Baru
              if (req.method === 'POST' && req.url.startsWith('/api/lunasqris/transaction/create')) {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const data = body ? JSON.parse(body) : {};
                    const apiKey = (data.apiKey || botManager.config.lunasQrisApiKey || '').trim();
                    const baseUrl = (data.baseUrl || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

                    const result = await createLunasQrisTransaction(apiKey, data, baseUrl);
                    res.end(JSON.stringify(result));
                  } catch (err: any) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: err?.message }));
                  }
                });
                return;
              }
            }

            // Route API Manajemen Riwayat Transaksi (Tab Transaksi)
            if (req.url?.startsWith('/api/transactions')) {
              res.setHeader('Content-Type', 'application/json');

              // 1. Ambil seluruh data transaksi & ringkasan
              if (req.method === 'GET' && req.url === '/api/transactions') {
                const transactions = getAllTransactions();
                const summary = getTransactionSummary();
                res.end(JSON.stringify({ success: true, transactions, summary }));
                return;
              }

              // 2. Sinkronisasi status transaksi pending via API LunasQRIS
              if (req.method === 'POST' && req.url === '/api/transactions/sync') {
                const apiKey = (botManager.config.lunasQrisApiKey || '').trim();
                const baseUrl = (botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();
                const all = getAllTransactions();
                const pendingList = all.filter((t) => t.status === 'pending');

                let updatedCount = 0;
                if (apiKey && pendingList.length > 0) {
                  for (const trx of pendingList) {
                    try {
                      const resStatus = await checkLunasQrisStatus(
                        apiKey,
                        { orderId: trx.orderId, trxId: trx.trxId },
                        baseUrl
                      );
                      const remoteStatus = resStatus.data?.status;
                      if (remoteStatus === 'paid') {
                        updateTransactionStatus(trx.orderId, 'paid');
                        updatedCount++;
                      } else if (remoteStatus === 'expired' || remoteStatus === 'cancelled') {
                        updateTransactionStatus(trx.orderId, 'cancel');
                        updatedCount++;
                      }
                    } catch {}
                  }
                }

                res.end(
                  JSON.stringify({
                    success: true,
                    updatedCount,
                    transactions: getAllTransactions(),
                    summary: getTransactionSummary(),
                  })
                );
                return;
              }

              // 3. Hapus transaksi
              if (req.method === 'DELETE' && req.url.startsWith('/api/transactions')) {
                const urlObj = new URL(req.url, 'http://localhost');
                const id = urlObj.searchParams.get('id') || urlObj.searchParams.get('order_id') || '';
                const success = deleteTransaction(id);
                res.end(
                  JSON.stringify({
                    success,
                    transactions: getAllTransactions(),
                    summary: getTransactionSummary(),
                  })
                );
                return;
              }
            }

            if (!req.url?.startsWith('/api/bot')) {
              return next();
            }

            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'GET' && req.url === '/api/bot/status') {
              res.end(JSON.stringify(botManager.getStatus()));
              return;
            }

            if (req.method === 'GET' && req.url === '/api/bot/groups') {
              const result = await botManager.getParticipatingGroups();
              res.end(JSON.stringify(result));
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const data = body ? JSON.parse(body) : {};

                  if (req.url === '/api/bot/start') {
                    const result = await botManager.start(data.phoneNumber, data.customCode);
                    res.end(JSON.stringify(result));
                    return;
                  }

                  if (req.url === '/api/bot/stop') {
                    await botManager.stop();
                    res.end(JSON.stringify({ success: true, status: botManager.getStatus() }));
                    return;
                  }

                  if (req.url === '/api/bot/reset') {
                    await botManager.reset();
                    res.end(JSON.stringify({ success: true, status: botManager.getStatus() }));
                    return;
                  }

                  if (req.url === '/api/bot/save-config') {
                    botManager.saveConfig(data);
                    res.end(JSON.stringify({ success: true, config: botManager.config }));
                    return;
                  }

                  if (req.url === '/api/bot/groups/toggle') {
                    const { groupId, enabled } = data;
                    if (!groupId) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ error: 'groupId diperlukan' }));
                      return;
                    }
                    const updatedToggles = botManager.setGroupToggle(groupId, Boolean(enabled));
                    res.end(JSON.stringify({ success: true, groupId, enabled: Boolean(enabled), toggles: updatedToggles }));
                    return;
                  }

                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err?.message || 'Terjadi kesalahan server' }));
                }
              });
              return;
            }

            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
