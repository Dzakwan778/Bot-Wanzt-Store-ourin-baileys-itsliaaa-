import React from 'react';
import {
  Gamepad2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowLeftRight,
  Check,
} from 'lucide-react';
import { TopUpItem } from '../../types/dashboard.types';

interface TabTopUpProps {
  topUpList: TopUpItem[];
  topUpSearch: string;
  setTopUpSearch: (val: string) => void;
  topUpPage: number;
  setTopUpPage: React.Dispatch<React.SetStateAction<number>>;
  topUpItemsPerPage: number;
  setTopUpItemsPerPage: (val: number) => void;
  selectedTopUpCategory: string;
  setSelectedTopUpCategory: (cat: string) => void;
  loadingTopUp: boolean;
  fetchXavieraGames: () => void;
  showToast: (msg: string) => void;
  // TopUp Pricing props
  topupPricingMode?: 'rp' | 'percent';
  topupPricingValue?: number;
  topupInputVal?: string;
  setTopupInputVal?: (val: string) => void;
  isSavingTopupPricing?: boolean;
  saveTopupPricing?: (mode?: 'rp' | 'percent', val?: number) => void;
  handleToggleTopupMode?: () => void;
  calculateTopupPrice?: (originalPrice: number) => {
    mode: 'rp' | 'percent';
    value: number;
    margin: number;
    sellingPrice: number;
  };
}

