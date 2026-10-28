import { useState, useEffect, useCallback, useMemo } from 'react';
import { TransactionItem, TransactionSummary } from '../types/dashboard.types';

export function useTransactions(showToast?: (msg: string) => void) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalCount: 0,
    paidCount: 0,
    pendingCount: 0,
    cancelCount: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancel'>('all');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setError(data.error || 'Gagal memuat transaksi');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal terhubung ke API Transaksi');
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPendingTransactions = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (showToast) {
          showToast(
            data.updatedCount > 0
              ? `Sinkronisasi selesai! ${data.updatedCount} transaksi diperbarui.`
              : 'Status transaksi sudah mutakhir.'
          );
        }
      } else {
        if (showToast) showToast('Gagal sinkronisasi transaksi.');
      }
    } catch (err: any) {
      if (showToast) showToast(`Error sinkronisasi: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  const deleteTransactionItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setTransactions(data.transactions || []);
          if (data.summary) {
            setSummary(data.summary);
          }
          if (showToast) showToast('Transaksi berhasil dihapus');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchTransactions();
    // Auto-refresh transaksi tiap 15 detik jika dashboard dibuka
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // Filter & Search transaksi
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Filter status
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      // 2. Filter search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrder = t.orderId.toLowerCase().includes(q);
        const matchesNumber = t.customerNumber.toLowerCase().includes(q);
        const matchesName = (t.customerName || '').toLowerCase().includes(q);
        const matchesProduct = (t.productName || '').toLowerCase().includes(q);
        const matchesVariant = (t.variantName || '').toLowerCase().includes(q);
        return matchesOrder || matchesNumber || matchesName || matchesProduct || matchesVariant;
      }

      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  return {
    transactions,
    filteredTransactions,
    summary,
    loading,
    isSyncing,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    fetchTransactions,
    syncPendingTransactions,
    deleteTransactionItem,
  };
}
