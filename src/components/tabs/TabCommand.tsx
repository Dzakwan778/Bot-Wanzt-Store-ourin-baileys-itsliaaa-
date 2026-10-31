import React from 'react';
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ExternalLink,
  PhoneCall,
  Copy,
  UserCheck,
  Bell,
  BellOff,
  ChevronDown,
} from 'lucide-react';
import { WhatsAppButton, StoreInfoConfig } from '../../types/dashboard.types';

interface TabCommandProps {
  selectedCommand: 'Menu' | 'List' | 'Carousel' | 'Invoice';
  setSelectedCommand: (cmd: 'Menu' | 'List' | 'Carousel' | 'Invoice') => void;
  // Menu Props
  menuOutputText: string;
  setMenuOutputText: (txt: string) => void;
  menuFooterText: string;
  setMenuFooterText: React.Dispatch<React.SetStateAction<string>>;
  includeMedia: boolean;
  setIncludeMedia: (val: boolean) => void;
  selectedPicture: string;
  setSelectedPicture: (pic: string) => void;
  availablePictures: string[];
  setAvailablePictures: (pics: string[]) => void;
  menuButtons: WhatsAppButton[];
  onOpenAddButtonModal: () => void;
  onEditButton: (btn: WhatsAppButton) => void;
  onDeleteButton: (id: string) => void;
  onSaveMenu: () => void;
  // List Props
  listOutputText: string;
  setListOutputText: (txt: string) => void;
  listFooterText: string;
  setListFooterText: React.Dispatch<React.SetStateAction<string>>;
  onSaveList: () => void;
  // Carousel Props
  carouselOutputText: string;
  setCarouselOutputText: (txt: string) => void;
  carouselFooterText: string;
  setCarouselFooterText: React.Dispatch<React.SetStateAction<string>>;
  carouselPicture: string;
  setCarouselPicture: (pic: string) => void;
  onSaveCarousel: () => void;
  // Invoice Props
  invoiceOutputText: string;
  setInvoiceOutputText: (txt: string) => void;
  invoiceFooterText: string;
  setInvoiceFooterText: React.Dispatch<React.SetStateAction<string>>;
  onSaveInvoice: () => void;
  // General Props
  storeInfo: StoreInfoConfig;
  isSavingConfig: boolean;
  showToast: (msg: string) => void;
}

const COMMAND_TABS: Array<{ id: 'Menu' | 'List' | 'Carousel' | 'Invoice'; label: string; desc: string }> = [
  { id: 'Menu', label: 'Menu', desc: 'Respon awal bot' },
  { id: 'List', label: 'List', desc: 'Daftar katalog produk' },
  { id: 'Carousel', label: 'Carousel', desc: 'Kartu varian produk' },
  { id: 'Invoice', label: 'Invoice', desc: 'Tagihan QRIS otomatis' },
];