export const TabTopUp: React.FC<TabTopUpProps> = ({
  topUpList,
  topUpSearch,
  setTopUpSearch,
  topUpPage,
  setTopUpPage,
  topUpItemsPerPage,
  setTopUpItemsPerPage,
  selectedTopUpCategory,
  setSelectedTopUpCategory,
  loadingTopUp,
  fetchXavieraGames,
  showToast,
  topupPricingMode = 'rp',
  topupPricingValue = 100,
  topupInputVal = '100',
  setTopupInputVal,
  isSavingTopupPricing = false,
  saveTopupPricing,
  handleToggleTopupMode,
  calculateTopupPrice,
}) => {
  const filtered = topUpList.filter((item) => {
    const matchesSearch =
      item.item.toLowerCase().includes(topUpSearch.toLowerCase()) ||
      item.game.toLowerCase().includes(topUpSearch.toLowerCase()) ||
      String(item.id).toLowerCase().includes(topUpSearch.toLowerCase());
    const matchesCategory =
      selectedTopUpCategory === 'Semua' || item.category === selectedTopUpCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / topUpItemsPerPage));
  const currentPage = Math.min(topUpPage, totalPages);
  const startIndex = (currentPage - 1) * topUpItemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + topUpItemsPerPage);

  const getGameBadge = (game: string) => {
    const g = game.toLowerCase();
    if (g.includes('mobile legends') || g.includes('mlbb')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (g.includes('free fire') || g.includes('ff')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (g.includes('pubg')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (g.includes('genshin') || g.includes('honkai')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (g.includes('valorant')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* 1. Panel Atas: SET HARGA PRODUK TOP UP */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Set Harga Produk Top Up Game
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur keuntungan margin penjualan seluruh katalog game, voucher, diamond, dan pulsa.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Aktif:{' '}
              {topupPricingMode === 'rp'
                ? `+Rp ${topupPricingValue.toLocaleString('id-ID')}`
                : `+${topupPricingValue}%`}
            </span>
          </div>
        </div>

        {/* Input Margin Top Up */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 focus-within:bg-white transition shadow-2xs">
            <div className="px-3.5 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100 py-2.5">
              {topupPricingMode === 'rp' ? 'Rp' : '%'}
            </div>
            <input
              type="number"
              min="0"
              value={topupInputVal}
              onChange={(e) => setTopupInputVal && setTopupInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveTopupPricing) {
                  saveTopupPricing(topupPricingMode, Number(topupInputVal));
                }
              }}
              placeholder={
                topupPricingMode === 'rp'
                  ? 'Masukkan angka markup (contoh: 1000)'
                  : 'Masukkan persentase markup (contoh: 10)'
              }
              className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <div className="flex items-center pr-1.5 py-1">
              <button
                type="button"
                onClick={handleToggleTopupMode}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#0084D1]" />
                <span>
                  Mode:{' '}
                  <strong className="text-[#0084D1]">
                    {topupPricingMode === 'rp' ? 'Rp' : '%'}
                  </strong>
                </span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveTopupPricing && saveTopupPricing(topupPricingMode, Number(topupInputVal))
            }
            disabled={isSavingTopupPricing}
            className="px-4 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
          >
            {isSavingTopupPricing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Pencarian Game */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={topUpSearch}
            onChange={(e) => {
              setTopUpSearch(e.target.value);
              setTopUpPage(1);
            }}
            placeholder="Cari judul game, nominal, atau kode item (MLBB, Diamond)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 transition shadow-2xs"
          />
          {topUpSearch && (
            <button
              type="button"
              onClick={() => {
                setTopUpSearch('');
                setTopUpPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {['Semua', 'Games', 'Pulsa & Data', 'E-Money', 'Voucher'].map((cat) => {
            const isActive = selectedTopUpCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedTopUpCategory(cat);
                  setTopUpPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-xl transition cursor-pointer whitespace-nowrap font-semibold ${
                  isActive
                    ? 'bg-[#0084D1] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              fetchXavieraGames();
              showToast('Menyinkronkan katalog Top Up game...');
            }}
            disabled={loadingTopUp}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingTopUp ? 'animate-spin text-[#0084D1]' : 'text-slate-500'
              }`}
            />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 3. Tabel Top Up Game yang Rapi & Jelas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-44 text-left">Game / Layanan</th>
                <th className="py-3 px-4 text-left">Nama Nominal / Item</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right w-36">Harga Modal</th>
                <th className="py-3 px-4 text-right w-48">Harga Jual &amp; Margin</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 space-y-2">
                    <Gamepad2 className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                    <div className="font-bold text-slate-800 text-sm">
                      {topUpList.length === 0
                        ? 'Katalog Top Up Kosong'
                        : 'Tidak Ada Item Sesuai Filter'}
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {topUpList.length === 0
                        ? 'Pastikan API Key Xaviera Store sudah terhubung di menu Koneksi Layanan.'
                        : 'Coba ubah kata kunci pencarian atau kategori di atas.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => {
                  const originalPrice = Number(item.originalPrice) || 0;
                  const calc = calculateTopupPrice
                    ? calculateTopupPrice(originalPrice)
                    : {
                        margin: Math.round(originalPrice * 0.1),
                        sellingPrice: originalPrice + Math.round(originalPrice * 0.1),
                      };

                  return (
                    <tr
                      key={`${item.id}-${index}`}
                      className="hover:bg-sky-50/30 transition-colors"
                    >
                      {/* Game / Brand */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getGameBadge(
                              item.game
                            )}`}
                          >
                            {item.game}
                          </span>
                          <div className="font-mono text-[10px] text-slate-400">
                            ID: #{item.id}
                          </div>
                        </div>
                      </td>

                      {/* Nama Nominal Item */}
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-slate-900 text-xs">
                          {item.item}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.category || 'Top Up'}
                        </div>
                      </td>

                      {/* Status Ketersediaan */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tersedia
                        </span>
                      </td>

                      {/* Harga Modal Asli */}
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap font-mono text-slate-500">
                        Rp {originalPrice.toLocaleString('id-ID')}
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
                  {Math.min(startIndex + topUpItemsPerPage, filtered.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-900 font-mono">
                  {filtered.length}
                </strong>{' '}
                item
              </span>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                <span className="text-[11px] text-slate-500">Per halaman:</span>
                <select
                  value={topUpItemsPerPage}
                  onChange={(e) => {
                    setTopUpItemsPerPage(Number(e.target.value));
                    setTopUpPage(1);
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
                onClick={() => setTopUpPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setTopUpPage((p) => Math.min(totalPages, p + 1))}
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
