import React, { useState } from 'react';
import {
  Box,
  RefreshCw,
  Search,
  Tag,
  ArrowLeftRight,
  Check,
  Pencil,
  X,
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gift,
  Layers,
} from 'lucide-react';
import { PremiumProduct, VariantPricingItem } from '../../types/dashboard.types';
import { usePromos } from '../../hooks/usePromos';
import { TabKuponPromo } from './TabKuponPromo';

interface TabProdukProps {
  productsList: PremiumProduct[];
  loadingProducts: boolean;
  productSearch: string;
  setProductSearch: (val: string) => void;
  selectedProductCategory: string;
  setSelectedProductCategory: (cat: string) => void;
  onRefreshProducts: () => void;
  showToast: (msg: string) => void;
  // Props Pengaturan Harga General
  pricingMode: 'rp' | 'percent';
  pricingValue: number;
  inputVal: string;
  setInputVal: (val: string) => void;
  isSavingPricing: boolean;
  savePricing: (newMode?: 'rp' | 'percent', newVal?: number) => void;
  handleToggleMode: () => void;
  calculateProductPrice: (originalPrice: number) => { sellingPrice: number; margin: number };
  // Props Pengaturan Harga Custom per-Varian
  variantPricings?: Record<string, VariantPricingItem>;
  isSavingVariantPricing?: boolean;
  calculateVariantPrice?: (
    originalPrice: number,
    variantId?: string | number,
    productName?: string,
    variantName?: string
  ) => {
    isCustom: boolean;
    mode: 'rp' | 'percent';
    value: number;
    margin: number;
    sellingPrice: number;
  };
  getVariantPricingInfo?: (
    variantId?: string | number,
    productName?: string,
    variantName?: string
  ) => VariantPricingItem | null;
  saveVariantPricing?: (
    variantId: string | number,
    options: {
      productName?: string;
      variantName?: string;
      pricingType: 'general' | 'custom';
      mode?: 'rp' | 'percent';
      value?: number;
    }
  ) => Promise<boolean>;
  // Optional Kupon Promo integration (Opsi A)
  promosState?: ReturnType<typeof usePromos>;
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
  pricingMode,
  pricingValue,
  inputVal,
  setInputVal,
  isSavingPricing,
  savePricing,
  handleToggleMode,
  calculateProductPrice,
  variantPricings = {},
  isSavingVariantPricing = false,
  calculateVariantPrice,
  getVariantPricingInfo,
  saveVariantPricing,
  promosState,
}) => {
  // Sub-tab: Katalog Produk vs Kupon Promo (Opsi A)
  const [activeSubTab, setActiveSubTab] = useState<'katalog' | 'promo'>('katalog');

  // Pagination State for Premium Products Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const sampleCalc = calculateProductPrice(10000);

  // State Modal Pengaturan Harga Khusus Varian
  const [editingVariant, setEditingVariant] = useState<{
    id: string | number;
    productName: string;
    variantName: string;
    originalPrice: number;
  } | null>(null);

  const [modalPricingType, setModalPricingType] = useState<'general' | 'custom'>('general');
  const [modalPricingMode, setModalPricingMode] = useState<'rp' | 'percent'>('rp');
  const [modalPricingInput, setModalPricingInput] = useState<string>('100');

  const handleOpenVariantModal = (prod: PremiumProduct) => {
    const existing = getVariantPricingInfo
      ? getVariantPricingInfo(prod.id, prod.name, prod.variant)
      : variantPricings[String(prod.id)];

    if (existing && existing.pricingType === 'custom') {
      setModalPricingType('custom');
      setModalPricingMode(existing.mode || 'rp');
      setModalPricingInput(String(existing.value !== undefined ? existing.value : 100));
    } else {
      setModalPricingType('general');
      setModalPricingMode(pricingMode);
      setModalPricingInput(String(pricingValue));
    }

    setEditingVariant({
      id: prod.id,
      productName: prod.name,
      variantName: prod.variant,
      originalPrice: Number(prod.price) || 0,
    });
  };

  const handleCloseVariantModal = () => {
    setEditingVariant(null);
  };

  const handleSaveVariantModal = async () => {
    if (!editingVariant || !saveVariantPricing) return;

    const numVal = Number(modalPricingInput);
    const cleanVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;

    const success = await saveVariantPricing(editingVariant.id, {
      productName: editingVariant.productName,
      variantName: editingVariant.variantName,
      pricingType: modalPricingType,
      mode: modalPricingMode,
      value: cleanVal,
    });

    if (success) {
      handleCloseVariantModal();
    }
  };

  // Filter List Produk
  const filteredProducts = productsList.filter((prod) => {
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
          nameLower.includes('adobe')
        );
      }
      if (selectedProductCategory === 'Editing') {
        return (
          catLower.includes('edit') ||
          nameLower.includes('capcut') ||
          nameLower.includes('vsco') ||
          nameLower.includes('alight')
        );
      }
      if (selectedProductCategory === 'AI Tool') {
        return (
          catLower.includes('ai') ||
          nameLower.includes('chatgpt') ||
          nameLower.includes('claude') ||
          nameLower.includes('midjourney')
        );
      }
      return prod.category === selectedProductCategory;
    })();

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation: Katalog Produk vs Kupon Promo (Opsi A) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('katalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'katalog'
              ? 'bg-[#0084D1] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Katalog Produk &amp; Harga</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'katalog' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {productsList.length}
          </span>
        </button>

        {promosState && (
          <button
            type="button"
            onClick={() => setActiveSubTab('promo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'promo'
                ? 'bg-[#0084D1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Kupon Promo Diskon</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSubTab === 'promo'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {promosState.promos.length}
            </span>
          </button>
        )}
      </div>

      {/* RENDER SUB-TAB KUPON PROMO JIKA AKTIF */}
      {activeSubTab === 'promo' && promosState ? (
        <TabKuponPromo
          promosState={promosState}
          productsList={productsList}
          pricingMode={pricingMode}
          pricingValue={pricingValue}
          variantPricings={variantPricings}
          calculateVariantPrice={calculateVariantPrice}
          showToast={showToast}
        />
      ) : (
        /* RENDER SUB-TAB KATALOG PRODUK & HARGA */
        <div className="space-y-6">
          {/* 1. Panel Set Harga Produk General */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0084D1]">
                    <Tag className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Set Harga Produk (General)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Atur margin keuntungan default untuk seluruh varian aplikasi premium.
                </p>
              </div>

              {/* Badge Mode Aktif */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Aktif:{' '}
                  {pricingMode === 'rp'
                    ? `+Rp ${pricingValue.toLocaleString('id-ID')}`
                    : `+${pricingValue}%`}
                </span>
              </div>
            </div>

            {/* Input Margin General */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 focus-within:bg-white transition shadow-2xs">
                <div className="px-3.5 text-xs font-bold text-slate-500 select-none border-r border-slate-200 bg-slate-100 py-2.5">
                  {pricingMode === 'rp' ? 'Rp' : '%'}
                </div>
                <input
                  type="number"
                  min="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      savePricing(pricingMode, Number(inputVal));
                    }
                  }}
                  placeholder={
                    pricingMode === 'rp'
                      ? 'Masukkan nominal angka markup (contoh: 2000)'
                      : 'Masukkan persentase markup (contoh: 15)'
                  }
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <div className="flex items-center pr-1.5 py-1">
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#0084D1]" />
                    <span>
                      Mode:{' '}
                      <strong className="text-[#0084D1]">
                        {pricingMode === 'rp' ? 'Rp' : '%'}
                      </strong>
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => savePricing(pricingMode, Number(inputVal))}
                disabled={isSavingPricing}
                className="px-4 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
              >
                {isSavingPricing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Simpan Pengaturan</span>
              </button>
            </div>

            {/* Simulasi Ringkas */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Formula Aktif:</span>
                <span>
                  {pricingMode === 'rp'
                    ? `Harga Asli + Rp ${Number(inputVal || 0).toLocaleString('id-ID')}`
                    : `Harga Asli + ${Number(inputVal || 0)}%`}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Simulasi Modal Rp 10.000: Harga Jual{' '}
                <strong className="text-slate-900 font-bold">
                  Rp {sampleCalc.sellingPrice.toLocaleString('id-ID')}
                </strong>{' '}
                (Margin: +Rp {sampleCalc.margin.toLocaleString('id-ID')})
              </div>
            </div>
          </div>

          {/* 2. Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari aplikasi atau varian (Netflix, Spotify, Canva)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 transition shadow-2xs"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills & Refresh */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {['Semua', 'Streaming', 'Music', 'Design', 'Editing', 'AI Tool'].map((cat) => {
                const isActive = selectedProductCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedProductCategory(cat);
                      setCurrentPage(1);
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
                  onRefreshProducts();
                  showToast('Menyinkronkan katalog produk Xaviera...');
                }}
                disabled={loadingProducts}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loadingProducts ? 'animate-spin text-[#0084D1]' : 'text-slate-500'
                  }`}
                />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* 3. DAFTAR PRODUK (RESPONSIF: MOBILE CARD VIEW & DESKTOP TABEL) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            {paginatedProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Box className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                <div className="font-bold text-slate-800 text-sm">
                  {productsList.length === 0
                    ? 'Katalog Produk Kosong'
                    : 'Tidak Ada Produk Sesuai Filter'}
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto px-4">
                  {productsList.length === 0
                    ? 'Pastikan API Key Xaviera Store sudah diisi dengan benar di menu Koneksi Layanan.'
                    : 'Coba ubah kata kunci pencarian atau kategori filter di atas.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4 w-44 text-left">Nama Aplikasi</th>
                        <th className="py-3 px-4 text-left">Varian Paket</th>
                        <th className="py-3 px-4 text-center w-28">Stok</th>
                        <th className="py-3 px-4 text-right w-36">Harga Modal</th>
                        <th className="py-3 px-4 text-right w-52">Harga Jual &amp; Margin</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {paginatedProducts.map((prod) => {
                        const origPrice = Number(prod.price) || 0;
                        const variantCalc = calculateVariantPrice
                          ? calculateVariantPrice(origPrice, prod.id, prod.name, prod.variant)
                          : {
                              isCustom: false,
                              mode: pricingMode,
                              value: pricingValue,
                              margin: sampleCalc.margin,
                              sellingPrice: sampleCalc.sellingPrice,
                            };

                        const isCustom = variantCalc.isCustom;
                        const margin = variantCalc.margin;
                        const sellingPrice = variantCalc.sellingPrice;
                        const isOutOfStock =
                          Number(prod.stock) === 0 ||
                          String(prod.stock).toLowerCase() === 'habis' ||
                          String(prod.stock).toLowerCase() === 'empty';

                        return (
                          <tr
                            key={prod.id}
                            className="hover:bg-sky-50/30 transition-colors group"
                          >
                            {/* Nama Produk */}
                            <td className="py-3 px-4 align-middle">
                              <div className="font-bold text-slate-900 text-xs">
                                {prod.name}
                              </div>
                              <span className="text-[10px] font-medium text-slate-400">
                                {prod.category || 'APK Premium'}
                              </span>
                            </td>

                            {/* Varian */}
                            <td className="py-3 px-4 align-middle">
                              <span className="font-medium text-slate-800">
                                {prod.variant}
                              </span>
                            </td>

                            {/* Stok */}
                            <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Habis
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                  {prod.stock} unit
                                </span>
                              )}
                            </td>

                            {/* Harga Modal Asli */}
                            <td className="py-3 px-4 text-right align-middle whitespace-nowrap font-mono text-slate-500">
                              Rp {origPrice.toLocaleString('id-ID')}
                            </td>

                            {/* Harga Jual & Icon Pensil Custom */}
                            <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                <div className="text-right">
                                  <div className="font-bold font-mono text-slate-900 text-xs">
                                    Rp {sellingPrice.toLocaleString('id-ID')}
                                  </div>
                                  <div className="text-[10px] font-mono flex items-center justify-end gap-1">
                                    {isCustom ? (
                                      <span className="text-amber-700 font-semibold bg-amber-50 px-1 rounded border border-amber-200">
                                        Custom (+Rp {margin.toLocaleString('id-ID')})
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700">
                                        +Rp {margin.toLocaleString('id-ID')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Tombol Pensil untuk Set Custom Harga Varian */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenVariantModal(prod)}
                                  title="Atur harga custom varian ini"
                                  className={`p-1.5 rounded-lg border transition cursor-pointer shadow-2xs ${
                                    isCustom
                                      ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                      : 'bg-white border-slate-200 text-slate-400 hover:text-[#0084D1] hover:border-sky-300 hover:bg-sky-50'
                                  }`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}

            {/* Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Info Items & Selector */}
                <div className="flex items-center gap-3 text-slate-600">
                  <span>
                    Menampilkan{' '}
                    <strong className="text-slate-900 font-mono">
                      {startIndex + 1}
                    </strong>
                    -
                    <strong className="text-slate-900 font-mono">
                      {Math.min(startIndex + itemsPerPage, filteredProducts.length)}
                    </strong>{' '}
                    dari{' '}
                    <strong className="text-slate-900 font-mono">
                      {filteredProducts.length}
                    </strong>{' '}
                    produk
                  </span>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                    <span className="text-[11px] text-slate-500">Per halaman:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-[#0084D1]"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800">
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SET HARGA CUSTOM VARIAN */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0084D1]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Pengaturan Harga Varian
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseVariantModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  {editingVariant.productName}
                </div>
                <div className="text-xs text-slate-600">
                  Varian:{' '}
                  <span className="font-semibold text-[#0084D1]">
                    {editingVariant.variantName}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Harga Modal Asli: Rp {editingVariant.originalPrice.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Pilihan: Mengikuti General atau Custom */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Skema Penentuan Harga
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPricingType('general')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      modalPricingType === 'general'
                        ? 'border-[#0084D1] bg-sky-50 text-[#0084D1]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Ikuti General</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {pricingMode === 'rp'
                        ? `+Rp ${pricingValue.toLocaleString('id-ID')}`
                        : `+${pricingValue}%`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalPricingType('custom')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      modalPricingType === 'custom'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Custom Varian</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Atur khusus varian ini
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Custom jika memilih 'custom' */}
              {modalPricingType === 'custom' && (
                <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-800">
                    Margin Khusus Varian
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#0084D1] focus-within:ring-2 focus-within:ring-[#0084D1]/20 focus-within:bg-white transition">
                    <div className="px-3 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100 py-2.5">
                      {modalPricingMode === 'rp' ? 'Rp' : '%'}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={modalPricingInput}
                      onChange={(e) => setModalPricingInput(e.target.value)}
                      placeholder={modalPricingMode === 'rp' ? 'Contoh: 3000' : 'Contoh: 20'}
                      className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none"
                    />
                    <div className="pr-1.5 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          setModalPricingMode((m) => (m === 'rp' ? 'percent' : 'rp'))
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {modalPricingMode === 'rp' ? 'Mode: Rp' : 'Mode: %'}
                      </button>
                    </div>
                  </div>

                  {/* Simulasi Harga Jual Akhir */}
                  <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                    {(() => {
                      const num = Number(modalPricingInput) || 0;
                      const customMargin =
                        modalPricingMode === 'rp'
                          ? num
                          : Math.round((editingVariant.originalPrice * num) / 100);
                      const finalSelling = editingVariant.originalPrice + customMargin;
                      return (
                        <div className="flex items-center justify-between">
                          <span>Estimasi Harga Jual:</span>
                          <span className="font-bold font-mono">
                            Rp {finalSelling.toLocaleString('id-ID')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseVariantModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveVariantModal}
                disabled={isSavingVariantPricing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0084D1] hover:bg-[#0073B7] text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSavingVariantPricing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Terapkan Harga</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
