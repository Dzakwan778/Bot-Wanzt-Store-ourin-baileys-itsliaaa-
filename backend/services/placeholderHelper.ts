import { CommandsConfig } from '../types/bot.types.js';

export interface VariantPlaceholderContext {
  name?: string;
  variant?: string;
  category?: string;
  stock?: number | string;
  price?: number | string;
  orderId?: string;
  total?: number | string;
  unikCode?: number | string;
}

/**
 * Menggantikan seluruh placeholder dinamis dari data Store Info, Varian Produk, dan Transaksi Invoice.
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
  // Mendukung {adminMumber} sebagai alias dari {adminNumber} (antisipasi typo dari konfigurasi)
  res = res
    .replace(/\{storeName\}|\{namaStore\}/gi, store.storeName || '')
    .replace(/\{ownerName\}|\{namaOwner\}/gi, store.ownerName || '')
    .replace(/\{ownerNumber\}|\{nomerOwner\}/gi, store.ownerNumber || '')
    .replace(/\{adminName\}|\{namaAdmin\}/gi, store.adminName || '')
    .replace(/\{adminNumber\}|\{adminMumber\}|\{nomerAdmin\}/gi, store.adminNumber || '')
    .replace(/\{webLink\}|\{linkWebsite\}/gi, store.webLink || '')
    .replace(/\{waLink\}|\{linkSaluran\}/gi, store.waLink || '')
    .replace(/\{telegramBot\}|\{botTelegram\}/gi, store.telegramBot || '');

  // 2. Placeholder Varian Produk & Transaksi Invoice (jika ada konteks varian / invoice)
  if (variant) {
    const rawPrice = variant.price !== undefined ? variant.price : 0;
    const numPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const formattedPriceNum = numPrice.toLocaleString('id-ID');

    const rawTotal = variant.total !== undefined ? variant.total : numPrice;
    const numTotal =
      typeof rawTotal === 'number'
        ? rawTotal
        : Number(String(rawTotal).replace(/[^0-9]/g, '')) || 0;
    const formattedTotalNum = numTotal.toLocaleString('id-ID');

    const unikStr =
      variant.unikCode !== undefined
        ? String(variant.unikCode)
        : '';

    // Normalisasi harga: jika teks sudah memiliki "Rp {price}", hindari penggandaan Rp Rp
    res = res
      .replace(/Rp\s*\{price\}|Rp\s*\{harga\}/gi, `Rp ${formattedPriceNum}`)
      .replace(/\{price\}|\{harga\}/gi, formattedPriceNum)
      .replace(/Rp\s*\{total\}|Rp\s*\{totalBayar\}/gi, `Rp ${formattedTotalNum}`)
      .replace(/\{total\}|\{totalBayar\}/gi, formattedTotalNum)
      .replace(/\{produkName\}|\{productName\}/gi, variant.name || '')
      .replace(/\{category\}|\{kategori\}/gi, (variant.category || '').trim())
      .replace(/\{varian\}|\{variant\}/gi, variant.variant || '')
      .replace(/\{stock\}|\{stok\}/gi, variant.stock !== undefined ? String(variant.stock) : '')
      .replace(/\{orderId\}|\{order_id\}/gi, variant.orderId || '')
      .replace(/\{unikCode\}|\{kodeUnik\}|\{feeGateway\}/gi, unikStr);
  }

  return res;
}

