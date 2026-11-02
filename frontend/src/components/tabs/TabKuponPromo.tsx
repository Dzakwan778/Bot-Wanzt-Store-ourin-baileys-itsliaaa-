import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Check,
  X,
  Pencil,
  Trash2,
  Copy,
  Clock,
  Infinity,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Layers,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { usePromos } from '../../hooks/usePromos';
import { PremiumProduct, VariantPricingItem } from '../../types/dashboard.types';

interface TabKuponPromoProps {
  promosState: ReturnType<typeof usePromos>;
  productsList: PremiumProduct[];
  pricingMode: 'rp' | 'percent';
  pricingValue: number;
  variantPricings?: Record<string, VariantPricingItem>;
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
  showToast: (msg: string) => void;
}

export const TabKuponPromo: React.FC<TabKuponPromoProps> = ({
  promosState,
  productsList,
  pricingMode,
  pricingValue,
  variantPricings = {},
  calculateVariantPrice,
  showToast,
}) => {
  const {
    filteredPromos,
    promos,
    loading,
    isSubmitting,
    searchPromo,
    setSearchPromo,
    statusFilter,
    setStatusFilter,
    isFormOpen,
    editingPromo,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    togglePromo,
    deletePromo,
    confirmDelete,
    cancelDelete,
    promoToDelete,
    generateRandomCode,
    formCode,
    setFormCode,
    formDiscountMode,
    setFormDiscountMode,
    formDiscountValue,
    setFormDiscountValue,
    formMinSpend,
    setFormMinSpend,
    formQuota,
    setFormQuota,
    formIsUnlimitedQuota,
    setFormIsUnlimitedQuota,
    formIsForever,
    setFormIsForever,
    formValidUntil,
    setFormValidUntil,
    formScopeType,
    setFormScopeType,
    formSelectedVariantIds,
    toggleVariantSelection,
    selectAllVariants,
    deselectAllVariants,
    formIsActive,
    setFormIsActive,
  } = promosState;

  // Search filter khusus untuk varian APK Premium dalam form jangkauan terbatas
  const [variantSearch, setVariantSearch] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // State untuk Live Simulator Margin Protection
  const [simBasePrice, setSimBasePrice] = useState<number>(900);
  const [simMargin, setSimMargin] = useState<number>(90);
  const [simDiscount, setSimDiscount] = useState<number>(100);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Kode "${code}" berhasil disalin.`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter daftar varian APK Premium untuk pilihan "Terbatas"
  const filteredVariants = productsList.filter((p) => {
    if (!variantSearch.trim()) return true;
    const term = variantSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.variant.toLowerCase().includes(term) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  // Perhitungan Live Simulator
  const simSellingPriceBefore = simBasePrice + simMargin;
  const simActualCut = Math.min(simMargin, simDiscount);
  const simFinalMargin = Math.max(0, simMargin - simDiscount);
  const simFinalSellingPrice = simBasePrice + simFinalMargin;

  return (
    <div className="space-y-6 relative">
      {/* Overlay Konfirmasi Hapus (Custom Modal) */}
      {promoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Hapus Kupon?</h3>
                <p className="text-sm text-slate-500">
                  Anda yakin ingin menghapus kode promo <span className="font-bold text-slate-900">{promoToDelete.code}</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-4 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-3.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors border-l border-slate-100 cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header & Action Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-indigo-50/40 p-4 sm:p-5 rounded-xl border border-sky-100 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Kupon Promo APK Premium
            </h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Atur kode promo khusus produk APK Premium. Diskon memotong margin keuntungan toko tanpa pernah menyentuh modal dasar.
          </p>
        </div>

        {/* Tombol Add Kupon yang mudah ditekan */}
        <button
          type="button"
          onClick={() => {
            if (isFormOpen && !editingPromo) {
              closeForm();
            } else {
              openCreateForm();
            }
          }}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
            isFormOpen && !editingPromo
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-sky-600 text-white hover:bg-sky-700 hover:shadow-sky-200'
          }`}
        >
          {isFormOpen && !editingPromo ? (
            <>
              <X className="w-4 h-4" />
              <span>Tutup Form</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Buat Kupon Baru</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Banner Edukasi: Aturan Margin Protection */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4 text-xs text-emerald-950 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-emerald-900">Peraturan Margin Protection Aktif</p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Diskon kupon hanya memotong margin keuntungan toko, tidak pernah memotong harga modal dasar. Kupon hanya berlaku untuk APK Premium (tidak berlaku untuk SMM &amp; Top Up).
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 bg-white/90 border border-emerald-200 px-3 py-1.5 rounded-lg text-[11px] font-mono text-emerald-800">
          <span>Modal Rp 900</span>
          <span className="text-slate-400">+</span>
          <span>Margin Rp 90</span>
          <ArrowRight className="w-3 h-3 text-emerald-600" />
          <span className="font-bold text-emerald-700">Min Rp 900</span>
        </div>
      </div>

      {/* 3. Form Tambah / Edit Kupon Promo (Mudah diedit sewaktu-waktu) */}
      {isFormOpen && (
        <div className="bg-white border-2 border-sky-300/80 rounded-xl p-4 sm:p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
                {editingPromo ? '✏️' : '✨'}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {editingPromo ? `Edit Kupon Promo: ${editingPromo.code}` : 'Buat Kupon Promo Baru'}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Tutup Form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Kolom 1: Kode Promo & Mode Potongan */}
            <div className="space-y-4">
              {/* Input Kode Promo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kode Promo <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="Contoh: HEMAT10K"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => generateRandomCode()}
                    className="px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition cursor-pointer whitespace-nowrap"
                    title="Buat kode unik otomatis"
                  >
                    Acak Kode
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Gunakan huruf kapital dan angka tanpa spasi.</p>
              </div>

              {/* Mode & Nilai Potongan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Besaran Potongan <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {/* Selector Mode Rp / % */}
                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormDiscountMode('rp')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                        formDiscountMode === 'rp'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rp
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountMode('percent')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                        formDiscountMode === 'percent'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      %
                    </button>
                  </div>

                  {/* Input Angka Potongan */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={formDiscountMode === 'percent' ? 100 : undefined}
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(e.target.value)}
                      placeholder={formDiscountMode === 'rp' ? '5000' : '20'}
                      className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                      {formDiscountMode === 'rp' ? 'Rupiah' : '%'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formDiscountMode === 'rp'
                    ? `Diskon nominal Rp ${Number(formDiscountValue || 0).toLocaleString('id-ID')} (maksimal memotong habis margin).`
                    : `Diskon ${Number(formDiscountValue || 0)}% dari margin keuntungan toko.`}
                </p>
              </div>

              {/* Minimal Belanja */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Minimal Belanja (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={formMinSpend}
                    onChange={(e) => setFormMinSpend(e.target.value)}
                    placeholder="Kosongkan jika tanpa minimal belanja"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {formMinSpend && Number(formMinSpend) > 0
                    ? `Kupon dapat dipakai jika total pesanan minimal Rp ${Number(formMinSpend).toLocaleString('id-ID')}.`
                    : 'Kupon dapat dipakai tanpa syarat minimal transaksi.'}
                </p>
              </div>
            </div>

            {/* Kolom 2: Kuota & Masa Berlaku */}
            <div className="space-y-4">
              {/* Kuota Penggunaan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kuota Penggunaan
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsUnlimitedQuota}
                      onChange={(e) => {
                        setFormIsUnlimitedQuota(e.target.checked);
                        if (e.target.checked) setFormQuota('');
                      }}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-700 font-medium">Tanpa Batas Kuota (Unlimited)</span>
                  </label>

                  {!formIsUnlimitedQuota && (
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={formQuota}
                        onChange={(e) => setFormQuota(e.target.value)}
                        placeholder="Contoh: 100"
                        className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">kali pakai</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {formIsUnlimitedQuota
                    ? 'Bisa digunakan berulang kali oleh siapa saja.'
                    : `Maksimal kupon dapat digunakan sebanyak ${formQuota || 0} kali.`}
                </p>
              </div>

              {/* Masa Berlaku */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Masa Berlaku
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsForever}
                      onChange={(e) => setFormIsForever(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-700 font-medium">Berlaku Selamanya (Forever)</span>
                  </label>

                  {!formIsForever && (
                    <input
                      type="date"
                      value={formValidUntil}
                      onChange={(e) => setFormValidUntil(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {formIsForever
                    ? 'Kupon tidak memiliki tanggal kedaluwarsa.'
                    : `Berlaku hingga tanggal ${formValidUntil || '-'}.`}
                </p>
              </div>

              {/* Status Langsung Aktif */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span className="text-xs text-slate-800 font-semibold">Aktifkan kupon ini sekarang</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4. Pemilihan Jenis / Jangkauan Promo */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800">
                Jangkauan Kupon Promo <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Pilih apakah kupon berlaku untuk semua varian APK Premium atau hanya varian tertentu.
              </p>
            </div>

            {/* Toggle Jenis: All vs Terbatas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setFormScopeType('all')}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
                  formScopeType === 'all'
                    ? 'border-sky-600 bg-sky-50/50 text-sky-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="scopeType"
                  checked={formScopeType === 'all'}
                  onChange={() => setFormScopeType('all')}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-900">Jenis All (Semua APK Premium)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kupon dapat digunakan untuk seluruh produk dan varian APK Premium tanpa batasan item.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setFormScopeType('restricted')}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
                  formScopeType === 'restricted'
                    ? 'border-sky-600 bg-sky-50/50 text-sky-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="scopeType"
                  checked={formScopeType === 'restricted'}
                  onChange={() => setFormScopeType('restricted')}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-900">Jenis Terbatas (Varian Tertentu)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kupon hanya berlaku untuk varian APK Premium yang diaktifkan (toggle ON).
                  </p>
                </div>
              </label>
            </div>

            {/* Jika memilih Terbatas: Tampilkan daftar varian APK Premium dengan Toggle on/off */}
            {formScopeType === 'restricted' && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Daftar Varian APK Premium ({formSelectedVariantIds.length} dari {productsList.length} varian aktif)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectAllVariants(productsList.map((p) => p.id))}
                      className="px-2.5 py-1 text-[11px] font-medium text-sky-700 bg-sky-100/70 hover:bg-sky-200/80 rounded-md transition cursor-pointer"
                    >
                      Aktifkan Semua
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllVariants}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-md transition cursor-pointer"
                    >
                      Nonaktifkan Semua
                    </button>
                  </div>
                </div>

                {/* Filter Search Varian */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={variantSearch}
                    onChange={(e) => setVariantSearch(e.target.value)}
                    placeholder="Cari varian APK Premium (misal: Netflix, Spotify, Canva)..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Grid List Varian dengan Toggle Switch */}
                {productsList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                    Belum ada produk APK Premium yang dimuat dari Xaviera.
                  </div>
                ) : filteredVariants.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                    Tidak ada varian yang cocok dengan kata kunci "{variantSearch}".
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {filteredVariants.map((item) => {
                      const isSelected = formSelectedVariantIds.includes(String(item.id));
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleVariantSelection(item.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/70 border-sky-300 text-sky-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                Varian: <span className="font-semibold text-slate-700">{item.variant}</span> | Modal: Rp {item.price.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isSelected ? 'Promo Aktif' : 'Tidak Berlaku'}
                            </span>

                            {/* Accessible Visual Switch */}
                            <div
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                isSelected ? 'bg-sky-600' : 'bg-slate-300'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                  isSelected ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Live Simulation Box (Aturan Margin Protection Visual) */}
          <div className="pt-4 border-t border-slate-100">
            <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
              <summary className="font-semibold text-slate-800 flex items-center justify-between cursor-pointer list-none">
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-600" />
                  <span>Kalkulator Simulasi Margin Protection (Coba Sendiri)</span>
                </span>
                <span className="text-[11px] text-sky-600 font-medium group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60">
                <p className="text-[11px] text-slate-600">
                  Uji coba skenario angka untuk membuktikan bahwa diskon kupon tidak pernah merugikan modal dasar Anda:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600">Harga Modal (Rp)</label>
                    <input
                      type="number"
                      value={simBasePrice}
                      onChange={(e) => setSimBasePrice(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600">Margin Toko (Rp)</label>
                    <input
                      type="number"
                      value={simMargin}
                      onChange={(e) => setSimMargin(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600">Diskon Kupon (Rp)</label>
                    <input
                      type="number"
                      value={simDiscount}
                      onChange={(e) => setSimDiscount(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="bg-white border border-emerald-200 p-2.5 rounded-lg text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Harga Jual Normal:</span>
                    <span className="font-semibold text-slate-900">Rp {simSellingPriceBefore.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Potongan Kupon yang Diizinkan:</span>
                    <span>- Rp {simActualCut.toLocaleString('id-ID')} (maksimal Rp {simMargin})</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1">
                    <span>Harga Akhir Pembeli:</span>
                    <span>Rp {simFinalSellingPrice.toLocaleString('id-ID')} (Modal Rp {simBasePrice} Aman)</span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* 6. Action Form: Simpan & Batal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submitForm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : editingPromo ? 'Simpan Perubahan' : 'Simpan Kupon'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Filter & Pencarian Daftar Kupon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchPromo}
            onChange={(e) => setSearchPromo(e.target.value)}
            placeholder="Cari kode kupon promo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Status Filter */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({promos.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aktif ({promos.filter((p) => p.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-700 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Nonaktif ({promos.filter((p) => !p.isActive).length})
          </button>
        </div>
      </div>

      {/* 5. Daftar Kupon Promo (Tabel / Card Responsive) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Memuat data kupon promo...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Tag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {searchPromo ? 'Kupon promo tidak ditemukan' : 'Belum Ada Kupon Promo'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchPromo
                  ? `Tidak ada kupon yang cocok dengan kata kunci "${searchPromo}".`
                  : 'Buat kupon promo pertama Anda untuk menarik pembeli APK Premium dengan perlindungan margin toko.'}
              </p>
            </div>
            {!searchPromo && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Kupon Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Kode Kupon</th>
                  <th className="py-3 px-4">Potongan</th>
                  <th className="py-3 px-4">Min. Belanja</th>
                  <th className="py-3 px-4">Kuota</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Jangkauan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPromos.map((promo) => {
                  const isExpired = !promo.isForever && promo.validUntil && new Date() > new Date(promo.validUntil);
                  const isQuotaExhausted = promo.quota !== null && promo.usedCount >= promo.quota;

                  return (
                    <tr
                      key={promo.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !promo.isActive ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Kode Kupon dengan Copy */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code)}
                            className="text-slate-400 hover:text-sky-600 cursor-pointer p-0.5 rounded"
                            title="Salin Kode Kupon"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Potongan */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {promo.discountMode === 'rp'
                            ? `Rp ${promo.discountValue.toLocaleString('id-ID')}`
                            : `${promo.discountValue}%`}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {promo.discountMode === 'rp' ? 'Nominal Tetap' : 'Persentase Margin'}
                        </span>
                      </td>

                      {/* Min. Belanja */}
                      <td className="py-3 px-4 text-slate-600">
                        {promo.minSpend > 0 ? (
                          `Rp ${promo.minSpend.toLocaleString('id-ID')}`
                        ) : (
                          <span className="text-slate-400">Tanpa Min</span>
                        )}
                      </td>

                      {/* Kuota */}
                      <td className="py-3 px-4">
                        {promo.quota === null ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Infinity className="w-3.5 h-3.5 text-slate-400" />
                            <span>Unlimited</span>
                          </span>
                        ) : (
                          <div>
                            <span className="font-medium text-slate-800">
                              {promo.usedCount} / {promo.quota}
                            </span>
                            {isQuotaExhausted && (
                              <span className="text-[10px] font-semibold text-rose-600 block">Habis</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Masa Berlaku */}
                      <td className="py-3 px-4">
                        {promo.isForever ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>Selamanya</span>
                          </span>
                        ) : (
                          <div>
                            <span className="text-slate-700">{promo.validUntil?.slice(0, 10) || '-'}</span>
                            {isExpired && (
                              <span className="text-[10px] font-semibold text-rose-600 block">Kedaluwarsa</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Jangkauan */}
                      <td className="py-3 px-4">
                        {promo.scopeType === 'all' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Layers className="w-3 h-3" />
                            <span>Semua Varian</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span>{promo.variantIds.length} Varian</span>
                          </span>
                        )}
                      </td>

                      {/* Status Toggle Langsung */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePromo(promo.id, promo.isActive)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            promo.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title="Klik untuk mengubah status aktif"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              promo.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>{promo.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      {/* Tombol Aksi: Edit & Hapus */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Edit Kupon */}
                          <button
                            type="button"
                            onClick={() => {
                              openEditForm(promo);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Edit Kupon Promo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus Kupon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePromo(promo.id, promo.code);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer group"
                            title="Hapus Kupon Promo"
                          >
                            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
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
      </div>
    </div>
  );
};
