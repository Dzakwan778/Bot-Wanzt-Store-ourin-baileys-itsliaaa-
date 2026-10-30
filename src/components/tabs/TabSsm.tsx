import React from 'react';
import {
  Share2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowLeftRight,
  Check,
} from 'lucide-react';
import { SmmService } from '../../types/dashboard.types';

interface TabSsmProps {
  smmList: SmmService[];
  smmSearch: string;
  setSmmSearch: (val: string) => void;
  smmPage: number;
  setSmmPage: React.Dispatch<React.SetStateAction<number>>;
  smmItemsPerPage: number;
  setSmmItemsPerPage: (val: number) => void;
  selectedSmmCategory: string;
  setSelectedSmmCategory: (cat: string) => void;
  loadingSmm: boolean;
  fetchXavieraSmm: () => void;
  showToast: (msg: string) => void;
  // SMM Pricing props
  smmPricingMode?: 'rp' | 'percent';
  smmPricingValue?: number;
  smmInputVal?: string;
  setSmmInputVal?: (val: string) => void;
  isSavingSmmPricing?: boolean;
  saveSmmPricing?: (mode?: 'rp' | 'percent', val?: number) => void;
  handleToggleSmmMode?: () => void;
  calculateSmmPrice?: (originalRate: number) => {
    mode: 'rp' | 'percent';
    value: number;
    margin: number;
    sellingPrice: number;
  };
}

