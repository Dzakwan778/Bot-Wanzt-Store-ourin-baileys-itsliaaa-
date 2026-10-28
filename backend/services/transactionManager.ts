import fs from 'fs';
import path from 'path';

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

function resolveTransactionsPath(): string {
  const localDb = path.resolve(process.cwd(), 'database', 'transactions.json');
  if (fs.existsSync(localDb)) return localDb;
  const backendDb = path.resolve(process.cwd(), 'backend', 'database', 'transactions.json');
  if (fs.existsSync(backendDb)) return backendDb;
  return localDb;
}

const DB_PATH = resolveTransactionsPath();

/**
 * Membaca seluruh data transaksi dari file JSON
 */
export function getAllTransactions(): TransactionRecord[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return [];
  } catch (err) {
    console.error('Gagal membaca database transaksi:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data transaksi ke file JSON
 */
export function saveAllTransactions(transactions: TransactionRecord[]): void {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(transactions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menulis database transaksi:', err);
  }
}

/**
 * Mendaftarkan transaksi baru dengan status 'pending'
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
  status?: 'pending' | 'paid' | 'cancel';
}): TransactionRecord {
  const current = getAllTransactions();
  const now = new Date().toISOString();

  // Bersihkan format nomor WA
  const cleanNumber = data.customerNumber.replace(/[^0-9]/g, '');

  const newRecord: TransactionRecord = {
    id: `TRX-${data.orderId}`,
    orderId: data.orderId,
    trxId: data.trxId || '',
    customerNumber: cleanNumber,
    customerName: data.customerName || `Pelanggan-${cleanNumber.slice(-4)}`,
    productName: data.productName,
    variantName: data.variantName,
    nominal: Math.round(data.nominal),
    uniqueCode: Math.round(data.uniqueCode),
    total: Math.round(data.total),
    status: data.status || 'pending',
    paymentUrl: data.paymentUrl || '',
    createdAt: now,
    updatedAt: now,
  };

  // Cek apakah orderId sudah ada sebelumnya
  const existingIdx = current.findIndex(
    (item) => item.orderId === data.orderId || (data.trxId && item.trxId === data.trxId)
  );

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      ...newRecord,
      createdAt: current[existingIdx].createdAt,
      updatedAt: now,
    };
  } else {
    current.unshift(newRecord);
  }

  saveAllTransactions(current);
  return newRecord;
}

/**
 * Memperbarui status transaksi (pending, paid, cancel)
 */
export function updateTransactionStatus(
  identifier: string,
  newStatus: 'pending' | 'paid' | 'cancel'
): TransactionRecord | null {
  if (!identifier) return null;
  const current = getAllTransactions();
  const target = current.find(
    (t) => t.orderId === identifier || t.trxId === identifier || t.id === identifier
  );

  if (!target) return null;

  target.status = newStatus;
  target.updatedAt = new Date().toISOString();

  saveAllTransactions(current);
  return target;
}

/**
 * Menghapus transaksi berdasarkan ID atau Order ID
 */
export function deleteTransaction(identifier: string): boolean {
  const current = getAllTransactions();
  const initialLength = current.length;
  const filtered = current.filter((t) => t.id !== identifier && t.orderId !== identifier);

  if (filtered.length !== initialLength) {
    saveAllTransactions(filtered);
    return true;
  }
  return false;
}

/**
 * Menghitung ringkasan statistik transaksi
 */
export function getTransactionSummary(): TransactionSummary {
  const list = getAllTransactions();
  let paidCount = 0;
  let pendingCount = 0;
  let cancelCount = 0;
  let totalRevenue = 0;

  for (const item of list) {
    if (item.status === 'paid') {
      paidCount++;
      totalRevenue += item.total || 0;
    } else if (item.status === 'pending') {
      pendingCount++;
    } else if (item.status === 'cancel') {
      cancelCount++;
    }
  }

  return {
    totalCount: list.length,
    paidCount,
    pendingCount,
    cancelCount,
    totalRevenue,
  };
}
