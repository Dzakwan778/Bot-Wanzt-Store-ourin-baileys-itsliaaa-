import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';
import {
  getAllTransactions,
  getTransactionSummary,
  updateTransactionStatus,
  deleteTransaction,
} from '../services/transactionManager.ts';
import { checkLunasQrisStatus } from '../services/lunasQrisService.ts';

export const transactionRouter = Router();

// 1. Ambil seluruh data transaksi & ringkasan statistik
transactionRouter.get('/', (_req: Request, res: Response) => {
  const transactions = getAllTransactions();
  const summary = getTransactionSummary();
  return res.json({ success: true, transactions, summary });
});

// 2. Sinkronisasi status transaksi pending via API LunasQRIS
transactionRouter.post('/sync', async (_req: Request, res: Response) => {
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

  return res.json({
    success: true,
    updatedCount,
    transactions: getAllTransactions(),
    summary: getTransactionSummary(),
  });
});

// 3. Hapus transaksi
transactionRouter.delete('/', (req: Request, res: Response) => {
  const id = ((req.query.id as string) || (req.query.order_id as string) || '').trim();
  const success = deleteTransaction(id);
  return res.json({
    success,
    transactions: getAllTransactions(),
    summary: getTransactionSummary(),
  });
});
