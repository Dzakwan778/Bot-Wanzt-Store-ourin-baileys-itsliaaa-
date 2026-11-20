import type { StoreInfoConfig } from '../types/bot.types.ts';

function extractIndonesianLocalDigits(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function validateStoreInfoForSave(
  storeInfo?: Partial<StoreInfoConfig> | null
): { valid: boolean; error?: string } {
  if (!storeInfo || typeof storeInfo !== 'object') {
    return {
      valid: false,
      error: 'Konfigurasi gagal disimpan: Data identitas toko tidak valid.',
    };
  }

  const storeName = typeof storeInfo.storeName === 'string' ? storeInfo.storeName.trim() : '';
  const ownerName = typeof storeInfo.ownerName === 'string' ? storeInfo.ownerName.trim() : '';
  const ownerDigits = extractIndonesianLocalDigits(storeInfo.ownerNumber);

  if (!storeName || !ownerName || ownerDigits.length < 8) {
    return {
      valid: false,
      error:
        'Konfigurasi gagal disimpan: Nama Toko, Nama Pemilik (Owner), dan WhatsApp Owner wajib diisi dan tidak boleh kosong.',
    };
  }

  return { valid: true };
}
