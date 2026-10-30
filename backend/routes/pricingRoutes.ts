import { Router, Request, Response } from 'express';
import {
  getPricingConfig,
  savePricingConfig,
  calculateSellingPrice,
  getAllVariantPricings,
  saveVariantPricing,
  calculateSellingPriceForVariant,
  getCategoryPricing,
  saveCategoryPricing,
} from '../database/sqlite.ts';
import { botManager } from '../botManager.ts';

export const pricingRouter = Router();

// 1. Ambil Pengaturan Harga Produk (General, Daftar Variant Custom, SMM, dan TopUp)
pricingRouter.get('/', (_req: Request, res: Response) => {
  try {
    const config = getPricingConfig();
    const variants = getAllVariantPricings();
    const smmConfig = getCategoryPricing('smm');
    const topupConfig = getCategoryPricing('topup');

    return res.json({
      success: true,
      mode: config.mode,
      value: config.value,
      variants,
      smm: smmConfig,
      topup: topupConfig,
      updatedAt: config.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal membaca pengaturan harga' });
  }
});

// 2. Simpan / Perbarui Pengaturan Harga General
pricingRouter.post('/', (req: Request, res: Response) => {
  try {
    const { mode, value } = req.body || {};
    const cleanMode = mode === 'percent' ? 'percent' : 'rp';
    const numValue = Number(value);

    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Nominal harga/persentase wajib berupa angka positif atau nol (>= 0)',
      });
    }

    const saved = savePricingConfig(cleanMode, numValue);

    // Sinkronkan ke in-memory botManager
    if (botManager && botManager.config) {
      botManager.config.pricingConfig = {
        mode: saved.mode,
        value: saved.value,
      };
      botManager.addLog(
        'info',
        `💰 Pengaturan harga general diperbarui: Mode ${saved.mode === 'rp' ? 'Nominal (Rp)' : 'Persentase (%)'} dengan nilai ${saved.value.toLocaleString('id-ID')}`
      );
    }

    return res.json({
      success: true,
      message: 'Pengaturan harga general berhasil disimpan',
      mode: saved.mode,
      value: saved.value,
      updatedAt: saved.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan pengaturan harga' });
  }
});

// 2b. Simpan / Perbarui Pengaturan Harga Khusus Varian Tertentu
pricingRouter.post('/variant', (req: Request, res: Response) => {
  try {
    const { variantId, productName, variantName, pricingType, mode, value } = req.body || {};

    if (!variantId) {
      return res.status(400).json({
        success: false,
        error: 'ID Varian wajib disertakan',
      });
    }

    const cleanType: 'general' | 'custom' = pricingType === 'custom' ? 'custom' : 'general';
    const cleanMode: 'rp' | 'percent' = mode === 'percent' ? 'percent' : 'rp';
    const numValue = Number(value);
    const cleanValue = isNaN(numValue) || numValue < 0 ? 0 : numValue;

    const saved = saveVariantPricing(String(variantId), {
      productName: productName ? String(productName) : '',
      variantName: variantName ? String(variantName) : '',
      pricingType: cleanType,
      mode: cleanMode,
      value: cleanValue,
    });

    if (botManager) {
      botManager.addLog(
        'info',
        `🏷️ Pengaturan harga varian [${saved.productName || saved.variantId} - ${saved.variantName}] diset: ${
          saved.pricingType === 'custom'
            ? `Custom (${saved.mode === 'rp' ? `+Rp ${saved.value.toLocaleString('id-ID')}` : `+${saved.value}%`})`
            : 'Mengikuti General'
        }`
      );
    }

    return res.json({
      success: true,
      message: `Harga varian berhasil diatur ke ${saved.pricingType === 'custom' ? 'Custom' : 'General'}`,
      variant: saved,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan harga varian' });
  }
});

// 3. Simpan / Perbarui Pengaturan Harga Layanan SMM
pricingRouter.post('/smm', (req: Request, res: Response) => {
  try {
    const { mode, value } = req.body || {};
    const cleanMode = mode === 'percent' ? 'percent' : 'rp';
    const numValue = Number(value);

    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Nominal harga/persentase SMM wajib berupa angka positif atau nol (>= 0)',
      });
    }

    const saved = saveCategoryPricing('smm', cleanMode, numValue);

    if (botManager) {
      botManager.addLog(
        'info',
        `📱 Pengaturan harga SMM diperbarui: Mode ${
          saved.mode === 'rp' ? 'Nominal (Rp)' : 'Persentase (%)'
        } dengan nilai ${saved.value.toLocaleString('id-ID')}`
      );
    }

    return res.json({
      success: true,
      message: 'Pengaturan harga SMM berhasil disimpan',
      mode: saved.mode,
      value: saved.value,
      updatedAt: saved.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan pengaturan harga SMM' });
  }
});

// 4. Simpan / Perbarui Pengaturan Harga Produk TopUp
pricingRouter.post('/topup', (req: Request, res: Response) => {
  try {
    const { mode, value } = req.body || {};
    const cleanMode = mode === 'percent' ? 'percent' : 'rp';
    const numValue = Number(value);

    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Nominal harga/persentase TopUp wajib berupa angka positif atau nol (>= 0)',
      });
    }

    const saved = saveCategoryPricing('topup', cleanMode, numValue);

    if (botManager) {
      botManager.addLog(
        'info',
        `🎮 Pengaturan harga TopUp diperbarui: Mode ${
          saved.mode === 'rp' ? 'Nominal (Rp)' : 'Persentase (%)'
        } dengan nilai ${saved.value.toLocaleString('id-ID')}`
      );
    }

    return res.json({
      success: true,
      message: 'Pengaturan harga TopUp berhasil disimpan',
      mode: saved.mode,
      value: saved.value,
      updatedAt: saved.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan pengaturan harga TopUp' });
  }
});

// 5. Helper Endpoint Simulasi Kalkulasi Harga Jual
pricingRouter.post('/simulate', (req: Request, res: Response) => {
  try {
    const { originalPrice, mode, value } = req.body || {};
    const currentConfig = getPricingConfig();
    const usedMode = mode || currentConfig.mode;
    const usedValue = value !== undefined ? Number(value) : currentConfig.value;

    const result = calculateSellingPrice(Number(originalPrice) || 0, usedMode, usedValue);
    return res.json({
      success: true,
      originalPrice: Number(originalPrice) || 0,
      mode: usedMode,
      value: usedValue,
      sellingPrice: result.sellingPrice,
      margin: result.margin,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menghitung simulasi harga' });
  }
});
