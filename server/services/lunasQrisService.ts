import crypto from 'crypto';

/**
 * Service untuk integrasi Payment Gateway LunasQRIS (lunasqris.com)
 * Dokumentasi: https://lunasqris.com/docs
 */

export interface LunasQrisTransactionData {
  trx_id: string;
  order_id?: string;
  amount: number;
  unique_code: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qris_string: string;
  qr_url: string;
  payment_url: string;
  expired_at: string;
  created_at?: string;
}

export interface CreateLunasQrisParams {
  amount: number;
  order_id?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  callback_url?: string;
  return_url?: string;
  expired_minutes?: number;
  metadata?: any;
}

export interface ActiveLunasQrisPollingOrder {
  orderId: string;
  trxId?: string;
  senderJid: string; // JID personal pembeli
  groupJid?: string; // JID grup jika dipicu dari grup
  senderName: string;
  productName: string;
  variantName: string;
  price: number;
  totalAmount: number;
  uniqueCode: number;
  apiKey: string;
  baseUrl: string;
  onPaid: () => Promise<void>;
  onExpired: () => Promise<void>;
}

const DEFAULT_LUNASQRIS_BASE_URL = 'https://lunasqris.com';

/**
 * Cek saldo akun LunasQRIS merchant
 * Endpoint: GET /api/v1/balance
 */
export async function getLunasQrisBalance(
  apiKey: string,
  baseUrl: string = DEFAULT_LUNASQRIS_BASE_URL
): Promise<{ success: boolean; balance: number; balanceHold: number; error?: string }> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    return { success: false, balance: 0, balanceHold: 0, error: 'API Key LunasQRIS belum diisi' };
  }

  const cleanBase = (baseUrl?.trim() || DEFAULT_LUNASQRIS_BASE_URL).replace(/\/+$/, '');
  const url = `${cleanBase}/api/v1/balance`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': cleanKey,
        'Authorization': `Bearer ${cleanKey}`,
      },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return {
        success: false,
        balance: 0,
        balanceHold: 0,
        error: body.error || body.message || `HTTP ${res.status}: Gagal memverifikasi API Key LunasQRIS`,
      };
    }

    const data = body.data || {};
    const bal = typeof data.balance === 'number' ? data.balance : Number(data.balance || 0);
    const balHold = typeof data.balance_hold === 'number' ? data.balance_hold : Number(data.balance_hold || 0);

    return {
      success: true,
      balance: bal,
      balanceHold: balHold,
    };
  } catch (err: any) {
    return {
      success: false,
      balance: 0,
      balanceHold: 0,
      error: err?.message || 'Gagal terhubung ke server LunasQRIS',
    };
  }
}

/**
 * Buat transaksi QRIS dinamis baru di LunasQRIS
 * Endpoint: POST /api/v1/transaction/create
 */
export async function createLunasQrisTransaction(
  apiKey: string,
  params: CreateLunasQrisParams,
  baseUrl: string = DEFAULT_LUNASQRIS_BASE_URL
): Promise<{ success: boolean; data: LunasQrisTransactionData }> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    throw new Error('API Key LunasQRIS belum dikonfigurasi di tab Connection.');
  }

  if (params.amount <= 0) {
    throw new Error('Nominal amount transaksi harus lebih besar dari 0.');
  }

  const cleanBase = (baseUrl?.trim() || DEFAULT_LUNASQRIS_BASE_URL).replace(/\/+$/, '');
  const url = `${cleanBase}/api/v1/transaction/create`;

  const payload: any = {
    amount: Math.round(params.amount),
    ...(params.order_id && { order_id: params.order_id }),
    ...(params.description && { description: params.description }),
    ...(params.customer_name && { customer_name: params.customer_name }),
    ...(params.customer_email && { customer_email: params.customer_email }),
    ...(params.callback_url && { callback_url: params.callback_url }),
    ...(params.return_url && { return_url: params.return_url }),
    ...(params.expired_minutes && { expired_minutes: params.expired_minutes }),
    ...(params.metadata && { metadata: params.metadata }),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': cleanKey,
      'Authorization': `Bearer ${cleanKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success || !body.data) {
    throw new Error(
      body.error || body.message || `Gagal membuat transaksi LunasQRIS (HTTP ${res.status})`
    );
  }

  const d = body.data;
  return {
    success: true,
    data: {
      trx_id: d.trx_id,
      order_id: d.order_id || params.order_id,
      amount: Number(d.amount || params.amount),
      unique_code: Number(d.unique_code || 0),
      total_amount: Number(d.total_amount || (params.amount + (d.unique_code || 0))),
      status: (d.status || 'pending').toLowerCase() as any,
      qris_string: d.qris_string || '',
      qr_url: d.qr_url || '',
      payment_url: d.payment_url || `https://lunasqris.com/pay/${d.trx_id}`,
      expired_at: d.expired_at || '',
    },
  };
}

/**
 * Cek status pembayaran transaksi LunasQRIS
 * Endpoint: GET /api/v1/transaction/status?order_id=... atau GET /api/v1/transaction/{trx_id}
 */
