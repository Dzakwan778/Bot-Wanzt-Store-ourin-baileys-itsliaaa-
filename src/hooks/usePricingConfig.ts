import { useState, useEffect, useCallback } from 'react';
import { VariantPricingItem } from '../types/dashboard.types';

export function usePricingConfig(showToast: (msg: string) => void) {
  // 1. General Produk (Apk Premium)
  const [pricingMode, setPricingMode] = useState<'rp' | 'percent'>('rp');
  const [pricingValue, setPricingValue] = useState<number>(100);
  const [inputVal, setInputVal] = useState<string>('100');
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);
  const [isSavingPricing, setIsSavingPricing] = useState<boolean>(false);
  const [isSavingVariantPricing, setIsSavingVariantPricing] = useState<boolean>(false);
  const [variantPricings, setVariantPricings] = useState<Record<string, VariantPricingItem>>({});

  // 2. SMM (Social Media Marketing)
  const [smmPricingMode, setSmmPricingMode] = useState<'rp' | 'percent'>('rp');
  const [smmPricingValue, setSmmPricingValue] = useState<number>(100);
  const [smmInputVal, setSmmInputVal] = useState<string>('100');
  const [isSavingSmmPricing, setIsSavingSmmPricing] = useState<boolean>(false);

  // 3. TopUp Game & Digital
  const [topupPricingMode, setTopupPricingMode] = useState<'rp' | 'percent'>('rp');
  const [topupPricingValue, setTopupPricingValue] = useState<number>(100);
  const [topupInputVal, setTopupInputVal] = useState<string>('100');
  const [isSavingTopupPricing, setIsSavingTopupPricing] = useState<boolean>(false);

  const fetchPricingConfig = useCallback(async () => {
    try {
      setLoadingPricing(true);
      const res = await fetch('/api/pricing');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // General
          const mode = json.mode === 'percent' ? 'percent' : 'rp';
          const val = typeof json.value === 'number' ? json.value : 100;
          setPricingMode(mode);
          setPricingValue(val);
          setInputVal(String(val));
          if (json.variants && typeof json.variants === 'object') {
            setVariantPricings(json.variants);
          }

          // SMM
          if (json.smm) {
            const sMode = json.smm.mode === 'percent' ? 'percent' : 'rp';
            const sVal = typeof json.smm.value === 'number' ? json.smm.value : 100;
            setSmmPricingMode(sMode);
            setSmmPricingValue(sVal);
            setSmmInputVal(String(sVal));
          }

          // TopUp
          if (json.topup) {
            const tMode = json.topup.mode === 'percent' ? 'percent' : 'rp';
            const tVal = typeof json.topup.value === 'number' ? json.topup.value : 100;
            setTopupPricingMode(tMode);
            setTopupPricingValue(tVal);
            setTopupInputVal(String(tVal));
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  useEffect(() => {
    fetchPricingConfig();
  }, [fetchPricingConfig]);

  const savePricing = async (newMode?: 'rp' | 'percent', newVal?: number) => {
    const modeToSave = newMode !== undefined ? newMode : pricingMode;
    const rawVal = newVal !== undefined ? newVal : Number(inputVal);
    const valueToSave = isNaN(rawVal) ? 0 : Math.max(0, rawVal);

    try {
      setIsSavingPricing(true);
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeToSave, value: valueToSave }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPricingMode(json.mode);
        setPricingValue(json.value);
        setInputVal(String(json.value));
        showToast(
          `Pengaturan harga general berhasil disimpan: Mode ${
            json.mode === 'rp' ? `+Rp ${json.value.toLocaleString('id-ID')}` : `+${json.value}%`
          }`
        );
      } else {
        showToast(json.error || 'Gagal menyimpan pengaturan harga general');
      }
    } catch {
      showToast('Koneksi ke server gagal saat menyimpan harga general');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleToggleMode = () => {
    const nextMode: 'rp' | 'percent' = pricingMode === 'rp' ? 'percent' : 'rp';
    setPricingMode(nextMode);
    // Langsung simpan perubahan mode ke server
    savePricing(nextMode, Number(inputVal));
  };

  // Helper pencarian konfigurasi varian berdasarkan id atau fallback productName & variantName
  const getVariantPricingInfo = (
    variantId?: string | number,
    productName?: string,
    variantName?: string
  ): VariantPricingItem | null => {
    if (variantId && variantPricings[String(variantId)]) {
      return variantPricings[String(variantId)];
    }
    if (productName && variantName) {
      const match = Object.values(variantPricings).find(
        (v) =>
          (v.productName || '').toLowerCase() === productName.toLowerCase() &&
          (v.variantName || '').toLowerCase() === variantName.toLowerCase()
      );
      if (match) return match;
    }
    return null;
  };

  // Kalkulasi harga jual untuk satu varian (mengutamakan custom jika diset)
  const calculateVariantPrice = (
    originalPrice: number,
    variantId?: string | number,
    productName?: string,
    variantName?: string
  ) => {
    const base = Math.max(0, Math.round(Number(originalPrice) || 0));
    const customConfig = getVariantPricingInfo(variantId, productName, variantName);

    if (customConfig && customConfig.pricingType === 'custom') {
      const isPercent = customConfig.mode === 'percent';
      const margin = isPercent
        ? Math.round(base * (customConfig.value / 100))
        : Math.round(customConfig.value);
      return {
        isCustom: true,
        mode: customConfig.mode,
        value: customConfig.value,
        margin,
        sellingPrice: base + margin,
      };
    }

    // Default: ikuti harga General
    const isPercent = pricingMode === 'percent';
    const margin = isPercent
      ? Math.round(base * (pricingValue / 100))
      : Math.round(pricingValue);
    return {
      isCustom: false,
      mode: pricingMode,
      value: pricingValue,
      margin,
      sellingPrice: base + margin,
    };
  };

  // Kompatibilitas helper lama
  const calculateProductPrice = (originalPrice: number) => {
    return calculateVariantPrice(originalPrice);
  };

  // Menyimpan pengaturan harga untuk varian spesifik (General vs Custom)
  const saveVariantPricing = async (
    variantId: string | number,
    options: {
      productName?: string;
      variantName?: string;
      pricingType: 'general' | 'custom';
      mode?: 'rp' | 'percent';
      value?: number;
    }
  ) => {
    const cleanId = String(variantId);
    try {
      setIsSavingVariantPricing(true);
      const res = await fetch('/api/pricing/variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: cleanId,
          productName: options.productName || '',
          variantName: options.variantName || '',
          pricingType: options.pricingType,
          mode: options.mode || 'rp',
          value: options.value !== undefined ? options.value : 100,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setVariantPricings((prev) => ({
          ...prev,
          [cleanId]: {
            variantId: cleanId,
            productName: options.productName,
            variantName: options.variantName,
            pricingType: options.pricingType,
            mode: options.mode || 'rp',
            value: options.value !== undefined ? options.value : 100,
          },
        }));

        if (options.pricingType === 'custom') {
          showToast(
            `Harga custom varian "${options.variantName || cleanId}" berhasil disimpan: ${
              options.mode === 'rp'
                ? `+Rp ${(options.value || 0).toLocaleString('id-ID')}`
                : `+${options.value || 0}%`
            }`
          );
        } else {
          showToast(`Varian "${options.variantName || cleanId}" sekarang mengikuti Harga General`);
        }
        return true;
      } else {
        showToast(json.error || 'Gagal menyimpan harga varian');
        return false;
      }
    } catch {
      showToast('Koneksi ke server gagal saat menyimpan harga varian');
      return false;
    } finally {
      setIsSavingVariantPricing(false);
    }
  };

  // ==========================================
  // SMM Pricing Operations
  // ==========================================
  const saveSmmPricing = async (newMode?: 'rp' | 'percent', newVal?: number) => {
    const modeToSave = newMode !== undefined ? newMode : smmPricingMode;
    const rawVal = newVal !== undefined ? newVal : Number(smmInputVal);
    const valueToSave = isNaN(rawVal) ? 0 : Math.max(0, rawVal);

    try {
      setIsSavingSmmPricing(true);
      const res = await fetch('/api/pricing/smm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeToSave, value: valueToSave }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSmmPricingMode(json.mode);
        setSmmPricingValue(json.value);
        setSmmInputVal(String(json.value));
        showToast(
          `Pengaturan harga SMM berhasil disimpan: Mode ${
            json.mode === 'rp' ? `+Rp ${json.value.toLocaleString('id-ID')}` : `+${json.value}%`
          }`
        );
      } else {
        showToast(json.error || 'Gagal menyimpan pengaturan harga SMM');
      }
    } catch {
      showToast('Koneksi ke server gagal saat menyimpan harga SMM');
    } finally {
      setIsSavingSmmPricing(false);
    }
  };

  const handleToggleSmmMode = () => {
    const nextMode: 'rp' | 'percent' = smmPricingMode === 'rp' ? 'percent' : 'rp';
    setSmmPricingMode(nextMode);
    saveSmmPricing(nextMode, Number(smmInputVal));
  };

  const calculateSmmPrice = (originalRate: number) => {
    const base = Math.max(0, Math.round(Number(originalRate) || 0));
    const isPercent = smmPricingMode === 'percent';
    const margin = isPercent
      ? Math.round(base * (smmPricingValue / 100))
      : Math.round(smmPricingValue);
    return {
      mode: smmPricingMode,
      value: smmPricingValue,
      margin,
      sellingPrice: base + margin,
    };
  };

  // ==========================================
  // TopUp Pricing Operations
  // ==========================================
  const saveTopupPricing = async (newMode?: 'rp' | 'percent', newVal?: number) => {
    const modeToSave = newMode !== undefined ? newMode : topupPricingMode;
    const rawVal = newVal !== undefined ? newVal : Number(topupInputVal);
    const valueToSave = isNaN(rawVal) ? 0 : Math.max(0, rawVal);

    try {
      setIsSavingTopupPricing(true);
      const res = await fetch('/api/pricing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeToSave, value: valueToSave }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTopupPricingMode(json.mode);
        setTopupPricingValue(json.value);
        setTopupInputVal(String(json.value));
        showToast(
          `Pengaturan harga TopUp berhasil disimpan: Mode ${
            json.mode === 'rp' ? `+Rp ${json.value.toLocaleString('id-ID')}` : `+${json.value}%`
          }`
        );
      } else {
        showToast(json.error || 'Gagal menyimpan pengaturan harga TopUp');
      }
    } catch {
      showToast('Koneksi ke server gagal saat menyimpan harga TopUp');
    } finally {
      setIsSavingTopupPricing(false);
    }
  };

  const handleToggleTopupMode = () => {
    const nextMode: 'rp' | 'percent' = topupPricingMode === 'rp' ? 'percent' : 'rp';
    setTopupPricingMode(nextMode);
    saveTopupPricing(nextMode, Number(topupInputVal));
  };

  const calculateTopupPrice = (originalPrice: number) => {
    const base = Math.max(0, Math.round(Number(originalPrice) || 0));
    const isPercent = topupPricingMode === 'percent';
    const margin = isPercent
      ? Math.round(base * (topupPricingValue / 100))
      : Math.round(topupPricingValue);
    return {
      mode: topupPricingMode,
      value: topupPricingValue,
      margin,
      sellingPrice: base + margin,
    };
  };

  return {
    pricingMode,
    setPricingMode,
    pricingValue,
    setPricingValue,
    inputVal,
    setInputVal,
    loadingPricing,
    isSavingPricing,
    variantPricings,
    isSavingVariantPricing,
    fetchPricingConfig,
    savePricing,
    handleToggleMode,
    calculateProductPrice,
    calculateVariantPrice,
    getVariantPricingInfo,
    saveVariantPricing,
    // SMM
    smmPricingMode,
    setSmmPricingMode,
    smmPricingValue,
    setSmmPricingValue,
    smmInputVal,
    setSmmInputVal,
    isSavingSmmPricing,
    saveSmmPricing,
    handleToggleSmmMode,
    calculateSmmPrice,
    // TopUp
    topupPricingMode,
    setTopupPricingMode,
    topupPricingValue,
    setTopupPricingValue,
    topupInputVal,
    setTopupInputVal,
    isSavingTopupPricing,
    saveTopupPricing,
    handleToggleTopupMode,
    calculateTopupPrice,
  };
}

