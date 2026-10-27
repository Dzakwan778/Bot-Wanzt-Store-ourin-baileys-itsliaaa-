import React, { useState } from 'react';
import {
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  RefreshCw,
  Wallet,
  QrCode,
  ShieldCheck,
  Zap,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { WhatsAppButton } from '../../types/dashboard.types';

interface TabConnectionProps {
  xavieraApiKey: string;
  setXavieraApiKey: (val: string) => void;
  xavieraBaseUrl: string;
  setXavieraBaseUrl: (val: string) => void;
  lunasQrisApiKey: string;
  setLunasQrisApiKey: (val: string) => void;
  lunasQrisSecretKey: string;
  setLunasQrisSecretKey: (val: string) => void;
  lunasQrisBaseUrl: string;
  setLunasQrisBaseUrl: (val: string) => void;
  showApiKey: boolean;
  setShowApiKey: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingConfig: boolean;
  syncConfigToServer: (
    menuText?: any,
    buttons?: WhatsAppButton[],
    listText?: string,
    incMedia?: boolean,
    pic?: string,
    apiKey?: string,
    baseUrl?: string,
    carouselText?: string,
    carouselPicture?: string,
    storeInfo?: any,
    menuFooter?: string,
    listFooter?: string,
    carouselFooter?: string,
    newLunasQrisApiKey?: string,
    newLunasQrisSecretKey?: string,
    newLunasQrisBaseUrl?: string
  ) => void;
  menuOutputText: string;
  menuButtons: WhatsAppButton[];
  listOutputText: string;
  includeMedia: boolean;
  selectedPicture: string;
  showToast: (msg: string) => void;
}

export const TabConnection: React.FC<TabConnectionProps> = ({
  xavieraApiKey,
  setXavieraApiKey,
  xavieraBaseUrl,
  setXavieraBaseUrl,
  lunasQrisApiKey,
  setLunasQrisApiKey,
  lunasQrisSecretKey,
  setLunasQrisSecretKey,
  lunasQrisBaseUrl,
  setLunasQrisBaseUrl,
  showApiKey,
  setShowApiKey,
  isSavingConfig,
  syncConfigToServer,
  showToast,
}) => {
  const [showLunasKey, setShowLunasKey] = useState<boolean>(false);
  const [showLunasSecret, setShowLunasSecret] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [lunasBalance, setLunasBalance] = useState<{
    loading: boolean;
    balance: number | null;
    balanceHold: number | null;
    error: string | null;
    checked: boolean;
  }>({
    loading: false,
    balance: null,
    balanceHold: null,
    error: null,
    checked: false,
  });

  const webhookUrl = `${window.location.origin}/api/lunasqris/webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showToast('URL Webhook LunasQRIS berhasil disalin!');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleCheckLunasBalance = async () => {
    if (!lunasQrisApiKey || !lunasQrisApiKey.trim()) {
      showToast('Silakan masukkan API Key LunasQRIS terlebih dahulu.');
      return;
    }
    setLunasBalance((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(
        `/api/lunasqris/balance?apikey=${encodeURIComponent(lunasQrisApiKey.trim())}&baseurl=${encodeURIComponent(
          lunasQrisBaseUrl || 'https://lunasqris.com'
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setLunasBalance({
          loading: false,
          balance: Number(data.balance || 0),
          balanceHold: Number(data.balanceHold || 0),
          error: null,
          checked: true,
        });
        showToast(`Saldo LunasQRIS berhasil dicek: Rp ${Number(data.balance || 0).toLocaleString('id-ID')}`);
      } else {
        setLunasBalance({
          loading: false,
          balance: null,
          balanceHold: null,
          error: data.error || 'API Key LunasQRIS tidak valid',
          checked: true,
        });
        showToast(data.error || 'Gagal memverifikasi API Key LunasQRIS');
      }
    } catch (err: any) {
      setLunasBalance({
        loading: false,
        balance: null,
        balanceHold: null,
        error: err?.message || 'Gagal terhubung ke API LunasQRIS',
        checked: true,
      });
      showToast('Koneksi ke API LunasQRIS gagal');
    }
  };

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* SEKSI 1: KONFIGURASI XAVIERA STORE API                       */}
      {/* ============================================================ */}
      <div className="space-y-6">
        {/* Header Tab Connection - Xaviera API */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Konfigurasi Xaviera Store API
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur integrasi Developer API Xaviera untuk katalog produk, SMM, dan transaksi bot otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSavingConfig ? (
              <span className="text-[11px] font-mono text-sky-600 bg-sky-50 px-2.5 py-1 rounded border border-sky-200 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Menyimpan...
              </span>
            ) : (
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Tersimpan Otomatis
              </span>
            )}
          </div>
        </div>

        {/* Kolom 1: Input API Key Xaviera */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-600" />
              API Key Xaviera Store
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Header: Authorization: Bearer [token]
            </span>
          </label>
          <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
              <KeyRound className="w-4 h-4 text-sky-600" />
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={xavieraApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setXavieraApiKey(val);
                syncConfigToServer({ xavieraApiKey: val });
              }}
              placeholder="Masukkan API Key Xaviera (xvs_...)"
              className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
              title={showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
            >
              {showApiKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
            <span>💡</span>
            <span>
              Dapatkan API Key melalui dashboard akun Xaviera Store Anda di menu <strong>Profil &gt; Integrasi API</strong> (pada{' '}
              <a
                href="https://xavierastore.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 font-semibold hover:underline"
              >
                https://xavierastore.com
              </a>
              ).
            </span>
          </p>
        </div>

        {/* Kolom 2: Input Base URL API Xaviera */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              Base URL API Xaviera
            </label>
            {xavieraBaseUrl !== 'https://xavierastore.com/api/v1' && (
              <button
                type="button"
                onClick={() => {
                  const defaultUrl = 'https://xavierastore.com/api/v1';
                  setXavieraBaseUrl(defaultUrl);
                  syncConfigToServer({ xavieraBaseUrl: defaultUrl });
                  showToast('Base URL dikembalikan ke default dokumentasi!');
                }}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-medium hover:underline cursor-pointer"
              >
                Reset ke Default
              </button>
            )}
          </div>
          <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none">
              URL
            </div>
            <input
              type="text"
              value={xavieraBaseUrl}
              onChange={(e) => {
                const val = e.target.value;
                setXavieraBaseUrl(val);
                syncConfigToServer({ xavieraBaseUrl: val });
              }}
              placeholder="https://xavierastore.com/api/v1"
              className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Default resmi sesuai dokumentasi Xaviera API:{' '}
            <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">
              https://xavierastore.com/api/v1
            </code>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEKSI 2: KONFIGURASI LUNASQRIS PAYMENT GATEWAY               */}
      {/* ============================================================ */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        {/* Header Seksi LunasQRIS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Konfigurasi LunasQRIS Payment Gateway</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  DANA Bisnis QRIS
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrasi gateway LunasQRIS (lunasqris.com) untuk pembuatan QRIS otomatis, Fee Gateway, dan verifikasi mutasi instan.
            </p>
          </div>

          {/* Tombol Uji & Cek Saldo LunasQRIS */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckLunasBalance}
              disabled={lunasBalance.loading || !lunasQrisApiKey?.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                lunasQrisApiKey?.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {lunasBalance.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              <span>Cek Saldo LunasQRIS</span>
            </button>
          </div>
        </div>

        {/* Status Saldo LunasQRIS Box */}
        {lunasBalance.checked && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              lunasBalance.error
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  lunasBalance.error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">
                  {lunasBalance.error ? 'Verifikasi API LunasQRIS Gagal' : 'Saldo Akun Merchant LunasQRIS'}
                </div>
                <div className="text-[11px] opacity-80">
                  {lunasBalance.error
                    ? lunasBalance.error
                    : `Saldo Hold: Rp ${Number(lunasBalance.balanceHold || 0).toLocaleString('id-ID')} (tertahan sementara)`}
                </div>
              </div>
            </div>
            {!lunasBalance.error && lunasBalance.balance !== null && (
              <div className="text-right">
                <span className="text-xs text-emerald-600 block font-medium">Saldo Siap Tarik</span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  Rp {lunasBalance.balance.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Kolom 1: Public API Key (pk_...) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              Public API Key (pk_...)
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Header: X-API-Key atau Authorization: Bearer
            </span>
          </label>
          <div className="relative flex rounded-lg border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
              <KeyRound className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type={showLunasKey ? 'text' : 'password'}
              value={lunasQrisApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setLunasQrisApiKey(val);
                syncConfigToServer({ lunasQrisApiKey: val });
              }}
              placeholder="Masukkan Public API Key LunasQRIS (contoh: pk_live_...)"
              className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowLunasKey(!showLunasKey)}
              className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
              title={showLunasKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
            >
              {showLunasKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
            <span>💡</span>
            <span>
              Dapatkan Public API Key di panel LunasQRIS pada menu <strong>API & Integrasi</strong> di{' '}
              <a
                href="https://lunasqris.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 font-semibold hover:underline"
              >
                https://lunasqris.com
              </a>
              .
            </span>
          </p>
        </div>

        {/* Kolom 2: Secret Key (sk_...) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Secret Key (sk_...)
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Verifikasi Tanda Tangan Webhook (HMAC-SHA256)
            </span>
          </label>
          <div className="relative flex rounded-lg border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type={showLunasSecret ? 'text' : 'password'}
              value={lunasQrisSecretKey}
              onChange={(e) => {
                const val = e.target.value;
                setLunasQrisSecretKey(val);
                syncConfigToServer({ lunasQrisSecretKey: val });
              }}
              placeholder="Masukkan Secret Key LunasQRIS (contoh: sk_live_...)"
              className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowLunasSecret(!showLunasSecret)}
              className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
              title={showLunasSecret ? 'Sembunyikan Secret Key' : 'Tampilkan Secret Key'}
            >
              {showLunasSecret ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Kunci ini digunakan secara rahasia di sisi server untuk memvalidasi keaslian callback notifikasi pembayaran dari LunasQRIS.
          </p>
        </div>

        {/* Kolom 3: Base URL API LunasQRIS */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Base URL API LunasQRIS
            </label>
            {lunasQrisBaseUrl !== 'https://lunasqris.com' && (
              <button
                type="button"
                onClick={() => {
                  const defaultUrl = 'https://lunasqris.com';
                  setLunasQrisBaseUrl(defaultUrl);
                  syncConfigToServer({ lunasQrisBaseUrl: defaultUrl });
                  showToast('Base URL LunasQRIS dikembalikan ke default!');
                }}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
              >
                Reset ke Default
              </button>
            )}
          </div>
          <div className="relative flex rounded-lg border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none">
              URL
            </div>
            <input
              type="text"
              value={lunasQrisBaseUrl}
              onChange={(e) => {
                const val = e.target.value;
                setLunasQrisBaseUrl(val);
                syncConfigToServer({ lunasQrisBaseUrl: val });
              }}
              placeholder="https://lunasqris.com"
              className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Default resmi sesuai dokumentasi LunasQRIS API:{' '}
            <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">
              https://lunasqris.com
            </code>
          </p>
        </div>

        {/* Kolom 4: Webhook / Callback Endpoint URL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Webhook / Callback URL Server Bot
            </span>
            <span className="text-[10px] text-slate-500">Pasang di Dashboard LunasQRIS</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all overflow-x-auto whitespace-nowrap">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Salin tautan ini dan masukkan ke pengaturan <strong>Webhook URL</strong> di dashboard LunasQRIS toko Anda untuk menerima notifikasi pembayaran lunas instan.
          </p>
        </div>

        {/* Kotak Fitur & Informasi LunasQRIS */}
        <div className="rounded-xl bg-emerald-50/40 border border-emerald-200/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <QrCode className="w-4 h-4 text-emerald-600" />
            Fitur Utama Payment Gateway LunasQRIS:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                DANA Bisnis QRIS
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mendukung Fee Gateway otomatis (+unique_code), menerima pembayaran dari seluruh e-Wallet dan Mobile Banking.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Polling & Webhook
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dilengkapi auto-polling berkala tiap 4 detik dan webhook real-time dengan verifikasi signature HMAC-SHA256.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Privacy-First (DM)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Invoice QRIS, link web checkout, dan kredensial akun digital dikirimkan eksklusif ke chat pribadi pembeli (DM).
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-emerald-200/60">
            <span>
              Format Autentikasi: <code className="font-mono text-slate-700">X-API-Key: pk_...</code> &amp;{' '}
              <code className="font-mono text-slate-700">Secret: sk_...</code>
            </span>
            <span className="text-emerald-700 font-medium">LunasQRIS Engine Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
