import { StoreInfoConfig } from '../types/dashboard.types';
import { toDisplayPhone, toOfficialPhone } from './phoneUtils';

export interface StoreInfoValidationResult {
  valid: boolean;
  error?: string;
  normalized?: StoreInfoConfig;
}

/**
 * Mengecek apakah seluruh kolom wajib Identitas Utama Toko (Nama Toko, Nama Owner, WhatsApp Owner)
 * sudah terisi dengan format nomor minimal 8 digit lokal.
 */
export function hasRequiredStoreInfoFields(info?: Partial<StoreInfoConfig> | null): boolean {
  if (!info) return false;
  const hasStoreName = Boolean(info.storeName && info.storeName.trim().length > 0);
  const hasOwnerName = Boolean(info.ownerName && info.ownerName.trim().length > 0);
  const ownerDigits = toDisplayPhone(info.ownerNumber);
  const hasOwnerNumber = ownerDigits.length >= 8;
  return hasStoreName && hasOwnerName && hasOwnerNumber;
}

/**
 * Validasi pengiriman form Identitas Utama Toko di halaman Info Profil.
 * Menolak penyimpanan apabila salah satu kolom wajib kosong atau nomor tidak valid.
 */
export function validateStoreInfoSubmission(
  info?: Partial<StoreInfoConfig> | null
): StoreInfoValidationResult {
  const storeName = (info?.storeName || '').trim();
  const ownerName = (info?.ownerName || '').trim();
  const ownerDisplayDigits = toDisplayPhone(info?.ownerNumber);
  const adminDisplayDigits = toDisplayPhone(info?.adminNumber);

  if (!storeName) {
    return {
      valid: false,
      error: 'Konfigurasi gagal disimpan: Nama Toko wajib diisi.',
    };
  }

  if (!ownerName) {
    return {
      valid: false,
      error: 'Konfigurasi gagal disimpan: Nama Pemilik (Owner) wajib diisi.',
    };
  }

  if (!ownerDisplayDigits || ownerDisplayDigits.length < 8) {
    return {
      valid: false,
      error: 'Konfigurasi gagal disimpan: WhatsApp Owner wajib diisi (minimal 8 digit).',
    };
  }

  return {
    valid: true,
    normalized: {
      storeName,
      ownerName,
      ownerNumber: toOfficialPhone(ownerDisplayDigits),
      adminName: (info?.adminName || '').trim(),
      adminNumber: adminDisplayDigits ? toOfficialPhone(adminDisplayDigits) : '',
      webLink: (info?.webLink || '').trim(),
      telegramBot: (info?.telegramBot || '').trim(),
      waLink: (info?.waLink || '').trim(),
    },
  };
}
