import React, { useState, useMemo, useEffect } from 'react';
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
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionItem } from '../../types/dashboard.types';

interface TabTransaksiProps {
  transactionsState: ReturnType<typeof useTransactions>;
  showToast: (msg: string) => void;
}

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 whenever search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleCopy = (text: string, label: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    showToast(`${label} disalin`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const renderStatusBadge = (status: 'pending' | 'paid' | 'cancel') => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancel
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Transaksi</h2>
          <p className="text-xs text-slate-500 mt-0.5">Daftar riwayat pembayaran pesanan QRIS.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncPendingTransactions}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-50 hover:bg-sky-100 text-[#0084D1] border border-sky-200 transition cursor-pointer disabled:opacity-50"
            title="Sinkronkan status transaksi pending"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sinkron...' : 'Sinkron Pending'}</span>
          </button>

          <button
            type="button"
            onClick={fetchTransactions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* 2. Ringkasan Metrik (4 Cards Minimalis) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pesanan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium block">Total Pesanan</span>
          <p className="text-xl font-bold text-slate-900 tracking-tight">
            {summary.totalCount} <span className="text-xs font-normal text-slate-400">order</span>
          </p>
        </div>

        {/* Total Pendapatan Paid */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Pendapatan</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 tracking-tight">
            Rp {summary.totalRevenue.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Transaksi Paid */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Lunas (Paid)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 tracking-tight">
            {summary.paidCount} <span className="text-xs font-normal text-emerald-600">sukses</span>
          </p>
        </div>

        {/* Pending & Cancel */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium block">Pending / Batal</span>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-base font-bold text-amber-600">
              {summary.pendingCount} <span className="text-xs font-normal text-slate-400">pending</span>
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-base font-bold text-rose-600">
              {summary.cancelCount} <span className="text-xs font-normal text-slate-400">batal</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Status Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor HP, Order ID, produk, varian..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills - Responsive Grid Segmented Control on Mobile, Inline Flex on Desktop */}
        <div className="w-full md:w-auto grid grid-cols-4 md:flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
          {(
            [
              { id: 'all', label: 'Semua', count: summary.totalCount },
              { id: 'paid', label: 'Paid', count: summary.paidCount },
              { id: 'pending', label: 'Pending', count: summary.pendingCount },
              { id: 'cancel', label: 'Cancel', count: summary.cancelCount },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                  isActive
                    ? 'bg-[#0084D1] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-mono shrink-0 leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Daftar Rincian Transaksi */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* State Loading & Kosong */}
        {loading && filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0084D1]" />
            <p className="text-xs">Memuat daftar transaksi...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="w-7 h-7 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-slate-600 text-xs">Tidak ada transaksi ditemukan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery
                ? 'Coba ganti kata kunci pencarian.'
                : 'Pesanan baru akan otomatis muncul di sini.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tampilan Mobile: Card View (block md:hidden) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedTransactions.map((trx) => {
                const buyerClean = trx.customerNumber ? trx.customerNumber.replace(/[^0-9]/g, '') : '';
                const waUrl = buyerClean ? `https://wa.me/${buyerClean}` : '';
                const orderKey = `order-${trx.orderId}`;
                const numKey = `num-${trx.orderId}`;

                return (
                  <div key={trx.id || trx.orderId} className="p-3.5 space-y-2.5">
                    {/* Header Card: Order ID & Status Badge */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
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
                      {renderStatusBadge(trx.status)}
                    </div>

                    {/* Informasi Produk & Pembeli */}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{trx.productName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{trx.variantName}</p>
                      
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                        <span className="text-[11px] text-slate-400">Pembeli:</span>
                        <span className="font-mono text-slate-800 font-medium">{trx.customerNumber || '-'}</span>
                        {trx.customerNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopy(trx.customerNumber, 'Nomor HP', numKey)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Salin Nomor HP"
                          >
                            {copiedId === numKey ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition"
                            title="Chat WhatsApp"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Kotak Rincian Nominal */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 grid grid-cols-2 gap-1.5 text-xs border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Nominal</span>
                        <span className="font-medium text-slate-700">Rp {trx.nominal.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Kode Unik</span>
                        <span className="font-mono text-amber-600 font-medium">+{trx.uniqueCode.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="col-span-2 border-t border-slate-200/60 pt-1.5 mt-0.5 flex justify-between items-center">
                        <span className="font-semibold text-slate-800 text-[11px]">Total Tagihan</span>
                        <span className="font-bold text-[#0084D1] text-sm">Rp {trx.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Footer Card: Web Checkout Link & Hapus */}
                    <div className="flex justify-between items-center pt-1">
                      {trx.paymentUrl ? (
                        <a
                          href={trx.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Web Checkout</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}

                      {deleteConfirmId === trx.orderId ? (
                        <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-lg shadow-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTransactionItem(trx.id || trx.orderId);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
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
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                          >
                            Batal
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
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Desktop: Tabel Rinci (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                    <th className="py-3 px-4 whitespace-nowrap">Pembeli</th>
                    <th className="py-3 px-4 whitespace-nowrap">Produk & Varian</th>
                    <th className="py-3 px-4 whitespace-nowrap">Order ID</th>
                    <th className="py-3 px-4 whitespace-nowrap">Nominal</th>
                    <th className="py-3 px-4 whitespace-nowrap">Total</th>
                    <th className="py-3 px-4 whitespace-nowrap text-center">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedTransactions.map((trx) => {
                    const buyerClean = trx.customerNumber ? trx.customerNumber.replace(/[^0-9]/g, '') : '';
                    const waUrl = buyerClean ? `https://wa.me/${buyerClean}` : '';
                    const orderKey = `order-${trx.orderId}`;
                    const numKey = `num-${trx.orderId}`;

                    return (
                      <tr
                        key={trx.id || trx.orderId}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Pembeli */}
                        <td className="py-3 px-4 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-900 text-xs">
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
                                title="Chat WhatsApp"
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

                        {/* Produk & Varian */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-900">{trx.productName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{trx.variantName}</div>
                        </td>

                        {/* Order ID */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
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
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div>Rp {trx.nominal.toLocaleString('id-ID')}</div>
                          {trx.uniqueCode > 0 && (
                            <div className="text-[10px] text-amber-600 font-mono">
                              +Rp {trx.uniqueCode.toLocaleString('id-ID')} unik
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          Rp {trx.total.toLocaleString('id-ID')}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(trx.status)}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {trx.paymentUrl && (
                              <a
                                href={trx.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium inline-flex items-center gap-1 transition"
                                title="Buka Web Checkout"
                              >
                                <span>Web</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {deleteConfirmId === trx.orderId ? (
                              <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-lg shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTransactionItem(trx.id || trx.orderId);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
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
                                  className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                                >
                                  Batal
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
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {filteredTransactions.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} dari{' '}
              {filteredTransactions.length} transaksi
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
