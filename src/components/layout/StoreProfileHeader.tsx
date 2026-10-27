import React from 'react';
import { Store, BadgeCheck, Wallet, RefreshCw, AlertCircle, QrCode } from 'lucide-react';
import { StoreInfoConfig, XavieraProfileState, LunasQrisBalanceState } from '../../types/dashboard.types';

interface StoreProfileHeaderProps {
  storeInfo: StoreInfoConfig;
  xavieraProfile: XavieraProfileState;
  lunasQrisBalance?: LunasQrisBalanceState;
  onRefreshProfile: () => void;
  onRefreshLunasQris?: () => void;
  onNavigateToConnection: () => void;
  showToast: (msg: string) => void;
}

export const StoreProfileHeader: React.FC<StoreProfileHeaderProps> = ({
  storeInfo,
  xavieraProfile,
  lunasQrisBalance,
  onRefreshProfile,
  onRefreshLunasQris,
  onNavigateToConnection,
  showToast,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Sisi Kiri: Identitas Toko & Informasi Profil */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                INFO PROFIL ANDA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {storeInfo.storeName || ''}
              </h1>
              <BadgeCheck className="w-4 h-4 text-sky-600 shrink-0" />
            </div>
            <p className="text-xs text-slate-500">
              {xavieraProfile.configured
                ? 'Terhubung dengan endpoint katalog, SMM, dan transaksi bot otomatis.'
                : 'Koneksi akun toko Xaviera Store untuk katalog produk, SMM, & transaksi otomatis.'}
            </p>
          </div>
        </div>

        {/* Sisi Kanan: Metrik Saldo & Status Akun */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {/* Kolom Saldo: Saldo Anda (Xaviera) & Saldo Payment Gateway (LunasQRIS) */}
          <div className="flex flex-col gap-2.5 min-w-[220px]">
            {/* 1. Kotak Saldo Anda (Xaviera Store) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 transition-all">
              <div className="flex items-center justify-between gap-3 text-slate-500 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                  <Wallet className="w-3.5 h-3.5 text-sky-600" />
                  Saldo Anda (Xaviera)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onRefreshProfile();
                    showToast('Menyinkronkan saldo Xaviera Store...');
                  }}
                  disabled={xavieraProfile.loading}
                  className="text-slate-400 hover:text-sky-600 transition cursor-pointer p-0.5 rounded"
                  title="Perbarui Saldo Xaviera"
                >
                  <RefreshCw className={`w-3 h-3 ${xavieraProfile.loading ? 'animate-spin text-sky-600' : ''}`} />
                </button>
              </div>
              <div className="font-mono font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                {xavieraProfile.loading ? (
                  <span className="text-xs text-slate-400 font-normal">Memuat saldo...</span>
                ) : xavieraProfile.data?.balance !== undefined ? (
                  typeof xavieraProfile.data.balance === 'number'
                    ? `Rp ${Number(xavieraProfile.data.balance).toLocaleString('id-ID')}`
                    : `Rp ${xavieraProfile.data.balance}`
                ) : (
                  'Rp 0'
                )}
              </div>
            </div>

            {/* 2. Kotak Saldo Payment Gateway (LunasQRIS) */}
            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg px-3.5 py-2 transition-all">
              <div className="flex items-center justify-between gap-3 text-slate-500 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  Saldo Payment Gateway
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onRefreshLunasQris) {
                      onRefreshLunasQris();
                    } else {
                      showToast('Menyinkronkan saldo LunasQRIS...');
                    }
                  }}
                  disabled={lunasQrisBalance?.loading}
                  className="text-emerald-500 hover:text-emerald-700 transition cursor-pointer p-0.5 rounded"
                  title="Perbarui Saldo LunasQRIS"
                >
                  <RefreshCw className={`w-3 h-3 ${lunasQrisBalance?.loading ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-mono font-bold text-base sm:text-lg text-emerald-950 tracking-tight">
                  {lunasQrisBalance?.loading ? (
                    <span className="text-xs text-emerald-600 font-normal">Memuat saldo...</span>
                  ) : lunasQrisBalance?.configured && lunasQrisBalance.balance !== null ? (
                    `Rp ${Number(lunasQrisBalance.balance).toLocaleString('id-ID')}`
                  ) : lunasQrisBalance?.error ? (
                    <span
                      onClick={onNavigateToConnection}
                      className="text-xs text-rose-600 font-medium hover:underline cursor-pointer"
                      title={lunasQrisBalance.error}
                    >
                      Cek API LunasQRIS
                    </span>
                  ) : (
                    <span
                      onClick={onNavigateToConnection}
                      className="text-xs text-slate-400 font-medium hover:text-emerald-700 hover:underline cursor-pointer"
                      title="Atur API Key LunasQRIS di tab Connection"
                    >
                      Belum Diatur
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-sans shrink-0">
                  LunasQRIS
                </span>
              </div>
            </div>
          </div>

          {/* Status Akun & Role Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-col justify-between min-w-[150px] self-stretch">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status Akun
            </div>
            <div className="flex items-center justify-between gap-2">
              {xavieraProfile.configured && !xavieraProfile.error ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  {xavieraProfile.data?.status || 'Aktif'}
                </span>
              ) : xavieraProfile.error ? (
                <span
                  onClick={onNavigateToConnection}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100/70 transition"
                  title={xavieraProfile.error}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Perlu Cek API
                </span>
              ) : (
                <span
                  onClick={onNavigateToConnection}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200/60 transition"
                >
                  Belum Terhubung
                </span>
              )}
              {xavieraProfile.data?.role && (
                <span className="text-[11px] font-medium text-slate-500 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                  {xavieraProfile.data.role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
