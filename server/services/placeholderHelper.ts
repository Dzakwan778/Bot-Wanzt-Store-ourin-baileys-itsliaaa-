import { CommandsConfig } from '../types/bot.types.js';

export interface VariantPlaceholderContext {
  name?: string;
  variant?: string;
  category?: string;
  stock?: number | string;
  price?: number | string;
}

/**
 * Menggantikan seluruh placeholder dinamis dari data Store Info dan Varian Produk.
 * Kompatibel dengan semua jenis output teks, tombol, maupun footer di seluruh command.
 */
export function resolvePlaceholders(
  text: string,
  config: CommandsConfig,
  variant?: VariantPlaceholderContext
): string {
  if (!text) return '';

  const store = config.storeInfo || {
    storeName: 'Wanzt Store',
    ownerName: 'Wanzt',
    ownerNumber: '6282173515807',
    adminName: 'Admin Store',
    adminNumber: '6285712439395',
    webLink: 'https://wanztstore.web.id',
    telegramBot: '',
    waLink: '',
  };

  let res = text;

  // 1. Placeholder Informasi Toko (Store Info)
  res = res
    .replace(/\{storeName\}|\{namaStore\}/gi, store.storeName || '')
    .replace(/\{ownerName\}|\{namaOwner\}/gi, store.ownerName || '')
    .replace(/\{ownerNumber\}|\{nomerOwner\}/gi, store.ownerNumber || '')
    .replace(/\{adminName\}|\{namaAdmin\}/gi, store.adminName || '')
    .replace(/\{adminNumber\}|\{nomerAdmin\}/gi, store.adminNumber || '')
    .replace(/\{webLink\}|\{linkWebsite\}/gi, store.webLink || '')
    .replace(/\{waLink\}|\{linkSaluran\}/gi, store.waLink || '')
    .replace(/\{telegramBot\}|\{botTelegram\}/gi, store.telegramBot || '');

  // 2. Placeholder Varian Produk (jika ada konteks varian pada kartu Carousel / rincian produk)
  if (variant) {
    let formattedPrice = '';
    if (typeof variant.price === 'number') {
      formattedPrice = `Rp${variant.price.toLocaleString('id-ID')}`;
    } else if (variant.price) {
      formattedPrice = String(variant.price).startsWith('Rp')
        ? String(variant.price)
        : `Rp${variant.price}`;
    }

    res = res
      .replace(/\{produkName\}|\{productName\}/gi, variant.name || '')
      .replace(/\{category\}|\{kategori\}/gi, (variant.category || '').trim())
      .replace(/\{varian\}|\{variant\}/gi, variant.variant || '')
      .replace(/\{stock\}|\{stok\}/gi, variant.stock !== undefined ? String(variant.stock) : '')
      .replace(/\{price\}|\{harga\}/gi, formattedPrice);
  }

  return res;
}