export const TabCommand: React.FC<TabCommandProps> = ({
  selectedCommand,
  setSelectedCommand,
  menuOutputText,
  setMenuOutputText,
  menuFooterText,
  setMenuFooterText,
  includeMedia,
  setIncludeMedia,
  selectedPicture,
  setSelectedPicture,
  availablePictures,
  setAvailablePictures,
  menuButtons,
  onOpenAddButtonModal,
  onEditButton,
  onDeleteButton,
  onSaveMenu,
  listOutputText,
  setListOutputText,
  listFooterText,
  setListFooterText,
  onSaveList,
  carouselOutputText,
  setCarouselOutputText,
  carouselFooterText,
  setCarouselFooterText,
  carouselPicture,
  setCarouselPicture,
  onSaveCarousel,
  invoiceOutputText,
  setInvoiceOutputText,
  invoiceFooterText,
  setInvoiceFooterText,
  onSaveInvoice,
  isSavingConfig,
  showToast,
}) => {
  const insertTag = (
    tag: string,
    getter: string,
    setter: (val: string) => void,
    toastMsg?: string
  ) => {
    setter(`${getter} ${tag}`);
    showToast(toastMsg || `Tag ${tag} disisipkan`);
  };

  const getButtonTypeBadge = (btn: WhatsAppButton) => {
    switch (btn.type) {
      case 'cta_url':
        return {
          label: 'CTA Link',
          icon: <ExternalLink className="w-3 h-3 text-[#0084D1]" />,
          color: 'bg-sky-50 text-[#0084D1] border-sky-200',
        };
      case 'cta_copy':
        return {
          label: 'CTA Salin',
          icon: <Copy className="w-3 h-3 text-purple-600" />,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'vcard':
      case 'cta_call':
        return {
          label: 'Kontak',
          icon: <UserCheck className="w-3 h-3 text-emerald-600" />,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'cta_reminder':
        return {
          label: 'Reminder',
          icon: <Bell className="w-3 h-3 text-amber-600" />,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'cta_cancel_reminder':
        return {
          label: 'Batal Reminder',
          icon: <BellOff className="w-3 h-3 text-rose-600" />,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'quick_reply':
      default:
        return {
          label: 'Quick Reply',
          icon: <PhoneCall className="w-3 h-3 text-slate-600" />,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Minimalist Tab Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Respon Bot</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pilih format pesan otomatis yang ingin diedit.</p>
        </div>

        {/* 4-Tab Segmented Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 self-start md:self-auto">
          {COMMAND_TABS.map((tab) => {
            const isActive = selectedCommand === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCommand(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#0084D1] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* COMMAND: MENU */}
      {selectedCommand === 'Menu' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Teks Pesan Menu
                </label>
                <span className="text-[11px] font-mono text-slate-400">Prefix: / . ! #</span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{ownerName}', '{ownerNumber}', '{adminNumber}', '{webLink}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, menuOutputText, setMenuOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={menuOutputText}
                onChange={(e) => setMenuOutputText(e.target.value)}
                placeholder="Ketik teks pesan menu..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-sans leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, menuFooterText, setMenuFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={menuFooterText}
                onChange={(e) => setMenuFooterText(e.target.value)}
                placeholder="{webLink} (opsional)"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Media Image Header Option */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 text-[#0084D1] rounded border-slate-300 focus:ring-[#0084D1]"
                />
                <span className="text-xs font-semibold text-slate-800">Sertakan gambar header</span>
              </label>

              {includeMedia && (
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">Pilih file gambar:</span>
                    <button
                      type="button"
                      onClick={() => {
                        fetch('/api/media/pictures')
                          .then((res) => res.json())
                          .then((data) => {
                            if (data.pictures) {
                              setAvailablePictures(data.pictures);
                              showToast('Daftar gambar diperbarui');
                            }
                          })
                          .catch(() => {});
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-[#0084D1] bg-white rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  {availablePictures.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Belum ada file di folder ./src/media/picture
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <select
                        value={selectedPicture}
                        onChange={(e) => setSelectedPicture(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0084D1]"
                      >
                        {availablePictures.map((pic) => (
                          <option key={pic} value={pic}>
                            {pic}
                          </option>
                        ))}
                      </select>

                      {selectedPicture && (
                        <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                          <img
                            src={`/api/media/view?name=${encodeURIComponent(selectedPicture)}`}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive WhatsApp Buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Tombol Interaktif ({menuButtons.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Tombol aksi yang disertakan pada pesan menu.</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAddButtonModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#0084D1] hover:bg-[#0073b7] transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tombol
                </button>
              </div>

              {menuButtons.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                  Belum ada tombol interaktif. Klik Tambah Tombol di atas untuk membuat.
                </div>
              ) : (
                <div className="space-y-2">
                  {menuButtons.map((btn, index) => {
                    const badge = getButtonTypeBadge(btn);
                    return (
                      <div
                        key={btn.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-slate-900 truncate">
                                {btn.name}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${badge.color}`}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                              {btn.output}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditButton(btn)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0084D1] hover:bg-sky-50 transition cursor-pointer"
                            title="Edit tombol"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteButton(btn.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus tombol"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Menu Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveMenu()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] text-white text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: LIST */}
      {selectedCommand === 'List' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Teks Pesan List Katalog
                </label>
                <span className="text-[11px] font-mono text-slate-400">Prefix: / . ! #</span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {['{storeName}', '{daftarProduk}', '{ownerName}', '{webLink}', '{adminNumber}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, listOutputText, setListOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={listOutputText}
                onChange={(e) => setListOutputText(e.target.value)}
                placeholder="Silakan pilih produk:\n\n{daftarProduk}"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                Tag <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono font-medium">{'{daftarProduk}'}</code> otomatis memuat katalog rapi per kategori.
              </p>
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, listFooterText, setListFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={listFooterText}
                onChange={(e) => setListFooterText(e.target.value)}
                placeholder="{webLink} (opsional)"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save List Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveList()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] text-white text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: CAROUSEL */}
      {selectedCommand === 'Carousel' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Header Image for Carousel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">Gambar Header Kartu</h3>
                  <p className="text-[11px] text-slate-400">Gambar yang tampil di atas kartu varian.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fetch('/api/media/pictures')
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.pictures) {
                          setAvailablePictures(data.pictures);
                          showToast('Daftar gambar diperbarui');
                        }
                      })
                      .catch(() => {});
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-[#0084D1] bg-slate-50 hover:bg-white rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <select
                    value={carouselPicture}
                    onChange={(e) => setCarouselPicture(e.target.value)}
                    className="w-full appearance-none bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-[#0084D1]"
                  >
                    {availablePictures.length > 0 ? (
                      availablePictures.map((pic) => (
                        <option key={pic} value={pic}>
                          {pic}
                        </option>
                      ))
                    ) : (
                      <option value="">Belum ada file di ./src/media/picture</option>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {carouselPicture && (
                  <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
                    <img
                      src={`/api/media/view?name=${encodeURIComponent(carouselPicture)}`}
                      alt={carouselPicture}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Template Output Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Template Teks Kartu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const defaultVal = `*{storeName}*\n\n*{produkName} | {category}*\n\n*Detail Produk:*\n- Varian: {varian}\n- Harga: {price}\n- Stok: {stock} tersedia\n\nSilakan pilih tindakan di bawah ini untuk melanjutkan.`;
                    setCarouselOutputText(defaultVal);
                    showToast('Template direset ke default');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {[
                  '{storeName}',
                  '{produkName}',
                  '{category}',
                  '{varian}',
                  '{price}',
                  '{stock}',
                  '{adminNumber}',
                  '{ownerNumber}',
                  '{webLink}',
                ].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, carouselOutputText, setCarouselOutputText)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={carouselOutputText}
                onChange={(e) => setCarouselOutputText(e.target.value)}
                placeholder="Tulis template kartu carousel..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, carouselFooterText, setCarouselFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={carouselFooterText}
                onChange={(e) => setCarouselFooterText(e.target.value)}
                placeholder="{storeName} Official"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save Carousel Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveCarousel()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] text-white text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Carousel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND: INVOICE */}
      {selectedCommand === 'Invoice' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {/* Output Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Template Teks Tagihan Invoice
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const defaultVal = `*INVOICE PEMBAYARAN*\n*{storeName}*\n\nProduk: {produkName}\nVarian: {varian}\nOrder ID: \`{orderId}\`\n\nHarga: Rp {price}\nFee: +Rp {unikCode}\n*TOTAL BAYAR: Rp {total}*\n\nTransfer tepat *Rp {total}* hingga digit terakhir agar otomatis terverifikasi.\nBatas Waktu: 15 Menit.`;
                    setInvoiceOutputText(defaultVal);
                    showToast('Template invoice direset ke default');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>

              {/* Tag Chips */}
              <div className="space-y-1.5 py-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    '{storeName}',
                    '{produkName}',
                    '{category}',
                    '{varian}',
                    '{price}',
                    '{adminNumber}',
                    '{webLink}',
                  ].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertTag(ph, invoiceOutputText, setInvoiceOutputText)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#0084D1]" />
                      <span>{ph}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {['{orderId}', '{total}', '{unikCode}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertTag(ph, invoiceOutputText, setInvoiceOutputText)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-600" />
                      <span>{ph}</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={7}
                value={invoiceOutputText}
                onChange={(e) => setInvoiceOutputText(e.target.value)}
                placeholder="Tulis template invoice di sini..."
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition font-mono leading-relaxed"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-800 block">
                Teks Footer
              </label>

              <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertTag(ph, invoiceFooterText, setInvoiceFooterText)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-600 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0084D1]" />
                    <span>{ph}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={invoiceFooterText}
                onChange={(e) => setInvoiceFooterText(e.target.value)}
                placeholder="{storeName} Official"
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 transition"
              />
            </div>

            {/* Save Invoice Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => onSaveInvoice()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084D1] hover:bg-[#0073b7] text-white text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Simpan Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