export const TabSsm: React.FC<TabSsmProps> = ({
  smmList,
  smmSearch,
  setSmmSearch,
  smmPage,
  setSmmPage,
  smmItemsPerPage,
  setSmmItemsPerPage,
  selectedSmmCategory,
  setSelectedSmmCategory,
  loadingSmm,
  fetchXavieraSmm,
  showToast,
  smmPricingMode = 'rp',
  smmPricingValue = 100,
  smmInputVal = '100',
  setSmmInputVal,
  isSavingSmmPricing = false,
  saveSmmPricing,
  handleToggleSmmMode,
  calculateSmmPrice,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Panel Paling Atas: SET HARGA PRODUK SMM */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Set Harga Layanan SSM
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur margin keuntungan penjualan seluruh katalog layanan SSM. Pilih penambahan nominal tetap (Rp) atau persentase (%).
            </p>
          </div>

          {/* Badge Mode Aktif */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Aktif: {smmPricingMode === 'rp' ? `+Rp ${smmPricingValue.toLocaleString('id-ID')}` : `+${smmPricingValue}%`}
            </span>
          </div>
        </div>

        {/* Kolom Form Input Angka & Tombol Toggle Mode di Sampingnya */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Kolom Input Angka dengan Prefix dan Tombol Toggle Mode */}
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 focus-within:bg-white transition shadow-2xs">
            <div className="px-3 text-xs font-bold text-slate-400 select-none border-r border-slate-200/80 bg-slate-100/60 py-2.5">
              {smmPricingMode === 'rp' ? 'Rp' : '%'}
            </div>
            <input
              type="number"
              min="0"
              value={smmInputVal}
              onChange={(e) => setSmmInputVal && setSmmInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveSmmPricing) {
                  saveSmmPricing(smmPricingMode, Number(smmInputVal));
                }
              }}
              placeholder={
                smmPricingMode === 'rp'
                  ? 'Masukkan nominal angka markup (contoh: 500)'
                  : 'Masukkan angka persentase markup (contoh: 15)'
              }
              className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {/* Tombol di samping kolom untuk berganti mode antara Rp atau % */}
            <div className="flex items-center pr-1.5 py-1">
              <button
                type="button"
                onClick={handleToggleSmmMode}
                title="Klik untuk berganti mode antara Rp dan %"
                className="px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-sky-600" />
                <span>
                  Mode: <strong className="text-sky-700 font-extrabold">{smmPricingMode === 'rp' ? 'Rp' : '%'}</strong>
                </span>
              </button>
            </div>
          </div>

          {/* Tombol Simpan Pengaturan */}
          <button
            type="button"
            onClick={() => saveSmmPricing && saveSmmPricing(smmPricingMode, Number(smmInputVal))}
            disabled={isSavingSmmPricing}
            className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
          >
            {isSavingSmmPricing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>

        {/* Ringkasan Simulasi Perhitungan Real-Time */}
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-lg px-3 py-2 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Formula Aktif:</span>
            {smmPricingMode === 'rp' ? (
              <span className="text-slate-800 font-medium">Harga Asli + Rp {Number(smmInputVal || 0).toLocaleString('id-ID')}</span>
            ) : (
              <span className="text-slate-800 font-medium">Harga Asli + {Number(smmInputVal || 0)}%</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span>Contoh: Modal Rate Rp 10.000 / 1k</span>
            <span className="text-slate-400">→</span>
            {(() => {
              const demo = calculateSmmPrice
                ? calculateSmmPrice(10000)
                : { sellingPrice: 10100, margin: 100 };
              return (
                <strong className="text-slate-800 font-mono font-semibold">
                  Rp {demo.sellingPrice.toLocaleString('id-ID')} (+Rp {demo.margin.toLocaleString('id-ID')})
                </strong>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Header Tab SSM (Social Media Marketing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Katalog Layanan SSM (Social Media Marketing)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar seluruh layanan followers, likes, views, subscriber, dan interaksi media sosial Xaviera Store.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchXavieraSmm();
              showToast('Menyinkronkan data katalog layanan SSM...');
            }}
            disabled={loadingSmm}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSmm ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span>Sinkronkan SSM</span>
          </button>
        </div>
      </div>

      {/* Filter Kategori Platform SSM & Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Search Bar Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={smmSearch}
              onChange={(e) => {
                setSmmSearch(e.target.value);
                setSmmPage(1);
              }}
              placeholder="Cari layanan SSM atau ID (contoh: TikTok Followers, YouTube, 9640)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
            />
            {smmSearch && (
              <button
                type="button"
                onClick={() => {
                  setSmmSearch('');
                  setSmmPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown Jumlah Data Per Halaman */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tampilkan:</span>
            <select
              value={smmItemsPerPage}
              onChange={(e) => {
                setSmmItemsPerPage(Number(e.target.value));
                setSmmPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-sky-600 cursor-pointer shadow-2xs"
            >
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
              <option value={200}>200 / hal</option>
            </select>
          </div>
        </div>

        {/* Filter Kategori SSM (Platform: TikTok, YouTube, Instagram, dll.) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {[
            'Semua',
            'Layanan TikTok',
            'Layanan YouTube',
            'Layanan Instagram',
            'Layanan Facebook',
            'Layanan Telegram',
            'Layanan Twitter / X',
            'Layanan Shopee',
            'Layanan Musik',
            'Layanan Lainnya',
          ].map((cat) => {
            const isActive = selectedSmmCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedSmmCategory(cat);
                  setSmmPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition cursor-pointer whitespace-nowrap font-medium flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel Layanan SSM Sesuai Desain APK Premium */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-44">ID & Platform</th>
                <th className="py-3 px-4">Nama Layanan</th>
                <th className="py-3 px-4 text-center w-36">Min / Max Order</th>
                <th className="py-3 px-4 text-right w-36">Harga Asli (1k)</th>
                <th className="py-3 px-5 text-right w-48">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Harga Jual</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                      {smmPricingMode === 'rp'
                        ? `+Rp ${smmPricingValue.toLocaleString('id-ID')}`
                        : `+${smmPricingValue}%`}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {(() => {
                const filtered = smmList.filter((item) => {
                  const matchesSearch =
                    item.name.toLowerCase().includes(smmSearch.toLowerCase()) ||
                    item.category.toLowerCase().includes(smmSearch.toLowerCase()) ||
                    String(item.service).includes(smmSearch);
                  const matchesCategory =
                    selectedSmmCategory === 'Semua' || item.platformCategory === selectedSmmCategory;
                  return matchesSearch && matchesCategory;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 space-y-1">
                        <Share2 className="w-8 h-8 mx-auto text-slate-400" />
                        <div className="font-medium text-slate-700">
                          {smmList.length === 0
                            ? 'Layanan SSM Kosong'
                            : 'Tidak ada layanan SSM ditemukan'}
                        </div>
                        <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {smmList.length === 0
                            ? 'Data layanan SSM murni diambil dari API Xaviera. API Key belum diisi atau tidak valid di tab Connection.'
                            : 'Coba ubah kata kunci pencarian atau ganti filter kategori SSM.'}
                        </div>
                      </td>
                    </tr>
                  );
                }

                const totalPages = Math.max(1, Math.ceil(filtered.length / smmItemsPerPage));
                const currentPage = Math.min(smmPage, totalPages);
                const startIndex = (currentPage - 1) * smmItemsPerPage;
                const paginated = filtered.slice(startIndex, startIndex + smmItemsPerPage);

                return paginated.map((item, index) => {
                  const originalPrice = Number(item.rate) || 0;
                  const calc = calculateSmmPrice
                    ? calculateSmmPrice(originalPrice)
                    : {
                        margin: Math.round(originalPrice * 0.1),
                        sellingPrice: originalPrice + Math.round(originalPrice * 0.1),
                      };
                  const margin = calc.margin;
                  const sellingPrice = calc.sellingPrice;

                  const getPlatformBadgeStyle = (platform: string) => {
                    switch (platform) {
                      case 'Layanan TikTok':
                        return 'bg-slate-900 text-white border-slate-800';
                      case 'Layanan YouTube':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'Layanan Instagram':
                        return 'bg-pink-50 text-pink-700 border-pink-200';
                      case 'Layanan Facebook':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'Layanan Telegram':
                        return 'bg-sky-50 text-sky-700 border-sky-200';
                      case 'Layanan Twitter / X':
                        return 'bg-slate-100 text-slate-800 border-slate-300';
                      case 'Layanan Shopee':
                        return 'bg-orange-50 text-orange-700 border-orange-200';
                      case 'Layanan Musik':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      default:
                        return 'bg-slate-100 text-slate-600 border-slate-200';
                    }
                  };

                  return (
                    <tr
                      key={item.service + '-' + index}
                      className="border-t border-slate-100 bg-white hover:bg-sky-50/30 transition-colors"
                    >
                      {/* 1. Kolom ID & Platform */}
                      <td className="py-3 px-5 align-middle whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              #{item.service}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getPlatformBadgeStyle(
                                item.platformCategory
                              )}`}
                            >
                              {item.platformCategory.replace('Layanan ', '')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={item.category}>
                            {item.category}
                          </div>
                        </div>
                      </td>

                      {/* 2. Kolom Nama Layanan */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900 text-xs leading-snug">
                            {item.name}
                          </div>
                          <div>
                            {item.refill ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                🛡️ Refill Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                ⚪ Non-Refill
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Kolom Min / Max Order */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap font-mono">
                        <div className="text-xs font-semibold text-slate-700">
                          Min: {item.min.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Max: {item.max.toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* 4. Kolom Harga Asli (per 1k) */}
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-600">
                          Rp{originalPrice.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">/ 1.000</div>
                      </td>

                      {/* 5. Kolom Harga Jual (+10%) & Margin */}
                      <td className="py-3 px-5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-baseline gap-1.5 font-mono">
                          <span className="font-bold text-sm text-slate-900 tracking-tight">
                            Rp{sellingPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            (+{margin.toLocaleString('id-ID')})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">/ 1.000</div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel: Pagination & Info Sinkronisasi */}
        {(() => {
          const filtered = smmList.filter((item) => {
            const matchesSearch =
              item.name.toLowerCase().includes(smmSearch.toLowerCase()) ||
              item.category.toLowerCase().includes(smmSearch.toLowerCase()) ||
              String(item.service).includes(smmSearch);
            const matchesCategory =
              selectedSmmCategory === 'Semua' || item.platformCategory === selectedSmmCategory;
            return matchesSearch && matchesCategory;
          });

          const totalPages = Math.max(1, Math.ceil(filtered.length / smmItemsPerPage));
          const currentPage = Math.min(smmPage, totalPages);
          const startIndex = (currentPage - 1) * smmItemsPerPage;

          return (
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-mono">
                  {filtered.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + smmItemsPerPage, filtered.length)}
                </strong>{' '}
                dari <strong className="text-slate-800 font-mono">{filtered.length}</strong> layanan terfilter{' '}
                <span className="text-slate-400 font-mono">(Total: {smmList.length} layanan SSM)</span>
              </div>

              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSmmPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="px-2 font-mono text-xs font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSmmPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
