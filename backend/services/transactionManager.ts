import { db } from '../database/sqlite.ts';
import { getActiveTenantId } from '../database/tenantContext.ts';
import { notifyTransactionPaid, notifyTransactionFailed } from './telegramService.ts';

export interface TransactionRecord {
  id: string;
  orderId: string;
  trxId?: string;
  customerNumber: string;
  customerName: string;
  productName: string;
  variantName: string;
  nominal: number;
  uniqueCode: number;
  total: number;
  status: 'pending' | 'paid' | 'cancel';
  paymentUrl?: string;
  promoId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  cancelCount: number;
  totalRevenue: number;
}

interface DbTransactionRow {
  id: string;
  order_id: string;
  trx_id: string | null;
  customer_number: string;
  customer_name: string | null;
  product_name: string;
  variant_name: string;
  nominal: number;
  unique_code: number;
  total: number;
  status: string;
  payment_url: string | null;
  promo_id: number | null;
  created_at: string;
  updated_at: string;
}

function sanitizeHttpsPaymentUrl(rawUrl?: string | null): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function mapRowToRecord(row: DbTransactionRow): TransactionRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    trxId: row.trx_id || '',
    customerNumber: row.customer_number,
    customerName: row.customer_name || `Pelanggan-${row.customer_number.slice(-4)}`,
    productName: row.product_name,
    variantName: row.variant_name,
    nominal: Number(row.nominal),
    uniqueCode: Number(row.unique_code),
    total: Number(row.total),
    status: (row.status as any) || 'pending',
    paymentUrl: sanitizeHttpsPaymentUrl(row.payment_url),
    promoId: row.promo_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Membaca seluruh data transaksi dari SQLite database
 */
export function getAllTransactions(): TransactionRecord[] {
  try {
    const rows = db.prepare(`
      SELECT * FROM transactions
      ORDER BY created_at DESC
    `).all() as DbTransactionRow[];

    return rows.map(mapRowToRecord);
  } catch (err) {
    console.error('Gagal membaca transaksi dari SQLite:', err);
    return [];
  }
}

/**
 * Mendaftarkan transaksi baru dengan status 'pending' ke SQLite
 */
