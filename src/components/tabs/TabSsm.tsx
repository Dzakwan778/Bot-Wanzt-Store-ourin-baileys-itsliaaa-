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
  ShieldCheck,
  Zap,
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
  const getPlatformBadge = (platform: string) => {
    const clean = platform.replace('Layanan ', '');
    switch (clean) {
      case 'TikTok':
        return 'bg-slate-900 text-white border-slate-700';
      case 'Instagram':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'YouTube':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Telegram':
        return 'bg-sky-50 text-[#0084D1] border-sky-200';
      case 'Facebook':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Twitter / X':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filtered = smmList.filter((item) => {
    const searchLower = smmSearch.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      String(item.service).includes(searchLower);
    const matchesCategory =
      selectedSmmCategory === 'Semua' || item.platformCategory === selectedSmmCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / smmItemsPerPage));
  const currentPage = Math.min(smmPage, totalPages);
  const startIndex = (currentPage - 1) * smmItemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + smmItemsPerPage);

  return (
    <div className="space-y-6">
      {/* 1. Panel Atas: SET HARGA LAYANAN SMM */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Set Harga Layanan SMM
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur keuntungan margin penjualan seluruh katalog layanan media sosial (SMM).
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Aktif:{' '}
              {smmPricingMode === 'rp'
                ? `+Rp ${smmPricingValue.toLocaleString('id-ID')}`
                : `+${smmPricingValue}%`}
            </span>
          </div>
        </div>

        {/* Input Margin SMM */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 focus-within:bg-white transition shadow-2xs">
            <div className="px-3.5 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100 py-2.5">
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
                  ? 'Masukkan angka markup (contoh: 500)'
                  : 'Masukkan persentase markup (contoh: 15)'
              }
              className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <div className="flex items-center pr-1.5 py-1">
              <button
                type="button"
                onClick={handleToggleSmmMode}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#0084D1]" />
                <span>
                  Mode:{' '}
                  <strong className="text-[#0084D1]">
                    {smmPricingMode === 'rp' ? 'Rp' : '%'}
                  </strong>
                </span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveSmmPricing && saveSmmPricing(smmPricingMode, Number(smmInputVal))}
            disabled={isSavingSmmPricing}
            className="px-4 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
          >
            {isSavingSmmPricing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Pencarian SMM */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={smmSearch}
            onChange={(e) => {
              setSmmSearch(e.target.value);
              setSmmPage(1);
            }}
            placeholder="Cari layanan SMM atau ID service (contoh: TikTok, Followers, 102)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 transition shadow-2xs"
          />
          {smmSearch && (
            <button
              type="button"
              onClick={() => {
                setSmmSearch('');
                setSmmPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            'Semua',
            'Layanan TikTok',
            'Layanan Instagram',
            'Layanan YouTube',
            'Layanan Telegram',
          ].map((cat) => {
            const isActive = selectedSmmCategory === cat;
            const label = cat.replace('Layanan ', '');
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedSmmCategory(cat);
                  setSmmPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-xl transition cursor-pointer whitespace-nowrap font-semibold ${
                  isActive
                    ? 'bg-[#0084D1] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              fetchXavieraSmm();
              showToast('Menyinkronkan katalog layanan SMM...');
            }}
            disabled={loadingSmm}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingSmm ? 'animate-spin text-[#0084D1]' : 'text-slate-500'
              }`}
            />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 3. Tabel SMM yang Lebih Bersih & Mudah Dibaca */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-44 text-left">Platform &amp; ID</th>
                <th className="py-3 px-4 text-left">Nama Layanan</th>
                <th className="py-3 px-4 text-center w-36">Min / Max Order</th>
                <th className="py-3 px-4 text-right w-36">Harga Modal (/1k)</th>
                <th className="py-3 px-4 text-right w-48">Harga Jual &amp; Margin</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 space-y-2">
                    <Share2 className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                    <div className="font-bold text-slate-800 text-sm">
                      {smmList.length === 0
                        ? 'Layanan SMM Kosong'
                        : 'Tidak Ada Layanan Sesuai Filter'}
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {smmList.length === 0
                        ? 'Pastikan API Key Xaviera Store sudah terhubung di tab Koneksi Layanan.'
                        : 'Coba ubah kata kunci pencarian atau kategori platform di atas.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => {
                  const originalPrice = Number(item.rate) || 0;
                  const calc = calculateSmmPrice
                    ? calculateSmmPrice(originalPrice)
                    : {
                        margin: Math.round(originalPrice * 0.1),
                        sellingPrice: originalPrice + Math.round(originalPrice * 0.1),
                      };

                  return (
                    <tr
                      key={`${item.service}-${index}`}
                      className="hover:bg-sky-50/30 transition-colors"
                    >
                      {/* Platform & Service ID */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPlatformBadge(
                                item.platformCategory
                              )}`}
                            >
                              {item.platformCategory.replace('Layanan ', '')}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              #{item.service}
                            </span>
                          </div>
                          <div
                            className="text-[10px] text-slate-400 truncate max-w-[160px]"
                            title={item.category}
                          >
                            {item.category}
                          </div>
                        </div>
                      </td>

                      {/* Nama Layanan SMM */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs leading-snug">
                            {item.name}
                          </div>
                          <div>
                            {item.refill ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                🛡️ Refill Garansi
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Non-refill
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Min / Max Order */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap font-mono">
                        <div className="text-xs font-bold text-slate-800">
                          {item.min.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          s/d {item.max.toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* Harga Modal (/1k) */}
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap font-mono text-slate-500">
                        <div>Rp {originalPrice.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-400">/ 1.000</div>
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900 text-xs">
                          Rp {calc.sellingPrice.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-700">
                          +Rp {calc.margin.toLocaleString('id-ID')}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filtered.length > 0 && (
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-900 font-mono">
                  {startIndex + 1}
                </strong>
                -
                <strong className="text-slate-900 font-mono">
                  {Math.min(startIndex + smmItemsPerPage, filtered.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-900 font-mono">
                  {filtered.length}
                </strong>{' '}
                layanan
              </span>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                <span className="text-[11px] text-slate-500">Per halaman:</span>
                <select
                  value={smmItemsPerPage}
                  onChange={(e) => {
                    setSmmItemsPerPage(Number(e.target.value));
                    setSmmPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-[#0084D1]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSmmPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setSmmPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
