import React from 'react';
import { Box, RefreshCw, Search } from 'lucide-react';
import { PremiumProduct } from '../../types/dashboard.types';

interface TabProdukProps {
  productsList: PremiumProduct[];
  loadingProducts: boolean;
  productSearch: string;
  setProductSearch: (val: string) => void;
  selectedProductCategory: string;
  setSelectedProductCategory: (cat: string) => void;
  onRefreshProducts: () => void;
  showToast: (msg: string) => void;
}

export const TabProduk: React.FC<TabProdukProps> = ({
  productsList,
  loadingProducts,
  productSearch,
  setProductSearch,
  selectedProductCategory,
  setSelectedProductCategory,
  onRefreshProducts,
  showToast,
}) => {
  return (
    <div className="space-y-5">
      {/* Header Tab Produk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Katalog Aplikasi &amp; Akun Premium
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar akun premium aktif, varian paket, ketersediaan stok, dan tarif harga Xaviera Store.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRefreshProducts();
              showToast('Menyinkronkan data katalog produk...');
            }}
            disabled={loadingProducts}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span>Sinkronkan Produk</span>
          </button>
        </div>
      </div>

      {/* Filter Kategori & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Cari aplikasi atau varian (contoh: Netflix, Spotify)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
          />
          {productSearch && (
            <button
              type="button"
              onClick={() => setProductSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Kategori Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {['Semua', 'Streaming', 'Music', 'Design', 'Editing', 'AI Tool'].map((cat) => {
            const isActive = selectedProductCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedProductCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-md transition cursor-pointer whitespace-nowrap font-medium ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel Produk Premium Sesuai Tangkapan Layar Asli */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-48 text-left">Nama</th>
              <th className="py-3 px-4 text-left">Varian</th>
              <th className="py-3 px-4 text-center w-28">Stok</th>
              <th className="py-3 px-4 text-right w-36">Harga Asli</th>
              <th className="py-3 px-4 text-right w-44">Harga Jual (+10%)</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {(() => {
              const filtered = productsList.filter((prod) => {
                const searchLower = productSearch.toLowerCase();
                const matchesSearch =
                  prod.name.toLowerCase().includes(searchLower) ||
                  prod.variant.toLowerCase().includes(searchLower);

                const matchesCategory = (() => {
                  if (selectedProductCategory === 'Semua') return true;
                  const catLower = (prod.category || '').toLowerCase();
                  const nameLower = (prod.name || '').toLowerCase();
                  if (selectedProductCategory === 'Streaming') {
                    return (
                      catLower.includes('stream') ||
                      nameLower.includes('netflix') ||
                      nameLower.includes('youtube') ||
                      nameLower.includes('disney') ||
                      nameLower.includes('viu') ||
                      nameLower.includes('prime') ||
                      nameLower.includes('wetv')
                    );
                  }
                  if (selectedProductCategory === 'Music') {
                    return (
                      catLower.includes('mus') ||
                      nameLower.includes('spotify') ||
                      nameLower.includes('apple music')
                    );
                  }
                  if (selectedProductCategory === 'Design') {
                    return (
                      catLower.includes('design') ||
                      nameLower.includes('canva') ||
                      nameLower.includes('picsart') ||
                      nameLower.includes('polar')
                    );
                  }
                  if (selectedProductCategory === 'Editing') {
                    return (
                      catLower.includes('edit') ||
                      nameLower.includes('capcut') ||
                      nameLower.includes('alight') ||
                      nameLower.includes('remini') ||
                      nameLower.includes('meitu') ||
                      nameLower.includes('vsco')
                    );
                  }
                  if (selectedProductCategory === 'AI Tool') {
                    return (
                      catLower.includes('ai') ||
                      nameLower.includes('gemini') ||
                      nameLower.includes('chatgpt') ||
                      nameLower.includes('claude') ||
                      nameLower.includes('leonardo')
                    );
                  }
                  return catLower.includes(selectedProductCategory.toLowerCase());
                })();

                return matchesSearch && matchesCategory;
              });

              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 space-y-1">
                      <Box className="w-8 h-8 mx-auto text-slate-300" />
                      <div className="font-medium text-slate-700">
                        {productsList.length === 0
                          ? 'Katalog Produk Kosong'
                          : 'Tidak ada produk ditemukan'}
                      </div>
                      <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {productsList.length === 0
                          ? 'Klik tombol "Sinkronkan Produk" untuk memuat daftar produk dari API Xaviera.'
                          : 'Coba ubah kata kunci pencarian atau ganti filter kategori.'}
                      </div>
                    </td>
                  </tr>
                );
              }

              return filtered.map((prod, index) => {
                const prevProd = index > 0 ? filtered[index - 1] : null;
                const isNewGroup = !prevProd || prevProd.name !== prod.name;
                const isOutOfStock = Number(prod.stock) <= 0;

                const originalPrice = Number(prod.price) || 0;
                const margin = Math.round(originalPrice * 0.1);
                const sellingPrice = originalPrice + margin;

                return (
                  <tr
                    key={prod.id}
                    className={`transition-colors hover:bg-slate-50/50 ${
                      isNewGroup
                        ? index === 0
                          ? ''
                          : 'border-t border-slate-200/80'
                        : 'border-t border-slate-50/60'
                    }`}
                  >
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {isNewGroup ? (
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-sky-600 shrink-0" />
                          <span className="font-bold text-slate-900 text-sm tracking-tight">
                            {prod.name}
                          </span>
                        </div>
                      ) : (
                        <div className="pl-6 text-slate-300 font-mono text-xs select-none">
                          —— -
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      <span className="text-xs text-slate-800 font-medium">
                        {prod.variant}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md border border-rose-300 text-xs font-medium text-rose-500">
                          0
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{prod.stock}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <span className="text-xs text-slate-500 font-normal">
                        Rp{originalPrice.toLocaleString('id-ID')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <span className="font-bold text-sm text-slate-900">
                          Rp{sellingPrice.toLocaleString('id-ID')}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-emerald-300/60 bg-emerald-50 text-[11px] font-medium text-emerald-600">
                          ({margin.toLocaleString('id-ID')})
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
    </div>
  );
};
