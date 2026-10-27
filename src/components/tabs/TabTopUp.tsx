import React from 'react';
import {
  Gamepad2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
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
}) => {
  return (
    <div className="space-y-5">
      {/* Header Tab Top Up (Games & Digital Services) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Katalog Layanan Top Up Game & Digital
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar seluruh paket voucher, diamond game, saldo e-wallet, pulsa, dan transaksi instan 24 jam nonstop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchXavieraGames();
              showToast('Menyinkronkan data katalog Top Up Game...');
            }}
            disabled={loadingTopUp}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTopUp ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span>Sinkronkan Top Up</span>
          </button>
        </div>
      </div>

      {/* Filter Kategori Game / Top Up & Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Search Bar Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={topUpSearch}
              onChange={(e) => {
                setTopUpSearch(e.target.value);
                setTopUpPage(1);
              }}
              placeholder="Cari game, diamond, atau denominasi (contoh: Mobile Legends, Free Fire, Valorant, DANA)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
            />
            {topUpSearch && (
              <button
                type="button"
                onClick={() => {
                  setTopUpSearch('');
                  setTopUpPage(1);
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
              value={topUpItemsPerPage}
              onChange={(e) => {
                setTopUpItemsPerPage(Number(e.target.value));
                setTopUpPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-sky-600 cursor-pointer shadow-2xs"
            >
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>
          </div>
        </div>

        {/* Filter Kategori Top Up (Mobile Legends, Free Fire, Valorant, dll.) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {[
            'Semua',
            'Mobile Legends',
            'Free Fire',
            'PUBG Mobile',
            'Valorant',
            'Genshin Impact',
            'Honor of Kings',
            'Roblox',
            'E-Wallet & Pulsa',
          ].map((cat) => {
            const isActive = selectedTopUpCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedTopUpCategory(cat);
                  setTopUpPage(1);
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

      {/* Tabel Layanan Top Up */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-48">Game & Server</th>
                <th className="py-3 px-4">Denominasi / Paket Item</th>
                <th className="py-3 px-4 text-center w-36">Status / Stok</th>
                <th className="py-3 px-4 text-right w-36">Harga Asli</th>
                <th className="py-3 px-5 text-right w-44">Harga Jual (+10%)</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {(() => {
                const filtered = topUpList.filter((item) => {
                  const matchesSearch =
                    item.game.toLowerCase().includes(topUpSearch.toLowerCase()) ||
                    item.item.toLowerCase().includes(topUpSearch.toLowerCase()) ||
                    item.category.toLowerCase().includes(topUpSearch.toLowerCase()) ||
                    item.server.toLowerCase().includes(topUpSearch.toLowerCase());
                  const matchesCategory =
                    selectedTopUpCategory === 'Semua' || item.category === selectedTopUpCategory;
                  return matchesSearch && matchesCategory;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 space-y-1">
                        <Gamepad2 className="w-8 h-8 mx-auto text-slate-400" />
                        <div className="font-medium text-slate-700">
                          {topUpList.length === 0
                            ? 'Daftar Top Up Game Kosong'
                            : 'Tidak ada paket Top Up ditemukan'}
                        </div>
                        <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {topUpList.length === 0
                            ? 'Data game dan voucher murni diambil dari API Xaviera. API Key belum diisi atau tidak valid di tab Connection.'
                            : 'Coba ubah kata kunci pencarian atau ganti filter kategori game.'}
                        </div>
                      </td>
                    </tr>
                  );
                }

                const totalPages = Math.max(1, Math.ceil(filtered.length / topUpItemsPerPage));
                const currentPage = Math.min(topUpPage, totalPages);
                const startIndex = (currentPage - 1) * topUpItemsPerPage;
                const paginated = filtered.slice(startIndex, startIndex + topUpItemsPerPage);

                return paginated.map((item, index) => {
                  const prevItem = index > 0 ? paginated[index - 1] : null;
                  const isNewGroup = !prevItem || prevItem.game !== item.game;

                  const originalPrice = Number(item.originalPrice) || 0;
                  const margin = Math.round(originalPrice * 0.1);
                  const sellingPrice = originalPrice + margin;

                  const getGameBadgeStyle = (game: string) => {
                    switch (game) {
                      case 'Mobile Legends':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'Free Fire':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'PUBG Mobile':
                        return 'bg-orange-50 text-orange-700 border-orange-200';
                      case 'Valorant':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'Genshin Impact':
                        return 'bg-purple-50 text-purple-700 border-purple-200';
                      case 'Honor of Kings':
                        return 'bg-red-50 text-red-700 border-red-200';
                      case 'Roblox':
                        return 'bg-slate-900 text-white border-slate-800';
                      default:
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    }
                  };

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-sky-50/30 ${
                        isNewGroup
                          ? index === 0
                            ? 'bg-slate-50/50'
                            : 'border-t-2 border-slate-200 bg-slate-50/50'
                          : 'border-t border-slate-100 bg-white'
                      }`}
                    >
                      {/* 1. Kolom Game & Server */}
                      <td className="py-3 px-5 align-middle whitespace-nowrap">
                        {isNewGroup ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-white border border-slate-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs font-bold text-[11px]">
                                <Gamepad2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 text-sm tracking-tight">
                                {item.game}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-8">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getGameBadgeStyle(
                                  item.game
                                )}`}
                              >
                                {item.server}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center pl-8 text-slate-400 select-none">
                            <span className="inline-block w-4 h-px bg-slate-300 mr-2"></span>
                            <span className="font-mono text-slate-400 text-xs">-</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Kolom Denominasi / Paket Item */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900 text-xs">
                            {item.item}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.badge ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                  item.badge.includes('Terlaris')
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : item.badge.includes('Best Value')
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {item.badge}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                ⚡ Instant Top-Up
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Kolom Status / Stok */}
                      <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                        <span className="inline-flex items-center justify-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded text-xs border border-slate-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Ready {item.stock}</span>
                        </span>
                      </td>

                      {/* 4. Kolom Harga Asli */}
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-600">
                          Rp{originalPrice.toLocaleString('id-ID')}
                        </span>
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
          const filtered = topUpList.filter((item) => {
            const matchesSearch =
              item.game.toLowerCase().includes(topUpSearch.toLowerCase()) ||
              item.item.toLowerCase().includes(topUpSearch.toLowerCase()) ||
              item.category.toLowerCase().includes(topUpSearch.toLowerCase()) ||
              item.server.toLowerCase().includes(topUpSearch.toLowerCase());
            const matchesCategory =
              selectedTopUpCategory === 'Semua' || item.category === selectedTopUpCategory;
            return matchesSearch && matchesCategory;
          });

          const totalPages = Math.max(1, Math.ceil(filtered.length / topUpItemsPerPage));
          const currentPage = Math.min(topUpPage, totalPages);
          const startIndex = (currentPage - 1) * topUpItemsPerPage;

          return (
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-mono">
                  {filtered.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + topUpItemsPerPage, filtered.length)}
                </strong>{' '}
                dari <strong className="text-slate-800 font-mono">{filtered.length}</strong> paket Top Up{' '}
                <span className="text-slate-400 font-mono">(Total: {topUpList.length} item Top Up)</span>
              </div>

              {/* Pagination Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTopUpPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setTopUpPage((p) => Math.min(totalPages, p + 1))}
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
