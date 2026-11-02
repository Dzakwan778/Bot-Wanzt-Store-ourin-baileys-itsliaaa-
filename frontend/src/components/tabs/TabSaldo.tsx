import React from 'react';
import {
  Wallet,
  QrCode,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Coins,
} from 'lucide-react';
import {
  XavieraProfileState,
  LunasQrisBalanceState,
  TransactionSummary,
} from '../../types/dashboard.types';

interface TabSaldoProps {
  xavieraProfile: XavieraProfileState;
  lunasQrisBalance?: LunasQrisBalanceState;
  transactionSummary?: TransactionSummary;
  onRefreshProfile: () => void;
  onRefreshLunasQris?: () => void;
  onNavigateToKoneksiLayanan: () => void;
  showToast: (msg: string) => void;
}

export const TabSaldo: React.FC<TabSaldoProps> = ({
  xavieraProfile,
  lunasQrisBalance,
  transactionSummary,
  onRefreshProfile,
  onRefreshLunasQris,
  onNavigateToKoneksiLayanan,
  showToast,
}) => {
  const formatRupiah = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  const xavieraBal = xavieraProfile.data?.balance;
  const lunasActiveBal = lunasQrisBalance?.balance;
  const lunasHoldBal = lunasQrisBalance?.balanceHold;

  return (
    <div className="space-y-6">
      {/* 1. Header Halaman Saldo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0084D1] flex items-center justify-center border border-sky-200 shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Monitoring Saldo Toko
              </h2>
              <p className="text-xs text-slate-500">
                Pantau saldo deposit Xaviera dan saldo payment gateway LunasQRIS secara langsung.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRefreshProfile();
              if (onRefreshLunasQris) onRefreshLunasQris();
              showToast('Menyinkronkan semua saldo...');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-600 ${
                xavieraProfile.loading || lunasQrisBalance?.loading ? 'animate-spin text-[#0084D1]' : ''
              }`}
            />
            <span>Sinkronkan Semua</span>
          </button>
        </div>
      </div>

      {/* 2. Kartu Utama Saldo (Grid 2 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kartu 1: Saldo Xaviera Store (Modal & Transaksi Bot) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-100/70 text-[#0084D1] flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Deposit Produk
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Saldo Xaviera Store
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onRefreshProfile();
                  showToast('Menyegarkan saldo Xaviera...');
                }}
                disabled={xavieraProfile.loading}
                className="p-1.5 text-slate-400 hover:text-[#0084D1] hover:bg-sky-50 rounded-lg transition cursor-pointer"
                title="Refresh Saldo Xaviera"
              >
                <RefreshCw
                  className={`w-4 h-4 ${xavieraProfile.loading ? 'animate-spin text-[#0084D1]' : ''}`}
                />
              </button>
            </div>

            {/* Nominal Saldo Besar */}
            <div className="py-2">
              <div className="text-xs text-slate-500 mb-1">Saldo Tersedia</div>
              <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                {xavieraProfile.loading ? (
                  <span className="text-base text-slate-400 font-normal">Memperbarui data...</span>
                ) : (
                  formatRupiah(xavieraBal)
                )}
              </div>
            </div>

            {/* Info Rincian Akun Xaviera */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Username Akun:</span>
                <span className="font-mono font-bold text-slate-800">
                  {xavieraProfile.data?.username || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Status Akun:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {xavieraProfile.data?.status || 'Aktif'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Role Pengguna:</span>
                <span className="font-medium text-slate-700">
                  {xavieraProfile.data?.role || 'Reseller / Member'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Digunakan otomatis untuk order APK, SMM, &amp; Top Up
            </span>
            <button
              type="button"
              onClick={onNavigateToKoneksiLayanan}
              className="text-xs font-semibold text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah API Key</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Kartu 2: Saldo Payment Gateway (LunasQRIS) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                  <QrCode className="w-4.5 h-4.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Penerimaan Pembayaran
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Saldo LunasQRIS Gateway
                  </h3>
                </div>
              </div>

              {onRefreshLunasQris && (
                <button
                  type="button"
                  onClick={() => {
                    onRefreshLunasQris();
                    showToast('Menyegarkan saldo LunasQRIS...');
                  }}
                  disabled={lunasQrisBalance?.loading}
                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                  title="Refresh Saldo LunasQRIS"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${lunasQrisBalance?.loading ? 'animate-spin text-emerald-600' : ''}`}
                  />
                </button>
              )}
            </div>

            {/* Nominal Saldo Besar */}
            <div className="py-2">
              <div className="text-xs text-slate-500 mb-1">Saldo Aktif Dapat Ditarik</div>
              <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-700 tracking-tight">
                {lunasQrisBalance?.loading ? (
                  <span className="text-base text-slate-400 font-normal">Memperbarui data...</span>
                ) : (
                  formatRupiah(lunasActiveBal)
                )}
              </div>
            </div>

            {/* Saldo Tertahan & Info Penarikan */}
            <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Saldo Tertahan (Hold):
                </span>
                <span className="font-mono font-bold text-emerald-950">
                  {formatRupiah(lunasHoldBal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Webhook Signature:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> HMAC-SHA256
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Status Gateway:</span>
                <span className="font-semibold text-slate-800">
                  {lunasQrisBalance?.configured ? 'Terhubung Aktif' : 'Belum Dikonfigurasi'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Hasil pembayaran QRIS pembeli secara real-time
            </span>
            <button
              type="button"
              onClick={onNavigateToKoneksiLayanan}
              className="text-xs font-semibold text-[#0084D1] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah API QRIS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Ringkasan Pendapatan Transaksi Toko */}
      {transactionSummary && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
              <h4 className="text-sm font-bold tracking-tight">Akumulasi Penjualan Toko</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              LunasQRIS Transactions
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <div className="text-[11px] text-slate-400">Total Omset Sukses</div>
              <div className="font-mono font-bold text-lg text-emerald-400 mt-0.5">
                {formatRupiah(transactionSummary.totalRevenue)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Transaksi Berhasil</div>
              <div className="font-mono font-bold text-lg text-white mt-0.5">
                {transactionSummary.paidCount} pesanan
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Menunggu Bayar</div>
              <div className="font-mono font-bold text-lg text-amber-300 mt-0.5">
                {transactionSummary.pendingCount} pesanan
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Semua Order</div>
              <div className="font-mono font-bold text-lg text-slate-200 mt-0.5">
                {transactionSummary.totalCount} pesanan
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
