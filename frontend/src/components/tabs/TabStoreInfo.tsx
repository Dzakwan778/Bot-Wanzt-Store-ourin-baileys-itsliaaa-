import React, { useState } from 'react';
import {
  Store,
  Save,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { StoreInfoConfig } from '../../types/dashboard.types';
import { toDisplayPhone, toOfficialPhone, formatOfficialDisplay } from '../../utils/phoneUtils';
import { validateStoreInfoSubmission } from '../../utils/storeInfoValidation';

interface TabStoreInfoProps {
  storeInfo: StoreInfoConfig;
  setStoreInfo: (val: StoreInfoConfig) => void;
  isSavingConfig: boolean;
  onSave: (data?: StoreInfoConfig) => Promise<boolean> | boolean | void;
  showToast: (msg: string) => void;
}

export const TabStoreInfo: React.FC<TabStoreInfoProps> = ({
  storeInfo,
  setStoreInfo,
  isSavingConfig,
  onSave,
  showToast,
}) => {
  const [formData, setFormData] = useState<StoreInfoConfig>(storeInfo);
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (storeInfo) setFormData(storeInfo);
  }, [storeInfo]);

  const handleFieldChange = (patch: Partial<StoreInfoConfig>) => {
    const next = { ...formData, ...patch };
    setFormData(next);
    setStoreInfo(next);
    if (formError) setFormError(null);
  };

  const handleSave = async () => {
    const validation = validateStoreInfoSubmission(formData);
    if (!validation.valid || !validation.normalized) {
      const msg =
        validation.error ||
        'Konfigurasi gagal disimpan: Nama Toko, Nama Owner, dan WhatsApp Owner wajib diisi.';
      setFormError(msg);
      showToast(msg);
      return;
    }

    const ok = await onSave(validation.normalized);
    if (ok !== false) {
      setFormError(null);
      setFormData(validation.normalized);
      showToast('Informasi profil toko berhasil disimpan!');
    } else {
      setFormError('Konfigurasi gagal disimpan ke server. Perubahan belum diterapkan.');
    }
  };

  const isRequiredComplete = Boolean(
    formData.storeName?.trim() &&
    formData.ownerName?.trim() &&
    formData.ownerNumber?.trim()
  );

  const PreviewCard = (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900">
            Pratinjau Pesan WhatsApp
          </h3>
        </div>
        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Live
        </span>
      </div>

      <div className="bg-[#EFEAE2] p-3 rounded-xl border border-slate-200">
        <div className="bg-white rounded-xl rounded-tl-xs p-3 text-xs space-y-2 text-slate-800 shadow-2xs leading-relaxed">
          <p className="font-semibold text-slate-900">
            Halo Kak! Selamat datang di{' '}
            <span className="text-[#0084D1] font-bold">
              {formData.storeName || '[Nama Store]'}
            </span>
            .
          </p>
          <p className="text-[11px] text-slate-600">
            Silakan pilih menu katalog akun premium, layanan SMM, atau top up game yang tersedia.
          </p>

          <div className="pt-2 border-t border-slate-100 space-y-1 font-mono text-[10px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Owner:</span>
              <span>{formData.ownerName || '-'}</span>
            </div>
            {formData.ownerNumber && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Kontak:</span>
                <span>{formatOfficialDisplay(formData.ownerNumber)}</span>
              </div>
            )}
            {formData.adminName && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">CS Admin:</span>
                <span>{formData.adminName}</span>
              </div>
            )}
            {formData.webLink && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Website:</span>
                <span className="text-[#0084D1] truncate max-w-[160px]">
                  {formData.webLink}
                </span>
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-400 text-right pt-0.5">
            12:00 ✓✓
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Peringatan singkat hanya muncul bila data wajib belum lengkap */}
      {!isRequiredComplete && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2">
          <Store className="w-4 h-4 text-[#0084D1] shrink-0" />
          <span>
            Lengkapi kolom bertanda <span className="text-rose-500 font-bold">*</span> agar profil toko aktif.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* KOLOM KIRI: FORMULIR RINGKAS */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* SEKSI 1: IDENTITAS UTAMA */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Identitas Toko
              </h3>
              <span className="text-[11px] text-slate-400">
                <span className="text-rose-500">*</span> Wajib
              </span>
            </div>

            {/* Nama Toko */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <span>Nama Toko / Brand</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.storeName || ''}
                onChange={(e) => handleFieldChange({ storeName: e.target.value })}
                placeholder="Contoh: Wanzt Store Digital"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
              />
            </div>

            {/* Nama Owner & WhatsApp Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <span>Nama Pemilik (Owner)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerName || ''}
                  onChange={(e) => handleFieldChange({ ownerName: e.target.value })}
                  placeholder="Contoh: Ridwan"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <span>WhatsApp Owner</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden">
                  <span className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none shrink-0">
                    +62
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={toDisplayPhone(formData.ownerNumber)}
                    onChange={(e) => {
                      const cleanDisplay = toDisplayPhone(e.target.value);
                      handleFieldChange({
                        ownerNumber: cleanDisplay ? toOfficialPhone(cleanDisplay) : '',
                      });
                    }}
                    placeholder="81234567890"
                    className="w-full px-3 py-2.5 text-sm sm:text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none min-w-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI 2: CUSTOMER SERVICE & ADMIN */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Customer Service &amp; Admin
              </h3>
              <span className="text-[11px] text-slate-400">Opsional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">Nama Admin / CS</label>
                <input
                  type="text"
                  value={formData.adminName || ''}
                  onChange={(e) => handleFieldChange({ adminName: e.target.value })}
                  placeholder="Contoh: CS Ramah"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">WhatsApp Admin CS</label>
                <div className="flex rounded-xl border border-slate-300 focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 transition bg-white overflow-hidden">
                  <span className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none shrink-0">
                    +62
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={toDisplayPhone(formData.adminNumber)}
                    onChange={(e) => {
                      const cleanDisplay = toDisplayPhone(e.target.value);
                      handleFieldChange({
                        adminNumber: cleanDisplay ? toOfficialPhone(cleanDisplay) : '',
                      });
                    }}
                    placeholder="82345678901"
                    className="w-full px-3 py-2.5 text-sm sm:text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none min-w-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI 3: WEBSITE & SALURAN */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Website &amp; Saluran
              </h3>
              <span className="text-[11px] text-slate-400">Opsional</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">Website Toko</label>
              <input
                type="url"
                value={formData.webLink || ''}
                onChange={(e) => handleFieldChange({ webLink: e.target.value })}
                placeholder="https://tokoanda.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">Saluran WhatsApp</label>
                <input
                  type="url"
                  value={formData.waLink || ''}
                  onChange={(e) => handleFieldChange({ waLink: e.target.value })}
                  placeholder="https://whatsapp.com/channel/..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">Bot Telegram</label>
                <input
                  type="text"
                  value={formData.telegramBot || ''}
                  onChange={(e) => handleFieldChange({ telegramBot: e.target.value })}
                  placeholder="@namastore_bot"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Toggle Pratinjau khusus Mobile (< lg) */}
          <div className="lg:hidden space-y-3">
            <button
              type="button"
              onClick={() => setShowMobilePreview((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pratinjau Pesan WhatsApp</span>
              </span>
              {showMobilePreview ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showMobilePreview && PreviewCard}
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Tombol Simpan */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isSavingConfig}
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Informasi Toko</span>
            </button>
          </div>
        </div>

        {/* KOLOM KANAN DESKTOP (>= lg): PRATINJAU WHATSAPP */}
        <div className="hidden lg:block lg:col-span-5">
          {PreviewCard}
        </div>
      </div>
    </div>
  );
};
