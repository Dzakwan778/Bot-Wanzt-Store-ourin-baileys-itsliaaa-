import React from 'react';
import {
  Store,
  BadgeCheck,
  User,
  Phone as PhoneIcon,
  Globe,
  Sparkles,
  Save,
  RefreshCw,
} from 'lucide-react';
import { StoreInfoConfig } from '../../types/dashboard.types';

interface TabStoreInfoProps {
  storeInfo: StoreInfoConfig;
  setStoreInfo: (val: StoreInfoConfig) => void;
  isSavingConfig: boolean;
  onSave: () => void;
  showToast: (msg: string) => void;
}

export const TabStoreInfo: React.FC<TabStoreInfoProps> = ({
  storeInfo,
  setStoreInfo,
  isSavingConfig,
  onSave,
  showToast,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Store Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Pengaturan Informasi Toko (Store Info)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur identitas toko, kontak owner, admin, dan tautan resmi. Data ini disimpan terpisah di{' '}
            <code className="font-mono text-sky-700 bg-sky-50 px-1 py-0.5 rounded border border-sky-200">
              database/store_info.json
            </code>{' '}
            dan dapat dipanggil dinamis menggunakan placeholder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5" />
            Multi-File DB Active
          </span>
        </div>
      </div>

      {/* Form Grid: Data Wajib & Data Opsional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kolom Kiri: Form Wajib */}
        <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Informasi Utama Toko (Wajib)
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              REQUIRED
            </span>
          </div>

          {/* Nama Store */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-sky-600" />
                Nama Store <span className="text-rose-500">*</span>
              </span>
              <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{storeName}'}</code>
            </label>
            <input
              type="text"
              value={storeInfo.storeName}
              onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
              placeholder="Contoh: Acumalaka Store"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">Nama resmi toko/brand yang akan ditampilkan ke pelanggan.</p>
          </div>

          {/* Nama Owner */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Nama Owner <span className="text-rose-500">*</span>
              </span>
              <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{ownerName}'}</code>
            </label>
            <input
              type="text"
              value={storeInfo.ownerName}
              onChange={(e) => setStoreInfo({ ...storeInfo, ownerName: e.target.value })}
              placeholder="Contoh: Udin"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">Nama pemilik atau penanggung jawab toko.</p>
          </div>

          {/* Nomor WhatsApp Owner */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-sky-600" />
                Nomor WhatsApp Owner <span className="text-rose-500">*</span>
              </span>
              <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{ownerNumber}'}</code>
            </label>
            <input
              type="text"
              value={storeInfo.ownerNumber}
              onChange={(e) => setStoreInfo({ ...storeInfo, ownerNumber: e.target.value })}
              placeholder="Contoh: 6281234567890"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">Nomor WhatsApp owner (diawali kode negara 62 atau 08).</p>
          </div>
        </div>

        {/* Kolom Kanan: Form Opsional */}
        <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Kontak & Tautan Pendukung (Opsional)
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300">
              OPTIONAL
            </span>
          </div>

          {/* Nama & Nomor Admin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="truncate">Nama Admin</span>
                <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{adminName}'}</code>
              </label>
              <input
                type="text"
                value={storeInfo.adminName || ''}
                onChange={(e) => setStoreInfo({ ...storeInfo, adminName: e.target.value })}
                placeholder="Yudi Admin"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="truncate">Nomor Admin</span>
                <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{adminNumber}'}</code>
              </label>
              <input
                type="text"
                value={storeInfo.adminNumber || ''}
                onChange={(e) => setStoreInfo({ ...storeInfo, adminNumber: e.target.value })}
                placeholder="628234567890"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Link Website */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                Link Website Store
              </span>
              <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{webLink}'}</code>
            </label>
            <input
              type="text"
              value={storeInfo.webLink || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, webLink: e.target.value })}
              placeholder="https://xaviera.com"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
            />
          </div>

          {/* Bot Telegram & Saluran WA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="truncate">Bot Telegram</span>
                <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{telegramBot}'}</code>
              </label>
              <input
                type="text"
                value={storeInfo.telegramBot || ''}
                onChange={(e) => setStoreInfo({ ...storeInfo, telegramBot: e.target.value })}
                placeholder="@anustore_bot"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="truncate">Link Saluran WA</span>
                <code className="text-[10px] font-mono text-sky-700 bg-sky-100/70 px-1 rounded">{'{waLink}'}</code>
              </label>
              <input
                type="text"
                value={storeInfo.waLink || ''}
                onChange={(e) => setStoreInfo({ ...storeInfo, waLink: e.target.value })}
                placeholder="https://whatsapp.com/channel/..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Kartu Identitas Toko & Daftar Placeholder */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Pratinjau Identitas Toko & Panduan Placeholder
          </span>
          <span className="text-[10px] font-mono font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded border border-sky-200">
            Live Store Profile
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Store & Owner</span>
            <div className="font-bold text-sm text-slate-900">{storeInfo.storeName || '-'}</div>
            <div className="text-xs text-slate-600">
              Owner: <span className="font-semibold text-slate-800">{storeInfo.ownerName || '-'}</span> ({storeInfo.ownerNumber || '-'})
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Customer Service / Admin</span>
            <div className="font-bold text-sm text-slate-900">{storeInfo.adminName || 'Admin Store'}</div>
            <div className="text-xs text-slate-600 font-mono">{storeInfo.adminNumber || 'Belum diisi'}</div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Website & Channels</span>
            <div className="text-xs text-sky-700 font-mono truncate">{storeInfo.webLink || 'Belum diisi'}</div>
            <div className="text-[11px] text-slate-500 truncate">Saluran: {storeInfo.waLink || '-'}</div>
          </div>
        </div>

        {/* Baris Cheat Sheet Placeholder */}
        <div className="pt-2 border-t border-slate-200">
          <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
            Klik untuk menyalin tag placeholder ke clipboard:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { tag: '{storeName}', label: 'Nama Store' },
              { tag: '{ownerName}', label: 'Nama Owner' },
              { tag: '{ownerNumber}', label: 'No. Owner' },
              { tag: '{adminName}', label: 'Nama Admin' },
              { tag: '{adminNumber}', label: 'No. Admin' },
              { tag: '{webLink}', label: 'Website' },
              { tag: '{waLink}', label: 'Saluran WA' },
              { tag: '{telegramBot}', label: 'Bot Telegram' },
            ].map((ph) => (
              <button
                key={ph.tag}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(ph.tag);
                  showToast(`Placeholder ${ph.tag} disalin ke clipboard!`);
                }}
                className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 hover:border-sky-300 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title={`Salin ${ph.tag} (${ph.label})`}
              >
                <code>{ph.tag}</code>
                <span className="text-[10px] text-slate-400">({ph.label})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tombol Simpan Store Info */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isSavingConfig}
          onClick={onSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {isSavingConfig ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Informasi Toko
        </button>
      </div>
    </div>
  );
};
