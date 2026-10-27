import React, { FormEvent } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  Square,
  RotateCcw,
  KeyRound,
  Check,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { BotStatusResponse } from '../../types/dashboard.types';

interface WhatsAppConnectionPanelProps {
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
}

export const WhatsAppConnectionPanel: React.FC<WhatsAppConnectionPanelProps> = ({
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
}) => {
  const trimmedCode = customCode.trim().toUpperCase();
  const isEmpty = trimmedCode.length === 0;
  const hasSymbol = /[^A-Z0-9]/.test(trimmedCode);
  const isExact8Chars = trimmedCode.length === 8;
  const isValidCode = !isEmpty && !hasSymbol && isExact8Chars;

  return (
    <div className="space-y-6">
      {/* Kartu Form Koneksi */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-sm text-slate-900">WhatsApp Connection</h2>
          </div>
          {botData.hasSession && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sesi Tersimpan
            </span>
          )}
        </div>

        <form onSubmit={onStartPairing} className="space-y-4">
          {/* Input Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nomor WhatsApp Target
            </label>
            <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3 py-2.5 flex items-center gap-1 border-r border-slate-200 text-slate-700 text-xs font-mono font-semibold select-none">
                <span>🇮🇩</span>
                <span>+62</span>
              </div>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="857xxxxxxxx"
                disabled={loading || botData.status === 'connected'}
                className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Masukkan nomor tanpa angka 0 di depan (contoh: 81234567890).
            </p>
          </div>

          {/* Input Custom Pairing Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Custom Pairing Code <span className="text-rose-500 font-bold">*Wajib Diisi</span>
              </label>
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border transition-colors ${
                  isEmpty
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : hasSymbol
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : isExact8Chars
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {hasSymbol ? 'Simbol Terdeteksi' : `${trimmedCode.length}/8 Karakter`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={8}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="Contoh: 12AB34CD"
                disabled={loading || botData.status === 'connected'}
                className={`w-full rounded-lg px-3 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 uppercase transition shadow-2xs border ${
                  hasSymbol
                    ? 'bg-rose-50/30 border-rose-400 text-rose-900 focus:bg-white focus:border-rose-600 focus:ring-rose-500/20'
                    : isExact8Chars
                    ? 'bg-emerald-50/20 border-emerald-400 text-emerald-900 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    : isEmpty
                    ? 'bg-slate-50 border-amber-300 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-amber-500/20'
                    : 'bg-slate-50 border-slate-300 text-sky-800 focus:bg-white focus:border-sky-600 focus:ring-sky-600/20'
                }`}
              />
              <span
                className={`text-xs px-2.5 py-2 rounded-lg border font-mono font-medium shrink-0 ${
                  isExact8Chars && !hasSymbol
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                8 Chars
              </span>
            </div>

            {/* Pesan Validasi Status Form Pairing Code */}
            <div className="mt-2 space-y-1">
              {isEmpty && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-800 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Form Pairing Code Belum Diisi</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Kolom ini wajib diisi untuk melakukan koneksi ke WhatsApp. Masukkan 8 karakter alfanumerik (hanya angka dan huruf saja, tanpa simbol).
                    </p>
                  </div>
                </div>
              )}

              {hasSymbol && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-900">Custom Pairing Code Tidak Sesuai</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Dilarang menggunakan simbol atau spasi! Syarat utamanya adalah hanya boleh terdiri dari kombinasi <strong>angka (0-9)</strong> dan <strong>huruf (A-Z)</strong> saja.
                    </p>
                  </div>
                </div>
              )}

              {!isEmpty && !hasSymbol && !isExact8Chars && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-900">Panjang Karakter Belum Sesuai</p>
                    <p className="text-[11px] text-sky-700 mt-0.5 leading-relaxed">
                      Syarat utamanya adalah wajib tepat <strong>8 karakter</strong> alfanumerik. Saat ini baru {trimmedCode.length} karakter (kurang {8 - trimmedCode.length} karakter lagi).
                    </p>
                  </div>
                </div>
              )}

              {isValidCode && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900">Format Pairing Code Sesuai</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Kode <span className="font-mono font-bold tracking-wider">{trimmedCode}</span> telah memenuhi syarat (8 karakter angka dan huruf tanpa simbol). Siap digunakan untuk koneksi.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={
                loading ||
                botData.status === 'connecting' ||
                botData.status === 'connected' ||
                !isValidCode
              }
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
                botData.status === 'connected'
                  ? 'bg-emerald-600 text-white cursor-default opacity-90 shadow-xs'
                  : loading || botData.status === 'connecting'
                  ? 'bg-sky-600 text-white opacity-70 cursor-wait shadow-xs'
                  : !isValidCode
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed select-none shadow-none'
                  : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer active:scale-[0.99] shadow-xs'
              }`}
            >
              {loading || botData.status === 'connecting' ? (
                <Clock className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Play
                  className={`w-4 h-4 fill-current ${
                    !isValidCode && botData.status !== 'connected' ? 'text-slate-400' : 'text-white'
                  }`}
                />
              )}
              {botData.status === 'connected'
                ? 'WhatsApp Bot Telah Terhubung'
                : loading || botData.status === 'connecting'
                ? 'Menghubungkan...'
                : isEmpty
                ? 'Minta Kode Pairing (Wajib Isi Kode)'
                : hasSymbol
                ? 'Minta Kode Pairing (Dilarang Simbol)'
                : !isExact8Chars
                ? `Minta Kode Pairing (${trimmedCode.length}/8 Karakter)`
                : `Minta Kode Pairing (${trimmedCode})`}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStop}
                disabled={loading || botData.status === 'idle'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-300 text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5 fill-current text-slate-500" />
                Putuskan
              </button>
              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 active:scale-[0.99] border border-slate-300 text-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Sesi
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Display Box Kode Pairing */}
      {(botData.pairingCode || botData.status === 'code_ready' || botData.status === 'waiting_code') && (
        <div className="bg-white border-2 border-sky-600/30 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-sky-600" />
              Kode Pairing Tersedia
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Status: {botData.status}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center space-y-3">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Ketik kode ini di aplikasi WhatsApp ponsel Anda:
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-widest text-slate-900 select-all py-1">
              {botData.pairingCode || customCode || '-'}
            </div>
            <button
              onClick={onCopyCode}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin ke Clipboard!' : 'Salin Kode Pairing'}
            </button>
          </div>

          {/* Panduan 4 Langkah di HP */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Panduan Memasukkan Kode di WhatsApp HP:
            </div>
            <ol className="space-y-1.5 list-decimal list-inside leading-relaxed text-slate-600">
              <li>Buka aplikasi WhatsApp di smartphone Anda.</li>
              <li>
                Buka menu <strong className="text-slate-800 font-medium">Titik 3</strong> (Android) atau <strong className="text-slate-800 font-medium">Pengaturan</strong> (iOS).
              </li>
              <li>
                Pilih <strong className="text-sky-700 font-semibold">Perangkat Tertaut</strong> &gt; <strong className="text-slate-800 font-medium">Tautkan Perangkat</strong>.
              </li>
              <li>
                Ketuk tautan teks di bawah scanner:{' '}
                <strong className="text-sky-700 font-semibold">&quot;Tautkan dengan nomor telepon saja&quot;</strong>.
              </li>
              <li>
                Ketikkan 8 karakter kode:{' '}
                <strong className="font-mono text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  {botData.pairingCode || customCode || '-'}
                </strong>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Info Bot Ketika Connected */}
      {botData.status === 'connected' && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Bot WhatsApp Aktif &amp; Terhubung
          </div>
          <p className="text-slate-600">
            Nomor Bot: <span className="font-mono font-semibold text-slate-900">+{botData.phoneNumber}</span>
          </p>
          <p className="text-slate-600">
            ID JID: <span className="font-mono text-[11px] text-slate-700">{botData.user?.id || 'Connected'}</span>
          </p>
        </div>
      )}
    </div>
  );
};