export function recordTransaction(data: {
  orderId: string;
  trxId?: string;
  customerNumber: string;
  customerName?: string;
  productName: string;
  variantName: string;
  nominal: number;
  uniqueCode: number;
  total: number;
  paymentUrl?: string;
  promoId?: number | null;
  status?: 'pending' | 'paid' | 'cancel';
}): TransactionRecord {
  const now = new Date().toISOString();
  const cleanNumber = data.customerNumber.replace(/[^0-9]/g, '');
  const id = `TRX-${data.orderId}`;
  const status = data.status || 'pending';
  const promoId = data.promoId ? Number(data.promoId) : null;
  const customerName = data.customerName || `Pelanggan-${cleanNumber.slice(-4)}`;
  const safePaymentUrl = sanitizeHttpsPaymentUrl(data.paymentUrl);

  try {
    const existing = db.prepare(`
      SELECT * FROM transactions
      WHERE order_id = ? OR (trx_id != '' AND trx_id = ?)
    `).get(data.orderId, data.trxId || '') as DbTransactionRow | undefined;

    if (existing) {
      db.prepare(`
        UPDATE transactions
        SET trx_id = ?,
            customer_number = ?,
            customer_name = ?,
            product_name = ?,
            variant_name = ?,
            nominal = ?,
            unique_code = ?,
            total = ?,
            status = ?,
            payment_url = ?,
            promo_id = COALESCE(?, promo_id),
            updated_at = ?
        WHERE id = ?
      `).run(
        data.trxId || existing.trx_id || '',
        cleanNumber,
        customerName,
        data.productName,
        data.variantName,
        Math.round(data.nominal),
        Math.round(data.uniqueCode),
        Math.round(data.total),
        status,
        safePaymentUrl || sanitizeHttpsPaymentUrl(existing.payment_url),
        promoId,
        now,
        existing.id
      );

      return {
        id: existing.id,
        orderId: existing.order_id,
        trxId: data.trxId || existing.trx_id || '',
        customerNumber: cleanNumber,
        customerName,
        productName: data.productName,
        variantName: data.variantName,
        nominal: Math.round(data.nominal),
        uniqueCode: Math.round(data.uniqueCode),
        total: Math.round(data.total),
        status,
        paymentUrl: safePaymentUrl || sanitizeHttpsPaymentUrl(existing.payment_url),
        promoId: promoId ?? existing.promo_id ?? null,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    } else {
      db.prepare(`
        INSERT INTO transactions (
          id, order_id, trx_id, customer_number, customer_name,
          product_name, variant_name, nominal, unique_code, total,
          status, payment_url, promo_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.orderId,
        data.trxId || '',
        cleanNumber,
        customerName,
        data.productName,
        data.variantName,
        Math.round(data.nominal),
        Math.round(data.uniqueCode),
        Math.round(data.total),
        status,
        safePaymentUrl,
        promoId,
        now,
        now
      );

      return {
        id,
        orderId: data.orderId,
        trxId: data.trxId || '',
        customerNumber: cleanNumber,
        customerName,
        productName: data.productName,
        variantName: data.variantName,
        nominal: Math.round(data.nominal),
        uniqueCode: Math.round(data.uniqueCode),
        total: Math.round(data.total),
        status,
        paymentUrl: safePaymentUrl,
        promoId,
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch (err) {
    console.error('Gagal menyimpan transaksi ke SQLite:', err);
    return {
      id,
      orderId: data.orderId,
      trxId: data.trxId || '',
      customerNumber: cleanNumber,
      customerName,
      productName: data.productName,
      variantName: data.variantName,
      nominal: Math.round(data.nominal),
      uniqueCode: Math.round(data.uniqueCode),
      total: Math.round(data.total),
      status,
      paymentUrl: safePaymentUrl,
      promoId,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function triggerTransactionStatusNotification(existing: DbTransactionRow, newStatus: 'paid' | 'cancel'): void {
  try {
    const tenantId = getActiveTenantId() || 't_wanzt';
    let storeName = 'Toko Anda';
    try {
      const storeRow = db.prepare('SELECT store_name FROM store_info WHERE id = 1').get() as any;
      if (storeRow?.store_name) storeName = storeRow.store_name;
    } catch {}

    if (newStatus === 'paid') {
      notifyTransactionPaid(tenantId, {
        orderId: existing.order_id,
        productName: existing.product_name,
        variantName: existing.variant_name,
        totalPrice: existing.total,
        buyerNumber: existing.customer_number,
        storeName,
      }).catch((err) => console.error('[TelegramNotif] Error kirim paid:', err));
    } else if (newStatus === 'cancel') {
      notifyTransactionFailed(tenantId, {
        orderId: existing.order_id,
        productName: existing.product_name,
        variantName: existing.variant_name,
        totalPrice: existing.total,
        reason: 'Batas waktu pembayaran habis / dibatalkan',
        storeName,
      }).catch((err) => console.error('[TelegramNotif] Error kirim failed:', err));
    }
  } catch (notifErr) {
    console.error('[TelegramNotif] Error trigger:', notifErr);
  }
}

/**
 * Memperbarui status transaksi secara atomik hanya dari 'pending' ke 'paid' atau 'cancel'.
 * Mengembalikan record baru jika transisi berhasil, atau null jika tidak ditemukan / sudah final.
 */
export function updateTransactionStatus(
  identifier: string,
  newStatus: 'pending' | 'paid' | 'cancel'
): TransactionRecord | null {
  if (!identifier) return null;
  if (newStatus === 'pending') return null;

  const now = new Date().toISOString();

  try {
    const transitionResult = db.transaction(() => {
      const existing = db.prepare(`
        SELECT * FROM transactions
        WHERE order_id = ? OR trx_id = ? OR id = ?
      `).get(identifier, identifier, identifier) as DbTransactionRow | undefined;

      if (!existing || existing.status !== 'pending') {
        return null;
      }

      const updateRes = db.prepare(`
        UPDATE transactions
        SET status = ?, updated_at = ?
        WHERE id = ? AND status = 'pending'
      `).run(newStatus, now, existing.id);

      if (updateRes.changes !== 1) {
        return null;
      }

      if (newStatus === 'cancel' && existing.promo_id) {
        db.prepare(`
          UPDATE promo_codes
          SET used_count = MAX(0, used_count - 1), updated_at = ?
          WHERE id = ? AND used_count > 0
        `).run(now, existing.promo_id);
      }

      return existing;
    })();

    if (!transitionResult) return null;

    triggerTransactionStatusNotification(transitionResult, newStatus);

    return {
      ...mapRowToRecord(transitionResult),
      status: newStatus,
      updatedAt: now,
    };
  } catch (err) {
    console.error('Gagal memperbarui status transaksi di SQLite:', err);
    return null;
  }
}

export interface WebhookTransitionResult {
  ok: boolean;
  reason?:
    | 'not_found'
    | 'already_processed'
    | 'invalid_transition'
    | 'amount_mismatch'
    | 'trx_mismatch'
    | 'db_error';
  transaction?: TransactionRecord;
}

function resolveWebhookPaidAmount(
  payloadData: Record<string, any>,
  existing: DbTransactionRow
): number | null {
  if (!payloadData || typeof payloadData !== 'object') return null;

  const parseFinite = (val: unknown): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : null;
  };

  const totalAmount = parseFinite(payloadData.total_amount);
  if (totalAmount !== null) {
    return totalAmount;
  }

  const paidAmount = parseFinite(payloadData.paid_amount);
  if (paidAmount !== null) {
    return paidAmount;
  }

  const baseAmount = parseFinite(payloadData.amount);
  if (baseAmount !== null) {
    const uniqueCode = parseFinite(payloadData.unique_code);
    if (
      uniqueCode !== null &&
      existing.unique_code > 0 &&
      uniqueCode === existing.unique_code
    ) {
      return baseAmount + uniqueCode;
    }
    return baseAmount;
  }

  return null;
}

/**
 * Memproses pembaruan status dari webhook LunasQRIS secara atomik dan terverifikasi:
 * - Memastikan order/trx ada dan konsisten
 * - Hanya mengizinkan transisi dari status 'pending'
 * - Memverifikasi nominal bayar webhook >= total tagihan SQLite saat status 'paid'
 */
export function applyLunasQrisWebhookUpdate(params: {
  orderId?: string;
  trxId?: string;
  targetStatus: 'paid' | 'cancel';
  payloadData?: Record<string, any>;
}): WebhookTransitionResult {
  const cleanOrderId = (params.orderId || '').trim();
  const cleanTrxId = (params.trxId || '').trim();
  if (!cleanOrderId && !cleanTrxId) {
    return { ok: false, reason: 'not_found' };
  }

  const now = new Date().toISOString();

  try {
    let transitionedRow: DbTransactionRow | null = null;

    const outcome: WebhookTransitionResult = db.transaction((): WebhookTransitionResult => {
      let existing: DbTransactionRow | undefined;

      if (cleanOrderId) {
        existing = db
          .prepare('SELECT * FROM transactions WHERE order_id = ?')
          .get(cleanOrderId) as DbTransactionRow | undefined;
      }
      if (!existing && cleanTrxId) {
        existing = db
          .prepare('SELECT * FROM transactions WHERE trx_id = ?')
          .get(cleanTrxId) as DbTransactionRow | undefined;
      }

      if (!existing) {
        return { ok: false, reason: 'not_found' };
      }

      if (cleanTrxId && existing.trx_id && existing.trx_id !== cleanTrxId) {
        return { ok: false, reason: 'trx_mismatch', transaction: mapRowToRecord(existing) };
      }

      if (cleanOrderId && existing.order_id !== cleanOrderId) {
        return { ok: false, reason: 'trx_mismatch', transaction: mapRowToRecord(existing) };
      }

      if (existing.status !== 'pending') {
        if (existing.status === params.targetStatus) {
          return {
            ok: false,
            reason: 'already_processed',
            transaction: mapRowToRecord(existing),
          };
        }
        return {
          ok: false,
          reason: 'invalid_transition',
          transaction: mapRowToRecord(existing),
        };
      }

      if (params.targetStatus === 'paid') {
        const expectedTotal = Number(existing.total);
        const reportedPaid = resolveWebhookPaidAmount(params.payloadData || {}, existing);
        if (
          !Number.isFinite(expectedTotal) ||
          expectedTotal <= 0 ||
          reportedPaid === null ||
          reportedPaid < expectedTotal
        ) {
          return {
            ok: false,
            reason: 'amount_mismatch',
            transaction: mapRowToRecord(existing),
          };
        }
      }

      const res = db
        .prepare(`UPDATE transactions SET status = ?, updated_at = ? WHERE id = ? AND status = 'pending'`)
        .run(params.targetStatus, now, existing.id);

      if (res.changes !== 1) {
        return { ok: false, reason: 'already_processed', transaction: mapRowToRecord(existing) };
      }

      if (params.targetStatus === 'cancel' && existing.promo_id) {
        db.prepare(`
          UPDATE promo_codes
          SET used_count = MAX(0, used_count - 1), updated_at = ?
          WHERE id = ? AND used_count > 0
        `).run(now, existing.promo_id);
      }

      transitionedRow = existing;
      return {
        ok: true,
        transaction: {
          ...mapRowToRecord(existing),
          status: params.targetStatus,
          updatedAt: now,
        },
      };
    })();

    if (outcome.ok && transitionedRow) {
      triggerTransactionStatusNotification(transitionedRow, params.targetStatus);
    }

    return outcome;
  } catch (err) {
    console.error('Gagal memproses webhook transaksi di SQLite:', err);
    return { ok: false, reason: 'db_error' };
  }
}

/**
 * Menghapus transaksi berdasarkan ID atau Order ID dari SQLite
 */
export function deleteTransaction(identifier: string): boolean {
  try {
    const result = db.prepare(`
      DELETE FROM transactions
      WHERE id = ? OR order_id = ?
    `).run(identifier, identifier);

    return result.changes > 0;
  } catch (err) {
    console.error('Gagal menghapus transaksi dari SQLite:', err);
    return false;
  }
}

/**
 * Menghitung ringkasan statistik transaksi via SQL agregasi
 */
export function getTransactionSummary(): TransactionSummary {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) as totalCount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paidCount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pendingCount,
        COALESCE(SUM(CASE WHEN status = 'cancel' THEN 1 ELSE 0 END), 0) as cancelCount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as totalRevenue
      FROM transactions
    `).get() as any;

    return {
      totalCount: Number(row?.totalCount || 0),
      paidCount: Number(row?.paidCount || 0),
      pendingCount: Number(row?.pendingCount || 0),
      cancelCount: Number(row?.cancelCount || 0),
      totalRevenue: Number(row?.totalRevenue || 0),
    };
  } catch (err) {
    console.error('Gagal menghitung ringkasan transaksi dari SQLite:', err);
    return {
      totalCount: 0,
      paidCount: 0,
      pendingCount: 0,
      cancelCount: 0,
      totalRevenue: 0,
    };
  }
}
