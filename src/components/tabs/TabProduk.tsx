import React, { useState } from 'react';
import { Box, RefreshCw, Search, Tag, ArrowLeftRight, Check, Pencil, X, Sliders, Sparkles } from 'lucide-react';
import { PremiumProduct, VariantPricingItem } from '../../types/dashboard.types';

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
}) => {
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

  return (
    <div className="space-y-6">
      {/* 1. Panel Paling Atas: SET HARGA PRODUK */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Set Harga Produk
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur keuntungan margin penjualan produk. Pilih penambahan nominal tetap (Rp) atau persentase (%).
            </p>
          </div>

          {/* Badge Mode Aktif */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Aktif: {pricingMode === 'rp' ? `+Rp ${pricingValue.toLocaleString('id-ID')}` : `+${pricingValue}%`}
            </span>
          </div>
        </div>

        {/* Kolom Form Input Angka & Tombol Toggle Mode di Sampingnya */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Kolom Input Angka dengan Prefix dan Tombol Toggle Mode */}
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 focus-within:bg-white transition shadow-2xs">
            <div className="px-3 text-xs font-bold text-slate-400 select-none border-r border-slate-200/80 bg-slate-100/60 py-2.5">
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
              placeholder={pricingMode === 'rp' ? 'Masukkan nominal angka (contoh: 100)' : 'Masukkan angka persentase (contoh: 10)'}
              className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {/* Tombol di samping kolom untuk berganti mode antara Rp atau % */}
            <div className="flex items-center pr-1.5 py-1">
              <button
                type="button"
                onClick={handleToggleMode}
                title="Klik untuk berganti mode antara Rp dan %"
                className="px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-sky-600" />
                <span>Mode: <strong className="text-sky-700 font-extrabold">{pricingMode === 'rp' ? 'Rp' : '%'}</strong></span>
              </button>
            </div>
          </div>

          {/* Tombol Simpan Pengaturan */}
          <button
            type="button"
            onClick={() => savePricing(pricingMode, Number(inputVal))}
            disabled={isSavingPricing}
            className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60"
          >
            {isSavingPricing ? (
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
            {pricingMode === 'rp' ? (
              <span className="text-slate-800 font-medium">Harga Asli + Rp {Number(inputVal || 0).toLocaleString('id-ID')}</span>
            ) : (
              <span className="text-slate-800 font-medium">Harga Asli + {Number(inputVal || 0)}%</span>
            )}
          </div>
          <div className="text-slate-500 text-[11px]">
            Simulasi Modal Rp 10.000: Harga Jual <strong className="text-slate-900 font-semibold">Rp {sampleCalc.sellingPrice.toLocaleString('id-ID')}</strong> (Margin: +Rp {sampleCalc.margin.toLocaleString('id-ID')})
          </div>
        </div>
      </div>

      {/* 2. Header & Filter Katalog Produk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Katalog Aplikasi &amp; Akun Premium
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar akun premium aktif, ketersediaan stok, harga asli supplier, dan harga jual terhitung.
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
              x
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

      {/* 3. Tabel Produk Premium */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-48 text-left">Nama</th>
              <th className="py-3 px-4 text-left">Varian</th>
              <th className="py-3 px-4 text-center w-28">Stok</th>
              <th className="py-3 px-4 text-right w-36">Harga Asli</th>
              <th className="py-3 px-4 text-right w-48">
                Harga Jual ({pricingMode === 'rp' ? `+Rp${pricingValue.toLocaleString('id-ID')}` : `+${pricingValue}%`})
              </th>
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
                const variantPriceInfo = calculateVariantPrice
                  ? calculateVariantPrice(originalPrice, prod.id, prod.name, prod.variant)
                  : { ...calculateProductPrice(originalPrice), isCustom: false, mode: pricingMode, value: pricingValue };
                const { sellingPrice, margin, isCustom } = variantPriceInfo;

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
                        <div className="pl-6 text-slate-300 text-xs select-none">
                          *
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
                      <div className="inline-flex items-center justify-end gap-2">
                        {isCustom && (
                          <span
                            title="Varian ini menggunakan harga custom khusus"
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 border border-indigo-200/80 text-indigo-700 tracking-tight"
                          >
                            Custom
                          </span>
                        )}
                        <div className="text-right">
                          <span className="font-bold text-sm text-slate-900 block">
                            Rp{sellingPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            (+Rp{margin.toLocaleString('id-ID')})
                          </span>
                        </div>
                        {/* Tombol Icon Pensil untuk Pengaturan Harga Varian */}
                        <button
                          type="button"
                          onClick={() => handleOpenVariantModal(prod)}
                          title={`Atur harga khusus untuk varian: ${prod.variant}`}
                          className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                            isCustom
                              ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 shadow-2xs'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* 4. Pop-up Modal Pengaturan Harga Khusus Varian */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Pengaturan Harga Varian
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-sm">
                    {editingVariant.productName} • <span className="font-medium text-slate-700">{editingVariant.variantName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseVariantModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Ringkasan Modal Asli Supplier */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Harga Asli (Modal Supplier):</span>
                  <span className="text-sm font-bold text-slate-900">
                    Rp {editingVariant.originalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium block">Status Harga Saat Ini:</span>
                  <span className={`inline-flex items-center gap-1 font-semibold text-xs ${modalPricingType === 'custom' ? 'text-indigo-600' : 'text-sky-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${modalPricingType === 'custom' ? 'bg-indigo-500' : 'bg-sky-500'}`}></span>
                    {modalPricingType === 'custom' ? 'Harga Custom' : 'Ikuti General'}
                  </span>
                </div>
              </div>

              {/* Pilihan: Ikuti Harga General vs Harga Custom */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-xs block">
                  Pilih Skema Harga untuk Varian Ini:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opsi 1: Ikuti Harga General */}
                  <div
                    onClick={() => setModalPricingType('general')}
                    className={`border rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
                      modalPricingType === 'general'
                        ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
                        : 'border-slate-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-sky-600" />
                        Ikuti Harga General
                      </span>
                      <input
                        type="radio"
                        name="pricingType"
                        checked={modalPricingType === 'general'}
                        onChange={() => setModalPricingType('general')}
                        className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Otomatis mengikuti Set Harga Produk umum toko ({pricingMode === 'rp' ? `+Rp ${pricingValue.toLocaleString('id-ID')}` : `+${pricingValue}%`}).
                    </p>
                  </div>

                  {/* Opsi 2: Harga Custom */}
                  <div
                    onClick={() => setModalPricingType('custom')}
                    className={`border rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
                      modalPricingType === 'custom'
                        ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        Harga Custom (Khusus)
                      </span>
                      <input
                        type="radio"
                        name="pricingType"
                        checked={modalPricingType === 'custom'}
                        onChange={() => setModalPricingType('custom')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tentukan margin keuntungan sendiri tanpa beracuan pada harga produk general toko.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input Custom Harga (Hanya muncul jika memilih Harga Custom) */}
              {modalPricingType === 'custom' ? (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800 text-xs">
                      Atur Margin Keuntungan Varian:
                    </label>
                    <span className="text-[11px] text-indigo-600 font-semibold">
                      Mode Aktif: {modalPricingMode === 'rp' ? 'Nominal (Rp)' : 'Persentase (%)'}
                    </span>
                  </div>

                  {/* Kolom Form Input Angka & Tombol Toggle Mode di Sampingnya (persis seperti Set Harga Produk) */}
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:bg-white transition shadow-2xs">
                      <div className="px-3 text-xs font-bold text-slate-400 select-none border-r border-slate-200/80 bg-slate-100/60 py-2.5">
                        {modalPricingMode === 'rp' ? 'Rp' : '%'}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={modalPricingInput}
                        onChange={(e) => setModalPricingInput(e.target.value)}
                        placeholder={modalPricingMode === 'rp' ? 'Masukkan angka margin (contoh: 500)' : 'Masukkan persentase (contoh: 15)'}
                        className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                      {/* Tombol berganti mode di samping kolom */}
                      <div className="flex items-center pr-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => setModalPricingMode((prev) => (prev === 'rp' ? 'percent' : 'rp'))}
                          title="Klik untuk berganti mode antara Rp dan %"
                          className="px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs active:scale-[0.98]"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Mode: <strong className="text-indigo-700 font-extrabold">{modalPricingMode === 'rp' ? 'Rp' : '%'}</strong></span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Simulasi Real-Time Khusus Varian Ini */}
                  {(() => {
                    const base = editingVariant.originalPrice;
                    const numVal = Number(modalPricingInput || 0);
                    const margin = modalPricingMode === 'percent'
                      ? Math.round(base * (numVal / 100))
                      : Math.round(numVal);
                    const selling = base + margin;

                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-[11px] text-slate-500">Formula Custom:</span>
                          <span className="font-semibold text-indigo-900">
                            Rp {base.toLocaleString('id-ID')} + {modalPricingMode === 'rp' ? `Rp ${numVal.toLocaleString('id-ID')}` : `${numVal}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-indigo-100/70">
                          <span className="font-bold text-slate-800">Harga Jual Varian:</span>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-indigo-700">
                              Rp {selling.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold ml-1.5">
                              (+Rp {margin.toLocaleString('id-ID')})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Preview Jika Memilih Ikuti General */
                <div className="pt-2 border-t border-slate-100">
                  {(() => {
                    const base = editingVariant.originalPrice;
                    const genMargin = pricingMode === 'percent'
                      ? Math.round(base * (pricingValue / 100))
                      : Math.round(pricingValue);
                    const genSelling = base + genMargin;

                    return (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px]">Formula General Aktif:</span>
                          <span className="font-semibold text-slate-800">
                            Harga Asli + {pricingMode === 'rp' ? `Rp ${pricingValue.toLocaleString('id-ID')}` : `${pricingValue}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="font-bold text-slate-800">Harga Jual Terhitung:</span>
                          <div className="text-right">
                            <span className="font-bold text-sm text-slate-900">
                              Rp {genSelling.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold ml-1.5">
                              (+Rp {genMargin.toLocaleString('id-ID')})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseVariantModal}
                disabled={isSavingVariantPricing}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveVariantModal}
                disabled={isSavingVariantPricing}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSavingVariantPricing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

