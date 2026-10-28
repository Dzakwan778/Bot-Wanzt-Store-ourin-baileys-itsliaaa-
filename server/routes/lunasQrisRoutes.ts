import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';
import {
  getLunasQrisBalance,
  createLunasQrisTransaction,
  checkLunasQrisStatus,
  verifyLunasQrisSignature,
} from '../services/lunasQrisService.ts';
import { updateTransactionStatus } from '../services/transactionManager.ts';

export const lunasQrisRouter = Router();

// 1. Cek Saldo Merchant LunasQRIS
lunasQrisRouter.get('/balance', async (req: Request, res: Response) => {
  const queryKey = req.query.apikey as string;
  const queryBase = req.query.baseurl as string;
  const apiKey = (queryKey || botManager.config.lunasQrisApiKey || '').trim();
  const baseUrl = (queryBase || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

  const result = await getLunasQrisBalance(apiKey, baseUrl);
  return res.json(result);
});

// 2. Cek Status Transaksi LunasQRIS
lunasQrisRouter.get('/transaction/status', async (req: Request, res: Response) => {
  const orderId = (req.query.order_id as string) || undefined;
  const trxId = (req.query.trx_id as string) || undefined;
  const apiKey = ((req.query.apikey as string) || botManager.config.lunasQrisApiKey || '').trim();
  const baseUrl = ((req.query.baseurl as string) || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

  try {
    const result = await checkLunasQrisStatus(apiKey, { orderId, trxId }, baseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

// 3. Webhook / Callback Receiver dari LunasQRIS
lunasQrisRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const secretKey = (botManager.config.lunasQrisSecretKey || '').trim();
    const timestamp = (req.headers['x-callback-timestamp'] as string) || '';
    const signature = (req.headers['x-callback-signature'] as string) || '';

    // Ambil raw string body untuk validasi HMAC-SHA256
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (secretKey) {
      const isValid = verifyLunasQrisSignature(rawBody, timestamp, signature, secretKey);
      if (!isValid) {
        botManager.addLog('warning', '⚠️ Webhook LunasQRIS ditolak: Signature HMAC-SHA256 tidak valid.');
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }
    }

    const payload = req.body || {};
    const event = (req.headers['x-callback-event'] as string) || payload.event || 'unknown';
    const data = payload.data || {};

    botManager.addLog(
      'info',
      `📡 Webhook LunasQRIS diterima (${event}): Order ${data.order_id || data.trx_id} (Status: ${data.status || 'unknown'})`
    );

    // Update status transaksi di database lokal
    if (data.order_id || data.trx_id) {
      const normStatus = (data.status || '').toLowerCase();
      if (normStatus === 'paid' || normStatus === 'success' || event === 'transaction.paid') {
        updateTransactionStatus(data.order_id || data.trx_id, 'paid');
      } else if (normStatus === 'cancelled' || normStatus === 'cancel' || normStatus === 'expired') {
        updateTransactionStatus(data.order_id || data.trx_id, 'cancel');
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. Buat Transaksi Baru
lunasQrisRouter.post('/transaction/create', async (req: Request, res: Response) => {
  try {
    const data = req.body || {};
    const apiKey = (data.apiKey || botManager.config.lunasQrisApiKey || '').trim();
    const baseUrl = (data.baseUrl || botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

    const result = await createLunasQrisTransaction(apiKey, data, baseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});
