import React, { FormEvent, useState, useEffect } from 'react';
import {
  Smartphone,
  AlertCircle,
  Play,
  Clock,
  Square,
  RotateCcw,
  KeyRound,
  Check,
  Copy,
  ShieldCheck,
  Wifi,
  Terminal,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BotStatusResponse } from '../../types/dashboard.types';
import { LiveTerminal } from '../terminal/LiveTerminal';

interface TabConnectionDedicatedProps {
  botData: BotStatusResponse;
  phone: string;
  setPhone: (val: string) => void;
  customCode: string;
  setCustomCode: (val: string) => void;
  loading: boolean;
  copied: boolean;
  onStartPairing: (e: FormEvent) => void;
  onStop: () => void;
  onReset: () => void;
  onCopyCode: () => void;
  isStoreInfoComplete?: boolean;
  showToast: (msg: string) => void;
}

export const TabConnectionDedicated: React.FC<TabConnectionDedicatedProps> = ({
  botData,
  phone,
  setPhone,
  customCode,
  setCustomCode,
  loading,
  copied,
  onStartPairing,
  onStop,
  onReset,
  onCopyCode,
  isStoreInfoComplete = true,
  showToast,
}) => {
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: '',
    chatId: '',
    notifEnabled: false,
    adminDisabled: false,
    isConfigured: false,
  });
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [showPairingGuide, setShowPairingGuide] = useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);

  useEffect(() => {
    fetch('/api/bot/telegram/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setTelegramConfig(data.config);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try {
      const res = await fetch('/api/bot/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          notifEnabled: telegramConfig.notifEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramConfig(data.config);
        showToast('Pengaturan notifikasi Telegram berhasil disimpan!');
      } else {
        showToast('Gagal menyimpan Telegram: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      showToast('Isi Bot Token dan Chat ID Telegram terlebih dahulu!');
      return;
    }
    setIsTestingTelegram(true);
    try {
      const res = await fetch('/api/bot/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pesan tes berhasil terkirim ke Telegram!');
      } else {
        showToast('Gagal tes Telegram: ' + (data.error || 'Periksa token & chat ID'));
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const trimmedCode = customCode.trim().toUpperCase();
  const isEmpty = trimmedCode.length === 0;
  const hasSymbol = /[^A-Z0-9]/.test(trimmedCode);
  const isExact8Chars = trimmedCode.length === 8;
  const isValidCode = !isEmpty && !hasSymbol && isExact8Chars;

  const getStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return {
          title: 'Bot Terhubung',
          desc: 'Bot aktif melayani pesan WhatsApp.',
          card: 'bg-emerald-50/50 border-emerald-200 text-emerald-900',
          dot: 'bg-emerald-500',
        };
      case 'waiting_code':
      case 'code_ready':
        return {
          title: 'Menunggu Pairing Code',
          desc: 'Masukkan kode pairing ke WhatsApp ponsel.',
          card: 'bg-sky-50/60 border-sky-200 text-slate-900',
          dot: 'bg-[#0084D1]',
        };
      case 'connecting':
        return {
          title: 'Menghubungkan...',
          desc: 'Membuat sesi ke server WhatsApp.',
          card: 'bg-white border-slate-200/90 text-slate-900',
          dot: 'bg-[#0084D1]',
        };
      case 'error':
        return {
          title: 'Koneksi Error',
          desc: 'Coba reset sesi lalu hubungkan ulang.',
          card: 'bg-rose-50/60 border-rose-200 text-rose-900',
          dot: 'bg-rose-500',
        };
      default:
        return {
          title: 'Bot Belum Terhubung',
          desc: 'Isi nomor WhatsApp dan kode pairing di bawah.',
          card: 'bg-white border-slate-200/90 text-slate-900',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const isSuspended = botData.accountStatus === 'suspended';
  const isExpired = botData.accountStatus === 'expired';
  const isAccountBlocked = isSuspended || isExpired;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Peringatan Akun Ditangguhkan */}
      {isSuspended && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-rose-900">Akses Bot Diblokir</strong>
            Akun ditangguhkan oleh Master Admin. Koneksi bot dinonaktifkan.
          </div>
        </div>
      )}

      {/* Peringatan Masa Sewa Habis */}
      {isExpired && (
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-slate-900">Masa Sewa Berakhir</strong>
            Perpanjang masa aktif lewat token di menu Management Bot untuk menghubungkan kembali.
          </div>
        </div>
      )}

      {/* 1. STATUS KONEKSI RINGKAS */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xs transition-colors ${statusInfo.card}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
              <Wifi className={`w-4 h-4 ${botData.status === 'connected' ? 'text-emerald-600' : 'text-[#0084D1]'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dot}`} />
                <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate">{statusInfo.title}</h3>
                {botData.hasSession && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    Sesi Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{statusInfo.desc}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {botData.phoneNumber && (
              <span className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                +{botData.phoneNumber}
              </span>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={loading || isAccountBlocked}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 whitespace-nowrap ${
                isAccountBlocked
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer active:scale-95 shadow-2xs'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sesi</span>
            </button>
            {botData.status === 'connected' && (
              <button
                type="button"
                onClick={onStop}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Putuskan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FORM PAIRING & KODE PAIRING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Form Input Nomor & Custom Pairing Code */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-4 h-4 text-[#0084D1] shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
                Hubungkan WhatsApp Bot
              </h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">
              Pairing Code
            </span>
          </div>

          <form onSubmit={onStartPairing} className="space-y-4">
            {/* Nomor WhatsApp Bot */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Nomor WhatsApp Bot
              </label>
              <div className="flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden">
                <span className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none shrink-0">
                  +62
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="81234567890"
                  disabled={loading || botData.status === 'connected'}
                  className="w-full px-3 py-2.5 text-sm sm:text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none min-w-0"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Masukkan tanpa angka 0 di depan.
              </p>
            </div>

            {/* Custom Pairing Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Custom Pairing Code
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 transition-colors ${
                    hasSymbol
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isExact8Chars
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : trimmedCode.length > 0
                      ? 'bg-sky-50 text-[#0084D1] border-sky-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {hasSymbol ? 'Hapus simbol' : `${trimmedCode.length}/8`}
                </span>
              </div>

              <input
                type="text"
                maxLength={8}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="Contoh: 12AB34CD"
                disabled={loading || botData.status === 'connected'}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 uppercase transition border ${
                  hasSymbol
                    ? 'bg-rose-50/30 border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
                    : isExact8Chars
                    ? 'bg-emerald-50/20 border-emerald-400 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-[#0084D1] focus:ring-[#0084D1]/20'
                }`}
              />

              <p
                className={`text-[11px] ${
                  hasSymbol
                    ? 'text-rose-600 font-medium'
                    : isValidCode
                    ? 'text-emerald-600 font-medium'
                    : 'text-slate-400'
                }`}
              >
                {hasSymbol
                  ? 'Gunakan huruf & angka saja (A-Z, 0-9), tanpa simbol atau spasi.'
                  : isValidCode
                  ? 'Kode pairing 8 karakter siap digunakan.'
                  : 'Wajib 8 karakter huruf/angka (A-Z, 0-9) tanpa simbol.'}
              </p>
            </div>

            {/* Tombol Minta Kode Pairing */}
            <button
              type="submit"
              disabled={
                loading ||
                botData.status === 'connecting' ||
                botData.status === 'connected' ||
                !isValidCode ||
                !isStoreInfoComplete ||
                isAccountBlocked
              }
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                isSuspended
                  ? 'bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed'
                  : isExpired
                  ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                  : botData.status === 'connected'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : loading || botData.status === 'connecting'
                  ? 'bg-[#0084D1] text-white opacity-75 cursor-wait'
                  : !isValidCode || !isStoreInfoComplete
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-[#0084D1] hover:bg-[#0073B7] text-white cursor-pointer active:scale-[0.98] shadow-xs'
              }`}
            >
              {loading || botData.status === 'connecting' ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>
                {isSuspended
                  ? 'Akun Ditangguhkan'
                  : isExpired
                  ? 'Masa Sewa Habis'
                  : botData.status === 'connected'
                  ? 'WhatsApp Bot Terhubung'
                  : loading || botData.status === 'connecting'
                  ? 'Menghubungkan...'
                  : isValidCode && isStoreInfoComplete
                  ? `Minta Kode Pairing (${trimmedCode})`
                  : 'Minta Kode Pairing'}
              </span>
            </button>
            {botData.status !== 'connected' && !isStoreInfoComplete && !isAccountBlocked && (
              <p className="text-[11px] text-slate-500 text-center">
                Lengkapi seluruh Identitas Utama Toko di Info Profil agar dapat meminta kode pairing.
              </p>
            )}
          </form>
        </div>

        {/* Kolom Kanan: Tampilan Pairing Code */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0084D1]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Kode Pairing Bot
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                {botData.pairingCode ? 'Tersedia' : 'Menunggu'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-center space-y-2.5">
              <span className="text-[11px] text-slate-500 block">
                Masukkan kode ini di WhatsApp ponsel Anda:
              </span>
              <div className="text-3xl font-extrabold font-mono tracking-widest text-slate-900 select-all py-0.5">
                {botData.pairingCode || customCode || '--------'}
              </div>
              <button
                type="button"
                onClick={onCopyCode}
                disabled={!botData.pairingCode && !customCode}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-95 text-white text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>

            {/* Panduan Input Ringkas (Collapsible) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPairingGuide((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Panduan Input di WhatsApp</span>
                </span>
                {showPairingGuide ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showPairingGuide && (
                <ol className="mt-2 space-y-1 list-decimal list-inside leading-relaxed text-slate-600 text-[11px] bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <li>Buka aplikasi WhatsApp di ponsel Anda.</li>
                  <li>
                    Buka menu <strong className="text-slate-800">Perangkat Tertaut</strong> &gt;{' '}
                    <strong className="text-slate-800">Tautkan Perangkat</strong>.
                  </li>
                  <li>
                    Pilih <strong className="text-[#0084D1]">&quot;Tautkan dengan nomor telepon saja&quot;</strong>.
                  </li>
                  <li>Masukkan 8 karakter kode pairing di atas.</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. KONEKSI NOTIFIKASI TELEGRAM */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-[#0084D1] border border-sky-100 shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Notifikasi Bot Telegram
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Notifikasi transaksi lunas &amp; batal via Telegram.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={telegramConfig.notifEnabled}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, notifEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0084D1]"></div>
          </label>
        </div>

        {telegramConfig.adminDisabled && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>Notifikasi Telegram sedang dinonaktifkan oleh Master Admin.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between gap-2">
              <span>Bot Token Telegram</span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#0084D1] hover:underline inline-flex items-center gap-0.5 shrink-0"
              >
                @BotFather <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <div className="flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden">
              <input
                type={showBotToken ? 'text' : 'password'}
                value={telegramConfig.botToken}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                placeholder="123456789:ABCdef..."
                className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="px-3 text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
              >
                {showBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between gap-2">
              <span>Telegram Chat ID</span>
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#0084D1] hover:underline inline-flex items-center gap-0.5 shrink-0"
              >
                @userinfobot <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <input
              type="text"
              value={telegramConfig.chatId}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
              placeholder="Contoh: 123456789 atau -100..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Panduan Telegram (Collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowTelegramGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#0084D1]" />
            <span>Cara Setup Telegram</span>
            {showTelegramGuide ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showTelegramGuide && (
            <ol className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl list-decimal list-inside space-y-1 text-[11px] text-slate-600">
              <li>Buat bot lewat @BotFather (<code className="bg-slate-200 px-1 rounded">/newbot</code>) lalu tempel tokennya.</li>
              <li>Kirim <code className="bg-slate-200 px-1 rounded">/start</code> ke bot Anda, lalu cek Chat ID via @userinfobot.</li>
              <li>Klik Tes Kirim Notifikasi sebelum mengaktifkan toggle.</li>
            </ol>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isTestingTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
            onClick={handleTestTelegram}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {isTestingTelegram ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#0084D1]" />
            )}
            <span>Tes Kirim Notifikasi</span>
          </button>

          <button
            type="button"
            disabled={isSavingTelegram}
            onClick={handleSaveTelegram}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold transition shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSavingTelegram ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Simpan Telegram</span>
          </button>
        </div>
      </div>

      {/* 4. LIVE TERMINAL */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#0084D1]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Live Socket Terminal
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Baileys Log
          </span>
        </div>
        <LiveTerminal logs={botData.logs} status={botData.status} />
      </div>
    </div>
  );
};
