import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';
import {
  getLunasQrisBalance,
  createLunasQrisTransaction,
  checkLunasQrisStatus,
  verifyLunasQrisSignature,
} from '../services/lunasQrisService.ts';
import { applyLunasQrisWebhookUpdate } from '../services/transactionManager.ts';
import { isMaskedSecret, requireTenantAuth } from '../middleware/tenantAuth.ts';
import { assertSafeExternalHttpsUrl, UrlSecurityError } from '../utils/urlSecurity.ts';

export const lunasQrisRouter = Router();

// 1. Cek Saldo Merchant LunasQRIS
lunasQrisRouter.get('/balance', requireTenantAuth, async (req: Request, res: Response) => {
  if (req.query.baseurl !== undefined || req.query.baseUrl !== undefined) {
    return res.status(400).json({
      success: false,
      error: 'Override baseurl per-request tidak diizinkan demi keamanan.',
    });
  }

  const rawQueryKey = req.query.apikey as string;
  const queryKey = isMaskedSecret(rawQueryKey) ? '' : rawQueryKey;
  const apiKey = (queryKey || botManager.config.lunasQrisApiKey || '').trim();
  const baseUrl = (botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

  try {
    await assertSafeExternalHttpsUrl(baseUrl);
    const result = await getLunasQrisBalance(apiKey, baseUrl);
    return res.json(result);
  } catch (err: any) {
    const status = err instanceof UrlSecurityError ? err.statusCode : 400;
    return res.status(status).json({ success: false, error: err?.message || 'URL gateway tidak valid.' });
  }
});

// 2. Cek Status Transaksi LunasQRIS
lunasQrisRouter.get('/transaction/status', requireTenantAuth, async (req: Request, res: Response) => {
  if (req.query.baseurl !== undefined || req.query.baseUrl !== undefined) {
    return res.status(400).json({
      success: false,
      error: 'Override baseurl per-request tidak diizinkan demi keamanan.',
    });
  }

  const orderId = (req.query.order_id as string) || undefined;
  const trxId = (req.query.trx_id as string) || undefined;
  const rawQueryKey = req.query.apikey as string;
  const queryKey = isMaskedSecret(rawQueryKey) ? '' : rawQueryKey;
  const apiKey = (queryKey || botManager.config.lunasQrisApiKey || '').trim();
  const baseUrl = (botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

  try {
    await assertSafeExternalHttpsUrl(baseUrl);
    const result = await checkLunasQrisStatus(apiKey, { orderId, trxId }, baseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});

// 3. Webhook / Callback Receiver dari LunasQRIS (Fail-Closed + Anti-Replay + Amount Match)
lunasQrisRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const secretKey = (botManager.config.lunasQrisSecretKey || '').trim();
    if (!secretKey) {
      botManager.addLog('warning', '⚠️ Webhook LunasQRIS ditolak: Secret Key webhook tenant belum dikonfigurasi.');
      return res.status(401).json({ success: false, error: 'Webhook secret key is not configured' });
    }

    const timestamp = (req.headers['x-callback-timestamp'] as string) || '';
    const signature = (req.headers['x-callback-signature'] as string) || '';
    const rawBody = typeof (req as any).rawBody === 'string' ? (req as any).rawBody : '';

    const isValid = verifyLunasQrisSignature(rawBody, timestamp, signature, secretKey);
    if (!isValid) {
      botManager.addLog('warning', '⚠️ Webhook LunasQRIS ditolak: Signature HMAC-SHA256 tidak valid atau timestamp kedaluwarsa.');
      return res.status(401).json({ success: false, error: 'Invalid or expired webhook signature' });
    }

    const payload = req.body || {};
    const event = (req.headers['x-callback-event'] as string) || payload.event || 'unknown';
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    const orderId = typeof data.order_id === 'string' ? data.order_id.trim() : '';
    const trxId = typeof data.trx_id === 'string' ? data.trx_id.trim() : '';

    if (!orderId && !trxId) {
      return res.status(400).json({ success: false, error: 'Missing order_id or trx_id in webhook payload' });
    }

    const normStatus = String(data.status || '').toLowerCase();
    const isPaidEvent = normStatus === 'paid' || normStatus === 'success' || event === 'transaction.paid';
    const isCancelEvent = normStatus === 'cancelled' || normStatus === 'cancel' || normStatus === 'expired';

    if (!isPaidEvent && !isCancelEvent) {
      return res.status(200).json({ success: true, message: 'Webhook event ignored' });
    }

    const result = applyLunasQrisWebhookUpdate({
      orderId,
      trxId,
      targetStatus: isPaidEvent ? 'paid' : 'cancel',
      payloadData: data,
    });

    if (!result.ok) {
      if (result.reason === 'already_processed') {
        return res.status(200).json({ success: true, message: 'Webhook already processed' });
      }
      if (result.reason === 'not_found') {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      if (result.reason === 'amount_mismatch' || result.reason === 'trx_mismatch') {
        botManager.addLog(
          'warning',
          `⚠️ Webhook LunasQRIS ditolak (${result.reason}): Order ${orderId || trxId}`
        );
        return res.status(422).json({ success: false, error: 'Payment amount or transaction reference mismatch' });
      }
      if (result.reason === 'invalid_transition') {
        return res.status(409).json({ success: false, error: 'Invalid transaction status transition' });
      }
      return res.status(500).json({ success: false, error: 'Failed to process webhook update' });
    }

    botManager.addLog(
      'info',
      `📡 Webhook LunasQRIS diproses (${event}): Order ${orderId || trxId} -> ${isPaidEvent ? 'paid' : 'cancel'}`
    );

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. Buat Transaksi Baru
lunasQrisRouter.post('/transaction/create', requireTenantAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body || {};
    if (data.baseUrl !== undefined || data.baseurl !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'Override baseUrl per-request tidak diizinkan demi keamanan.',
      });
    }

    const rawBodyKey = isMaskedSecret(data.apiKey) ? '' : data.apiKey;
    const apiKey = (rawBodyKey || botManager.config.lunasQrisApiKey || '').trim();
    const baseUrl = (botManager.config.lunasQrisBaseUrl || 'https://lunasqris.com').trim();

    await assertSafeExternalHttpsUrl(baseUrl);
    const result = await createLunasQrisTransaction(apiKey, data, baseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message });
  }
});
