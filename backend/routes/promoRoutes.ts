import { Router, Request, Response } from 'express';
import {
  getAllPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  togglePromoStatus,
  deletePromoCode,
  validateAndApplyPromo,
} from '../database/sqlite.ts';
import { botManager } from '../botManager.ts';

export const promoRouter = Router();

// 1. Ambil Semua Kupon Promo
promoRouter.get('/', (_req: Request, res: Response) => {
  try {
    const promos = getAllPromoCodes();
    return res.json({
      success: true,
      data: promos,
      total: promos.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal membaca kupon promo' });
  }
});

// 2. Ambil Kupon Promo berdasarkan ID
promoRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid' });
    }
    const promo = getPromoCodeById(id);
    if (!promo) {
      return res.status(404).json({ success: false, error: 'Kupon tidak ditemukan' });
    }
    return res.json({ success: true, data: promo });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal membaca detail kupon' });
  }
});

// 3. Buat Kupon Promo Baru
promoRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      code,
      discountMode,
      discountValue,
      minSpend,
      quota,
      validUntil,
      isForever,
      scopeType,
      variantIds,
      isActive,
    } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Kode promo wajib diisi',
      });
    }

    const cleanMode = discountMode === 'percent' ? 'percent' : 'rp';
    const numVal = Number(discountValue);

    if (isNaN(numVal) || numVal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Nilai potongan kupon wajib berupa angka lebih besar dari 0',
      });
    }

    if (cleanMode === 'percent' && numVal > 100) {
      return res.status(400).json({
        success: false,
        error: 'Potongan persentase maksimal adalah 100%',
      });
    }

    const created = createPromoCode({
      code: code.trim(),
      discountMode: cleanMode,
      discountValue: numVal,
      minSpend: minSpend ? Number(minSpend) : 0,
      quota: quota !== null && quota !== undefined && quota !== '' ? Number(quota) : null,
      validUntil: validUntil || null,
      isForever: Boolean(isForever),
      scopeType: scopeType === 'restricted' ? 'restricted' : 'all',
      variantIds: Array.isArray(variantIds) ? variantIds.map(String) : [],
      isActive: isActive !== false,
    });

    if (botManager && botManager.addLog) {
      botManager.addLog(
        'info',
        `🏷️ Kupon promo baru dibuat: ${created.code} (${created.discountMode === 'rp' ? `Rp ${created.discountValue.toLocaleString('id-ID')}` : `${created.discountValue}%`} off) - Scope: ${created.scopeType}`
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Kupon promo berhasil dibuat',
      data: created,
    });
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Kode promo ini sudah ada. Gunakan kode promo yang berbeda.',
      });
    }
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal membuat kupon promo',
    });
  }
});

// 4. Perbarui Kupon Promo
promoRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid' });
    }

    const {
      code,
      discountMode,
      discountValue,
      minSpend,
      quota,
      validUntil,
      isForever,
      scopeType,
      variantIds,
      isActive,
    } = req.body || {};

    const updated = updatePromoCode(id, {
      code,
      discountMode: discountMode === 'percent' ? 'percent' : 'rp',
      discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
      minSpend: minSpend !== undefined ? Number(minSpend) : undefined,
      quota: quota !== undefined ? (quota !== null && quota !== '' ? Number(quota) : null) : undefined,
      validUntil: validUntil !== undefined ? validUntil : undefined,
      isForever: isForever !== undefined ? Boolean(isForever) : undefined,
      scopeType: scopeType === 'restricted' ? 'restricted' : 'all',
      variantIds: Array.isArray(variantIds) ? variantIds.map(String) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Kupon promo tidak ditemukan',
      });
    }

    if (botManager && botManager.addLog) {
      botManager.addLog(
        'info',
        `✏️ Kupon promo ${updated.code} berhasil diperbarui`
      );
    }

    return res.json({
      success: true,
      message: 'Kupon promo berhasil diperbarui',
      data: updated,
    });
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Kode promo ini sudah digunakan oleh kupon lain.',
      });
    }
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memperbarui kupon promo',
    });
  }
});

// 5. Toggle Status Kupon (Aktif / Nonaktif)
promoRouter.patch('/:id/toggle', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid' });
    }

    const { isActive } = req.body || {};
    const ok = togglePromoStatus(id, isActive !== undefined ? Boolean(isActive) : undefined);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Kupon promo tidak ditemukan' });
    }

    const updated = getPromoCodeById(id);
    return res.json({
      success: true,
      message: `Status kupon berhasil diubah menjadi ${updated?.isActive ? 'Aktif' : 'Nonaktif'}`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal mengubah status kupon' });
  }
});

// 6. Hapus Kupon Promo
promoRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID tidak valid' });
    }

    const existing = getPromoCodeById(id);
    const deleted = deletePromoCode(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Kupon promo tidak ditemukan' });
    }

    if (botManager && botManager.addLog && existing) {
      botManager.addLog('info', `🗑️ Kupon promo ${existing.code} telah dihapus`);
    }

    return res.json({
      success: true,
      message: 'Kupon promo berhasil dihapus',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Gagal menghapus kupon promo' });
  }
});

// 7. Validasi Kupon & Simulasi Perhitungan Diskon
promoRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const { code, variantId, basePrice, initialMargin, totalOrderAmount, isApkPremium } = req.body || {};

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Kode promo wajib disertakan',
      });
    }

    const result = validateAndApplyPromo({
      code: String(code),
      variantId: String(variantId || ''),
      basePrice: Math.max(0, Number(basePrice) || 0),
      initialMargin: Math.max(0, Number(initialMargin) || 0),
      totalOrderAmount: Number(totalOrderAmount) || 0,
      isApkPremium: isApkPremium !== false,
    });

    return res.json({
      success: result.isValid,
      ...result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memvalidasi kode promo',
    });
  }
});
