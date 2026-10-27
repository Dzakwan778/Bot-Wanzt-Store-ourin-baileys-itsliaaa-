import React from 'react';
import {
  ChevronDown,
  Check,
  Plus,
  FileText,
  Image as ImageIcon,
  Layers,
  Pencil,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { WhatsAppButton, StoreInfoConfig } from '../../types/dashboard.types';

interface TabCommandProps {
  selectedCommand: 'Menu' | 'List' | 'Carousel';
  setSelectedCommand: (cmd: 'Menu' | 'List' | 'Carousel') => void;
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
  // General Props
  storeInfo: StoreInfoConfig;
  isSavingConfig: boolean;
  showToast: (msg: string) => void;
}

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
  storeInfo,
  isSavingConfig,
  showToast,
}) => {
  return (
    <div className="space-y-5">
      {/* Header & Dropdown Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Pilih Command
          </label>
          <div className="relative inline-block w-48">
            <select
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value as 'Menu' | 'List' | 'Carousel')}
              className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
            >
              <option value="Menu">Menu</option>
              <option value="List">List</option>
              <option value="Carousel">Carousel</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
            Command Aktif: {selectedCommand}
          </span>
        </div>
      </div>

      {/* Jika Command "Menu" Dipilih */}
      {selectedCommand === 'Menu' && (
        <div className="space-y-4">
          {/* Kolom Teks Output Command Menu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <span>Teks Output Command Menu</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Prefix: / . ! ? # $ % &
                </span>
              </label>
              <button
                type="button"
                onClick={onSaveMenu}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Simpan Teks & Footer
              </button>
            </div>

            {/* Placeholder chips for Menu */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 rounded-lg bg-slate-100/80 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Sisipkan Placeholder:</span>
              {['{storeName}', '{ownerName}', '{ownerNumber}', '{adminNumber}', '{webLink}', '{waLink}'].map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => {
                    const updated = `${menuOutputText} ${ph}`;
                    setMenuOutputText(updated);
                    showToast(`Placeholder ${ph} disisipkan!`);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-300 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  <code>{ph}</code>
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={menuOutputText}
              onChange={(e) => setMenuOutputText(e.target.value)}
              placeholder="Ketikkan teks pesan yang akan keluar saat command Menu dipanggil..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Format teks mendukung *tebal*, _miring_, atau placeholder dinamis.</span>
              <span className="text-[11px] text-slate-400">Pemicu: tombol Quick Reply tidak butuh prefix</span>
            </div>

            {/* Form Teks Footer Command Menu */}
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Teks Footer Command Menu
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Dukungan Placeholder</span>
              </div>
              <input
                type="text"
                value={menuFooterText}
                onChange={(e) => setMenuFooterText(e.target.value)}
                placeholder="{webLink} • Otomatis"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-mono shadow-2xs"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-slate-500 font-medium">Sisipkan ke footer:</span>
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => {
                      setMenuFooterText((prev) => `${prev} ${ph}`);
                      showToast(`Placeholder ${ph} disisipkan ke footer!`);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 rounded cursor-pointer"
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sertakan Media (Opsional) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                  Sertakan media (opsional)
                </span>
              </label>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Folder: ./src/media/picture
              </span>
            </div>

            {includeMedia && (
              <div className="space-y-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Foto dari `./src/media/picture`
                  </label>
                  {availablePictures.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      Belum ada foto di dalam folder <code>./src/media/picture</code>. Silakan letakkan foto (JPG/PNG) secara manual ke folder tersebut.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPicture}
                        onChange={(e) => setSelectedPicture(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
                      >
                        {availablePictures.map((picName) => (
                          <option key={picName} value={picName}>
                            {picName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedPicture && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={`/api/media/view?name=${encodeURIComponent(selectedPicture)}`}
                        alt="Selected Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-800 font-mono">{selectedPicture}</p>
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Foto terpilih akan dikirim bersama pesan menu.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Add Button & List Tombol Terpasang */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                Tombol Interaktif WhatsApp ({menuButtons.length})
              </label>
              <button
                type="button"
                onClick={onOpenAddButtonModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Button
              </button>
            </div>

            {menuButtons.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400 space-y-1">
                <div>Belum ada tombol interaktif yang ditambahkan.</div>
                <div className="text-[11px] text-slate-500">Klik tombol &quot;Add Button&quot; di atas untuk membuat tombol baru.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {menuButtons.map((btn, index) => {
                  let badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                  let badgeLabel = 'Quick Reply';
                  if (btn.type === 'cta_url') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    badgeLabel = 'CTA URL';
                  } else if (btn.type === 'cta_copy') {
                    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                    badgeLabel = 'CTA Copy';
                  } else if (btn.type === 'vcard' || btn.type === 'cta_call') {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                    badgeLabel = 'vCard Kontak';
                  } else if (btn.type === 'cta_reminder') {
                    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    badgeLabel = 'CTA Reminder';
                  } else if (btn.type === 'cta_cancel_reminder') {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    badgeLabel = 'Cancel Reminder';
                  }

                  return (
                    <div
                      key={btn.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {btn.name}
                            </span>
                            <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            {btn.type === 'quick_reply' && (
                              <span
                                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${
                                  btn.triggerAction === 'list'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : btn.triggerAction === 'owner'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : btn.triggerAction === 'admin'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : btn.triggerAction === 'menu'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {btn.triggerAction === 'list'
                                  ? '⚡ Command: List'
                                  : btn.triggerAction === 'owner'
                                  ? '👑 Command: Owner'
                                  : btn.triggerAction === 'admin'
                                  ? '📞 Command: Admin'
                                  : btn.triggerAction === 'menu'
                                  ? '📋 Command: Menu'
                                  : '⚪ Unknown'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            Output: <span className="text-slate-700 font-medium">{btn.output}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditButton(btn)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                          title="Edit tombol"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteButton(btn.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus tombol"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jika Command "List" Dipilih */}
      {selectedCommand === 'List' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <span>Teks Output Command List</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Prefix: / . ! ? # $ % &
                </span>
              </label>
              <button
                type="button"
                onClick={onSaveList}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Simpan Teks & Footer
              </button>
            </div>

            {/* Placeholder chips for List Output */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 rounded-lg bg-slate-100/80 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Sisipkan Placeholder:</span>
              {['{storeName}', '{daftarProduk}', '{ownerName}', '{webLink}', '{adminNumber}', '{waLink}'].map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => {
                    const updated = `${listOutputText} ${ph}`;
                    setListOutputText(updated);
                    showToast(`Placeholder ${ph} disisipkan!`);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-300 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  <code>{ph}</code>
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={listOutputText}
              onChange={(e) => setListOutputText(e.target.value)}
              placeholder="Silakan pilih produk yang tersedia:\n\n{daftarProduk}\n\nKetik nama produk untuk memesan."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs leading-relaxed font-sans"
            />

            {/* Form Teks Footer Command List */}
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Teks Footer Command List
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Dukungan Placeholder</span>
              </div>
              <input
                type="text"
                value={listFooterText}
                onChange={(e) => setListFooterText(e.target.value)}
                placeholder="{webLink} • Pilih Produk"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-mono shadow-2xs"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-slate-500 font-medium">Sisipkan ke footer:</span>
                {['{webLink}', '{storeName}', '{ownerNumber}', '{adminNumber}', '{waLink}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => {
                      setListFooterText((prev) => `${prev} ${ph}`);
                      showToast(`Placeholder ${ph} disisipkan ke footer!`);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 rounded cursor-pointer"
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Petunjuk & Dokumentasi Placeholder {daftarProduk} */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Placeholder Otomatis: <code className="text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded font-mono font-bold text-xs">{'{daftarProduk}'}</code>
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Auto-Grouped
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Saat pesan command <strong>List</strong> dikirim ke pelanggan, tag <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">{'{daftarProduk}'}</code> akan otomatis diubah menjadi daftar nama produk (bukan varian) bernomor urut berlanjut dan dikelompokkan rapi per kategori.
            </p>
          </div>
        </div>
      )}

      {/* Jika Command "Carousel" Dipilih */}
      {selectedCommand === 'Carousel' && (
        <div className="space-y-5">
          {/* 1. Pengaturan Media Gambar Carousel (./src/media/picture) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  Media Gambar Header Carousel (./src/media/picture)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Media gambar yang dipilih di bawah ini adalah media yang akan dikirim bersamaan dengan setiap kartu Carousel saat menampilkan varian produk ke pelanggan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetch('/api/media/pictures')
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.pictures) {
                        setAvailablePictures(data.pictures);
                        showToast('Daftar file gambar ./src/media/picture diperbarui!');
                      }
                    })
                    .catch(() => {});
                }}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-sky-700 bg-white border border-slate-200 rounded-lg hover:border-sky-300 transition cursor-pointer shadow-2xs"
                title="Muat ulang daftar file gambar dari server"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Media
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Pilih File Gambar Header Kartu:
                </label>
                <div className="relative">
                  <select
                    value={carouselPicture}
                    onChange={(e) => setCarouselPicture(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 pr-9 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
                  >
                    {availablePictures.length > 0 ? (
                      availablePictures.map((pic) => (
                        <option key={pic} value={pic}>
                          {pic}
                        </option>
                      ))
                    ) : (
                      <option value="">Tidak ada file di ./src/media/picture</option>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-100 text-[11px] text-sky-800 leading-relaxed font-sans">
                  💡 <strong>Info:</strong> Protokol resmi WhatsApp Mobile mengharuskan adanya media header pada setiap kartu Carousel agar dapat dirender dengan sempurna di semua perangkat pengguna.
                </div>
              </div>

              {/* Pratinjau Gambar Terpilih */}
              <div className="border border-slate-200 rounded-lg bg-white p-2.5 flex items-center gap-3">
                {carouselPicture ? (
                  <>
                    <div className="w-24 h-20 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative flex items-center justify-center">
                      <img
                        src={`/api/media/view?name=${encodeURIComponent(carouselPicture)}`}
                        alt={carouselPicture}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {carouselPicture}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded inline-block border border-emerald-200">
                        Terpilih untuk Carousel
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        ./src/media/picture/{carouselPicture}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 italic p-3 text-center w-full">
                    Belum ada gambar yang dipilih
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Textarea Template Teks Output Carousel dengan Placeholder */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Template Konten Teks Kartu Carousel
                </label>
                <p className="text-[11px] text-slate-500">
                  Sesuaikan template teks varian. Gunakan placeholder di bawah ini untuk mengisi data dinamis secara otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const defaultVal = `*Wanzt Store*\n\n*{produkName} | {category}*\n\nNikmati produk pilihanmu dengan harga terbaik di Wanzt Store.\n\n*Detail Produk:*\n- Varian: {varian}\n- Harga: {price}\n- Stok: {stock} tersedia\n\nProduk tersedia selama stok masih ada. Silakan pilih tindakan di bawah ini untuk melanjutkan.`;
                  setCarouselOutputText(defaultVal);
                  showToast('Template Carousel direset ke format default!');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            {/* Tombol Sisipkan Placeholder Cepat */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 rounded-lg bg-slate-100/80 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                Sisipkan:
              </span>
              {[
                { tag: '{storeName}', label: 'Nama Store' },
                { tag: '{produkName}', label: 'Nama Produk' },
                { tag: '{category}', label: 'Kategori' },
                { tag: '{varian}', label: 'Varian' },
                { tag: '{price}', label: 'Harga' },
                { tag: '{stock}', label: 'Stok' },
                { tag: '{adminNumber}', label: 'No. Admin' },
                { tag: '{ownerNumber}', label: 'No. Owner' },
                { tag: '{webLink}', label: 'Website' },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => {
                    const updated = `${carouselOutputText} ${item.tag}`;
                    setCarouselOutputText(updated);
                    showToast(`Placeholder ${item.tag} disisipkan!`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-white text-sky-800 border border-slate-200 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-900 transition cursor-pointer shadow-2xs"
                  title={`${item.tag} — ${item.label}`}
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  <code>{item.tag}</code>
                </button>
              ))}
            </div>

            {/* Textarea Input Template */}
            <textarea
              rows={8}
              value={carouselOutputText}
              onChange={(e) => setCarouselOutputText(e.target.value)}
              placeholder="Tulis template kartu carousel di sini..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs leading-relaxed font-mono"
            />

            {/* Form Teks Footer Command Carousel */}
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Teks Footer Kartu Carousel
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Dukungan Placeholder</span>
              </div>
              <input
                type="text"
                value={carouselFooterText}
                onChange={(e) => setCarouselFooterText(e.target.value)}
                placeholder="{storeName} Official"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-mono shadow-2xs"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-slate-500 font-medium">Sisipkan ke footer:</span>
                {['{storeName}', '{webLink}', '{ownerNumber}', '{adminNumber}', '{category}'].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => {
                      setCarouselFooterText((prev) => `${prev} ${ph}`);
                      showToast(`Placeholder ${ph} disisipkan ke footer Carousel!`);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 rounded cursor-pointer"
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp Preview Carousel */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Pratinjau Hasil Output Carousel (POV Pelanggan di WhatsApp)
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Preview
              </span>
            </div>

            <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold flex items-center gap-1.5 text-sky-400">
                  🎠 Carousel Card • Varian 1
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1/4 Kartu Varian</span>
              </div>

              <div className="h-36 bg-slate-800 relative overflow-hidden flex items-center justify-center border-b border-slate-200">
                {carouselPicture ? (
                  <img
                    src={`/api/media/view?name=${encodeURIComponent(carouselPicture)}`}
                    alt={carouselPicture}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-3 text-white space-y-1">
                    <div className="text-xs font-bold">WANZT STORE</div>
                    <div className="text-[10px] text-slate-300">Pilih media di menu atas</div>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3 text-xs leading-relaxed bg-[#f0f2f5]/40">
                <div className="whitespace-pre-wrap font-sans text-slate-800 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  {carouselOutputText
                    .replace(/\{storeName\}|\{namaStore\}/gi, storeInfo.storeName || 'Wanzt Store')
                    .replace(/\{ownerName\}|\{namaOwner\}/gi, storeInfo.ownerName || 'Wanzt')
                    .replace(/\{webLink\}|\{linkWebsite\}/gi, storeInfo.webLink || 'wanztstore.web.id')
                    .replace(/\{adminNumber\}|\{nomerAdmin\}/gi, storeInfo.adminNumber || '08123456789')
                    .replace(/\{ownerNumber\}|\{nomerOwner\}/gi, storeInfo.ownerNumber || '082173515807')
                    .replace(/\{produkName\}|\{productName\}/gi, 'YouTube')
                    .replace(/\{category\}|\{kategori\}/gi, 'Streaming')
                    .replace(/\{varian\}|\{variant\}/gi, 'YouTube Famplan Email Buyer 1 Bulan')
                    .replace(/\{price\}|\{harga\}/gi, 'Rp22.000')
                    .replace(/\{stock\}|\{stok\}/gi, '21')}
                </div>

                <div className="text-[10px] text-slate-500 font-medium text-left px-1">
                  {carouselFooterText
                    .replace(/\{storeName\}|\{namaStore\}/gi, storeInfo.storeName || 'Wanzt Store')
                    .replace(/\{ownerName\}|\{namaOwner\}/gi, storeInfo.ownerName || 'Wanzt')
                    .replace(/\{webLink\}|\{linkWebsite\}/gi, storeInfo.webLink || 'wanztstore.web.id')
                    .replace(/\{adminNumber\}|\{nomerAdmin\}/gi, storeInfo.adminNumber || '08123456789')
                    .replace(/\{ownerNumber\}|\{nomerOwner\}/gi, storeInfo.ownerNumber || '082173515807')
                    .replace(/\{produkName\}/gi, 'YouTube')
                    .replace(/\{category\}/gi, 'Streaming') || 'Wanzt Store Official'}
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="w-full py-2 px-3 rounded-lg bg-sky-600 text-white font-semibold text-center text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                    <span>🛒</span> Order
                  </div>
                  <div className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-center text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                    <span>📞</span> Contact Admin
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan Perubahan Carousel */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSavingConfig}
              onClick={onSaveCarousel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSavingConfig ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan Perubahan Carousel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
