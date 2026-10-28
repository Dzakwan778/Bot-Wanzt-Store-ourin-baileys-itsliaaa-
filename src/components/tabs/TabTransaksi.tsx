import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Receipt,
  ExternalLink,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionItem } from '../../types/dashboard.types';

interface TabTransaksiProps {
  transactionsState: ReturnType<typeof useTransactions>;
  showToast: (msg: string) => void;
}

export const TabTransaksi: React.FC<TabTransaksiProps> = ({
  transactionsState,
  showToast,
}) => {
  const {
    filteredTransactions,
    summary,
    loading,
    isSyncing,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    fetchTransactions,
    syncPendingTransactions,
    deleteTransactionItem,
  } = transactionsState;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedTrxDetail, setSelectedTrxDetail] = useState<TransactionItem | null>(null);

  const handleCopy = (text: string, label: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    showToast(`${label} berhasil disalin!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Helper render status badge sesuai instruksi:
  // pending berwarna kuning, cancel berwarna merah, paid berwarna hijau
  const renderStatusBadge = (status: 'pending' | 'paid' | 'cancel') => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Cancel
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Ringkasan Metrik Transaksi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-600" />
              <span>Riwayat Transaksi Pelanggan</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data transaksi QRIS otomatis dari bot WhatsApp. Status lunas diperbarui secara instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncPendingTransactions}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Periksa status transaksi pending ke server LunasQRIS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkron Pending'}
          </button>
          <button
            type="button"
            onClick={fetchTransactions}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* 2. Kartu Statistik Transaksi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transaksi */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Pesanan</span>
            <span className="p-1.5 bg-slate-200/60 rounded-lg text-slate-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
            {summary.totalCount} <span className="text-xs font-normal text-slate-500">order</span>
          </p>
        </div>

        {/* Total Omset Lunas */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Total Pendapatan (Paid)</span>
            <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-2">
            Rp {summary.totalRevenue.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Transaksi Paid (Hijau) */}
        <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-150">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-medium">Transaksi Lunas (Paid)</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-2">
            {summary.paidCount}{' '}
            <span className="text-xs font-normal text-emerald-600">sukses</span>
          </p>
        </div>

        {/* Transaksi Pending (Kuning) & Cancel (Merah) */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-medium">Pending / Cancel</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-amber-700">
              {summary.pendingCount} <span className="text-xs font-normal text-amber-600">pending</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-rose-600">
              {summary.cancelCount} <span className="text-xs font-normal text-rose-500">cancel</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Kolom Pencarian */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-200">
        {/* Input Pencarian */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomer pembeli, Order ID, nama produk, varian..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        {/* Tombol Filter Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'paid', label: 'Paid (Hijau)' },
              { id: 'pending', label: 'Pending (Kuning)' },
              { id: 'cancel', label: 'Cancel (Merah)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tabel Rincian Transaksi */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap">Nomer Pembeli</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Nama Produk</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Varian Produk</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Order ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Nominal</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Kode Unik</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Total</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Status Pembayaran</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-sky-500" />
                    Memuat daftar transaksi...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Tidak ada transaksi ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery
                        ? 'Coba ganti kata kunci pencarian Anda.'
                        : 'Pesanan yang masuk melalui WhatsApp bot akan otomatis muncul di sini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => {
                  const buyerClean = trx.customerNumber.replace(/[^0-9]/g, '');
                  const waUrl = buyerClean ? `https://wa.me/${buyerClean}` : '';
                  const orderKey = `order-${trx.orderId}`;
                  const numKey = `num-${trx.orderId}`;

                  return (
                    <tr
                      key={trx.id || trx.orderId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Nomer Pembeli */}
                      <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-800">
                            {trx.customerNumber || '-'}
                          </span>
                          {trx.customerNumber && (
                            <button
                              type="button"
                              onClick={() => handleCopy(trx.customerNumber, 'Nomor HP', numKey)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                              title="Salin Nomor HP"
                            >
                              {copiedId === numKey ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition"
                              title="Chat WhatsApp Pembeli"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {trx.customerName && trx.customerName !== `Pelanggan-${buyerClean.slice(-4)}` && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {trx.customerName}
                          </span>
                        )}
                      </td>

                      {/* Nama Produk */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {trx.productName}
                      </td>

                      {/* Varian Produk */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700">
                          {trx.variantName}
                        </span>
                      </td>

                      {/* Order ID */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {trx.orderId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(trx.orderId, 'Order ID', orderKey)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Salin Order ID"
                          >
                            {copiedId === orderKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Nominal */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        Rp {trx.nominal.toLocaleString('id-ID')}
                      </td>

                      {/* Kode Unik */}
                      <td className="py-3 px-3.5 text-amber-700 font-mono whitespace-nowrap">
                        +Rp {trx.uniqueCode.toLocaleString('id-ID')}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        Rp {trx.total.toLocaleString('id-ID')}
                      </td>

                      {/* Status Pembayaran */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(trx.status)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {trx.paymentUrl && (
                            <a
                              href={trx.paymentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition"
                              title="Buka Halaman Checkout Web"
                            >
                              Web
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {deleteConfirmId === trx.orderId ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 p-0.5 rounded-lg shadow-sm z-20">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTransactionItem(trx.id || trx.orderId);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Klik untuk konfirmasi hapus"
                              >
                                <Check className="w-3 h-3" />
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="px-1.5 py-1 text-slate-500 hover:text-slate-800 text-[10px] rounded hover:bg-slate-200 transition cursor-pointer font-bold"
                                title="Batal"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(trx.orderId);
                                setTimeout(() => {
                                  setDeleteConfirmId((prev) => (prev === trx.orderId ? null : prev));
                                }, 4000);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer relative z-10"
                              title="Hapus Transaksi (Klik untuk konfirmasi)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Catatan Kaki & Keterangan Warna Status */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Keterangan Status:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <b>Pending</b>: Menunggu transfer pembeli
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <b>Paid</b>: Pembayaran lunas & akun terkirim
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <b>Cancel</b>: Kedaluwarsa / dibatalkan
          </span>
        </div>
        <div className="text-right text-slate-400 font-mono">
          Sinkronisasi Otomatis LunasQRIS Poller & Webhook
        </div>
      </div>
    </div>
  );
};
