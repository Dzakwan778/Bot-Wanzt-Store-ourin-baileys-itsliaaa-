import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  QrCode,
  Lock,
  Copy,
  Check,
  Server,
  Zap,
  Save,
} from 'lucide-react';

interface TabKoneksiLayananProps {
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
  syncConfigToServer: (config: any) => void;
  showToast: (msg: string) => void;
}

export const TabKoneksiLayanan: React.FC<TabKoneksiLayananProps> = ({
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
  // Local draft states (no auto-save on typing)
  const [localXavieraKey, setLocalXavieraKey] = useState<string>(xavieraApiKey || '');
  const [localXavieraBaseUrl, setLocalXavieraBaseUrl] = useState<string>(
    xavieraBaseUrl || 'https://xavierastore.com/api/v1'
  );

  const [localLunasKey, setLocalLunasKey] = useState<string>(lunasQrisApiKey || '');
  const [localLunasSecret, setLocalLunasSecret] = useState<string>(lunasQrisSecretKey || '');
  const [localLunasBaseUrl, setLocalLunasBaseUrl] = useState<string>(
    lunasQrisBaseUrl || 'https://lunasqris.com'
  );

  const [savingXaviera, setSavingXaviera] = useState<boolean>(false);
  const [savingLunas, setSavingLunas] = useState<boolean>(false);

  // Sync from props on initial load or external update
  useEffect(() => {
    setLocalXavieraKey(xavieraApiKey || '');
  }, [xavieraApiKey]);

  useEffect(() => {
    if (xavieraBaseUrl) setLocalXavieraBaseUrl(xavieraBaseUrl);
  }, [xavieraBaseUrl]);

  useEffect(() => {
    setLocalLunasKey(lunasQrisApiKey || '');
  }, [lunasQrisApiKey]);

  useEffect(() => {
    setLocalLunasSecret(lunasQrisSecretKey || '');
  }, [lunasQrisSecretKey]);

  useEffect(() => {
    if (lunasQrisBaseUrl) setLocalLunasBaseUrl(lunasQrisBaseUrl);
  }, [lunasQrisBaseUrl]);

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
    showToast('URL Webhook LunasQRIS berhasil disalin');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCheckLunasBalance = async () => {
    const keyToCheck = localLunasKey?.trim();
    if (!keyToCheck) {
      showToast('Silakan masukkan API Key LunasQRIS terlebih dahulu.');
      return;
    }
    setLunasBalance((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(
        `/api/lunasqris/balance?apikey=${encodeURIComponent(
          keyToCheck
        )}&baseurl=${encodeURIComponent(localLunasBaseUrl || 'https://lunasqris.com')}`
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
        showToast(
          `Saldo LunasQRIS: Rp ${Number(data.balance || 0).toLocaleString('id-ID')}`
        );
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

  const handleSaveXaviera = async () => {
    setSavingXaviera(true);
    try {
      setXavieraApiKey(localXavieraKey);
      setXavieraBaseUrl(localXavieraBaseUrl);
      await syncConfigToServer({
        xavieraApiKey: localXavieraKey,
        xavieraBaseUrl: localXavieraBaseUrl,
      });
      showToast('Konfigurasi Xaviera berhasil disimpan!');
    } catch {
      showToast('Gagal menyimpan konfigurasi Xaviera');
    } finally {
      setSavingXaviera(false);
    }
  };

  const handleSaveLunasQris = async () => {
    setSavingLunas(true);
    try {
      setLunasQrisApiKey(localLunasKey);
      setLunasQrisSecretKey(localLunasSecret);
      setLunasQrisBaseUrl(localLunasBaseUrl);
      await syncConfigToServer({
        lunasQrisApiKey: localLunasKey,
        lunasQrisSecretKey: localLunasSecret,
        lunasQrisBaseUrl: localLunasBaseUrl,
      });
      showToast('Konfigurasi LunasQRIS berhasil disimpan!');
    } catch {
      showToast('Gagal menyimpan konfigurasi LunasQRIS');
    } finally {
      setSavingLunas(false);
    }
  };

  const isXavieraConnected = Boolean(localXavieraKey?.trim());
  const isLunasConnected = Boolean(localLunasKey?.trim());

  return (
    <div className="space-y-6">
      {/* Header Minimalis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Koneksi Layanan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi API Xaviera Store dan Payment Gateway LunasQRIS.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Perubahan hanya tersimpan saat menekan tombol Simpan.
        </div>
      </div>

      {/* 1. SEKSI XAVIERA STORE API */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-[#0084D1] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Xaviera Store API
              </h3>
              <p className="text-[11px] text-slate-500">
                Penyedia katalog produk akun premium, SMM, dan top up.
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isXavieraConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {isXavieraConnected ? 'Terhubung' : 'Belum Terisi'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>API Key Xaviera</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3 py-2 flex items-center text-slate-400 border-r border-slate-200">
                <KeyRound className="w-4 h-4 text-[#0084D1]" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={localXavieraKey}
                onChange={(e) => setLocalXavieraKey(e.target.value)}
                placeholder="xvs_..."
                className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
                title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Base URL
              </label>
              {localXavieraBaseUrl !== 'https://xavierastore.com/api/v1' && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalXavieraBaseUrl('https://xavierastore.com/api/v1');
                    showToast('Base URL direset ke default');
                  }}
                  className="text-[10px] text-[#0084D1] hover:underline cursor-pointer font-medium"
                >
                  Reset Default
                </button>
              )}
            </div>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3 py-2 flex items-center text-slate-500 border-r border-slate-200 text-xs font-mono select-none">
                URL
              </div>
              <input
                type="text"
                value={localXavieraBaseUrl}
                onChange={(e) => setLocalXavieraBaseUrl(e.target.value)}
                placeholder="https://xavierastore.com/api/v1"
                className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tombol Simpan Xaviera */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            disabled={savingXaviera || isSavingConfig}
            onClick={handleSaveXaviera}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {savingXaviera || isSavingConfig ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* 2. SEKSI LUNASQRIS PAYMENT GATEWAY */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                LunasQRIS Payment Gateway
              </h3>
              <p className="text-[11px] text-slate-500">
                Pembuatan QRIS otomatis dan mutasi instan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckLunasBalance}
              disabled={lunasBalance.loading || !localLunasKey?.trim()}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                localLunasKey?.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {lunasBalance.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              <span>Cek Saldo</span>
            </button>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLunasConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {isLunasConnected ? 'Terhubung' : 'Belum Terisi'}
            </span>
          </div>
        </div>

        {/* Hasil Cek Saldo */}
        {lunasBalance.checked && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              lunasBalance.error
                ? 'bg-rose-50 border-rose-200 text-rose-800 text-xs'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950 text-xs shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {lunasBalance.error
                  ? lunasBalance.error
                  : `Saldo Merchant: Rp ${Number(lunasBalance.balance || 0).toLocaleString(
                      'id-ID'
                    )} (Hold: Rp ${Number(lunasBalance.balanceHold || 0).toLocaleString('id-ID')})`}
              </span>
            </div>
            {!lunasBalance.error && (
              <span className="font-mono font-bold text-sm text-emerald-900">
                Rp {Number(lunasBalance.balance || 0).toLocaleString('id-ID')}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Public Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Public API Key (pk_live_...)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3 py-2 flex items-center text-slate-400 border-r border-slate-200">
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type={showLunasKey ? 'text' : 'password'}
                value={localLunasKey}
                onChange={(e) => setLocalLunasKey(e.target.value)}
                placeholder="pk_live_..."
                className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLunasKey(!showLunasKey)}
                className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
                title={showLunasKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showLunasKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Secret Key (sk_live_...)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3 py-2 flex items-center text-slate-400 border-r border-slate-200">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type={showLunasSecret ? 'text' : 'password'}
                value={localLunasSecret}
                onChange={(e) => setLocalLunasSecret(e.target.value)}
                placeholder="sk_live_..."
                className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLunasSecret(!showLunasSecret)}
                className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
                title={showLunasSecret ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showLunasSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Endpoint */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Webhook Callback URL</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 select-all overflow-x-auto whitespace-nowrap shadow-2xs">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="px-3.5 py-2 bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tombol Simpan LunasQRIS */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            disabled={savingLunas || isSavingConfig}
            onClick={handleSaveLunasQris}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {savingLunas || isSavingConfig ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
