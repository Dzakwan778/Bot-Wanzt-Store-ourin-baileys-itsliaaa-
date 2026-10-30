import React from 'react';
import {
  Wallet,
  QrCode,
  RefreshCw,
  LogOut,
  Radio,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  BotStatusResponse,
  XavieraProfileState,
  LunasQrisBalanceState,
} from '../../types/dashboard.types';

interface DesktopTopNavProps {
  selectedTab: string;
  botData: BotStatusResponse;
  xavieraProfile: XavieraProfileState;
  lunasQrisBalance?: LunasQrisBalanceState;
  onRefreshProfile: () => void;
  onRefreshLunasQris?: () => void;
  onNavigateToConnection: () => void;
  username?: string;
  onLogout?: () => void;
  showToast: (msg: string) => void;
}

export const DesktopTopNav: React.FC<DesktopTopNavProps> = ({
  selectedTab,
  botData,
  xavieraProfile,
  lunasQrisBalance,
  onRefreshProfile,
  onRefreshLunasQris,
  onNavigateToConnection,
  username = 'Admin',
  onLogout,
  showToast,
}) => {
  const getStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            CONNECTED
          </span>
        );
      case 'waiting_code':
      case 'code_ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-[#0084D1] border border-sky-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 animate-spin text-[#0084D1]" />
            MENUNGGU VERIFIKASI
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
            CONNECTING...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            IDLE / DISCONNECTED
          </span>
        );
    }
  };

  const formatBalance = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 px-6 flex items-center justify-between shadow-2xs">
      {/* Kiri: Judul Halaman / Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Dashboard</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              {selectedTab === 'tab02' ? 'SMM' : selectedTab === 'tab03' ? 'Top Up' : selectedTab}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Wanzt Store Management Panel
          </p>
        </div>
      </div>

      {/* Kanan: Ringkasan Saldo Xaviera & LunasQRIS + Status Bot */}
      <div className="flex items-center gap-3">
        {/* Kotak Mini Saldo Xaviera */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Wallet className="w-3.5 h-3.5 text-[#0084D1]" />
            <span className="text-[11px] text-slate-600">Saldo Xaviera:</span>
          </div>
          <span className="font-mono font-bold text-slate-900">
            {xavieraProfile.loading
              ? '...'
              : formatBalance(xavieraProfile.data?.balance)}
          </span>
          <button
            type="button"
            onClick={() => {
              onRefreshProfile();
              showToast('Menyinkronkan saldo Xaviera...');
            }}
            disabled={xavieraProfile.loading}
            className="text-slate-400 hover:text-[#0084D1] p-0.5 rounded cursor-pointer transition"
            title="Refresh Saldo Xaviera"
          >
            <RefreshCw
              className={`w-3 h-3 ${xavieraProfile.loading ? 'animate-spin text-[#0084D1]' : ''}`}
            />
          </button>
        </div>

        {/* Kotak Mini Saldo Payment Gateway (LunasQRIS) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] text-emerald-900">QRIS Saldo:</span>
          </div>
          <span className="font-mono font-bold text-emerald-950">
            {lunasQrisBalance?.loading
              ? '...'
              : formatBalance(lunasQrisBalance?.balance)}
          </span>
          {onRefreshLunasQris && (
            <button
              type="button"
              onClick={() => {
                onRefreshLunasQris();
                showToast('Menyinkronkan saldo LunasQRIS...');
              }}
              disabled={lunasQrisBalance?.loading}
              className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded cursor-pointer transition"
              title="Refresh Saldo LunasQRIS"
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  lunasQrisBalance?.loading ? 'animate-spin text-emerald-600' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Status Bot Badge */}
        <button
          type="button"
          onClick={onNavigateToConnection}
          className="cursor-pointer transition hover:opacity-90"
          title="Klik untuk membuka Pengaturan Koneksi WhatsApp"
        >
          {getStatusBadge()}
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer"
            title="Keluar dari Dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Keluar</span>
          </button>
        )}
      </div>
    </header>
  );
};