export async function checkLunasQrisStatus(
  apiKey: string,
  identifier: { orderId?: string; trxId?: string },
  baseUrl: string = DEFAULT_LUNASQRIS_BASE_URL
): Promise<{ success: boolean; data: LunasQrisTransactionData; error?: string }> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    throw new Error('API Key LunasQRIS belum dikonfigurasi.');
  }

  const cleanBase = (baseUrl?.trim() || DEFAULT_LUNASQRIS_BASE_URL).replace(/\/+$/, '');
  let url = '';
  if (identifier.trxId) {
    url = `${cleanBase}/api/v1/transaction/${encodeURIComponent(identifier.trxId)}`;
  } else if (identifier.orderId) {
    url = `${cleanBase}/api/v1/transaction/status?order_id=${encodeURIComponent(identifier.orderId)}`;
  } else {
    throw new Error('Harap berikan orderId atau trxId untuk cek status.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-API-Key': cleanKey,
      'Authorization': `Bearer ${cleanKey}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success || !body.data) {
    throw new Error(
      body.error || body.message || `Gagal mengecek status LunasQRIS (HTTP ${res.status})`
    );
  }

  const d = body.data;
  return {
    success: true,
    data: {
      trx_id: d.trx_id,
      order_id: d.order_id,
      amount: Number(d.amount || 0),
      unique_code: Number(d.unique_code || 0),
      total_amount: Number(d.total_amount || 0),
      status: (d.status || 'pending').toLowerCase() as any,
      qris_string: d.qris_string || '',
      qr_url: d.qr_url || '',
      payment_url: d.payment_url || '',
      expired_at: d.expired_at || '',
      created_at: d.created_at,
    },
  };
}

/**
 * Batalkan transaksi LunasQRIS jika diperlukan
 * Endpoint: POST /api/v1/transaction/cancel
 */
export async function cancelLunasQrisTransaction(
  apiKey: string,
  identifier: { orderId?: string; trxId?: string },
  baseUrl: string = DEFAULT_LUNASQRIS_BASE_URL
): Promise<{ success: boolean; message?: string }> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) return { success: false, message: 'API Key tidak valid' };

  const cleanBase = (baseUrl?.trim() || DEFAULT_LUNASQRIS_BASE_URL).replace(/\/+$/, '');
  const url = `${cleanBase}/api/v1/transaction/cancel`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': cleanKey,
      },
      body: JSON.stringify(
        identifier.trxId ? { trx_id: identifier.trxId } : { order_id: identifier.orderId }
      ),
    });

    const body = await res.json().catch(() => ({}));
    return { success: res.ok && body.success, message: body.message };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}

/**
 * Verifikasi signature Webhook LunasQRIS menggunakan HMAC-SHA256
 */
export function verifyLunasQrisSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretKey: string
): boolean {
  if (!signature || !secretKey || !timestamp || !rawBody) return false;

  try {
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secretKey.trim()).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Map order/invoice aktif yang sedang dipantau
const activePollers = new Map<string, NodeJS.Timeout>();

/**
 * Mendaftarkan background poller berkala (tiap 4 detik) untuk sebuah transaksi LunasQRIS
 */
export function startLunasQrisPolling(
  pollConfig: ActiveLunasQrisPollingOrder,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
) {
  const pollKey = pollConfig.orderId || pollConfig.trxId || '';
  if (!pollKey) return;

  // Hentikan poller lama jika ada
  stopLunasQrisPolling(pollKey);

  let pollCount = 0;
  const maxPolls = 180; // ~12 menit (180 * 4 detik)

  if (addLog) {
    addLog(
      'info',
      `⏳ Memulai pemantauan status LunasQRIS (Order: ${pollConfig.orderId} | Total: Rp ${pollConfig.totalAmount.toLocaleString('id-ID')}) untuk ${pollConfig.senderName}...`
    );
  }

  const timer = setInterval(async () => {
    pollCount++;

    try {
      const statusRes = await checkLunasQrisStatus(
        pollConfig.apiKey,
        { orderId: pollConfig.orderId, trxId: pollConfig.trxId },
        pollConfig.baseUrl
      );

      const status = statusRes.data?.status;

      if (status === 'paid') {
        stopLunasQrisPolling(pollKey);
        if (addLog) {
          addLog(
            'success',
            `💰 Pembayaran LunasQRIS LUNAS! Order: ${pollConfig.orderId} (Rp ${pollConfig.totalAmount.toLocaleString('id-ID')}) dari ${pollConfig.senderName}`
          );
        }
        await pollConfig.onPaid();
        return;
      }

      if (status === 'expired' || status === 'cancelled' || pollCount >= maxPolls) {
        stopLunasQrisPolling(pollKey);
        if (addLog) {
          addLog(
            'warning',
            `⚠️ Transaksi LunasQRIS ${pollConfig.orderId} telah kedaluwarsa atau timeout.`
          );
        }
        await pollConfig.onExpired();
        return;
      }
    } catch {
      // Abaikan transient error selama interval polling
    }
  }, 4000);

  activePollers.set(pollKey, timer);
}

/**
 * Menghentikan poller untuk order tertentu
 */
export function stopLunasQrisPolling(orderOrTrxId: string) {
  const existing = activePollers.get(orderOrTrxId);
  if (existing) {
    clearInterval(existing);
    activePollers.delete(orderOrTrxId);
  }
}
