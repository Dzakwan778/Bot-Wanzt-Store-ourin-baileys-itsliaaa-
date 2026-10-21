import fs from 'fs';
import { CommandsConfig, CONFIG_FILE } from '../types/bot.types.js';

export const DEFAULT_CAROUSEL_TEMPLATE = `*Wanzt Store*

*{produkName} | {category}*

Nikmati produk pilihanmu dengan harga terbaik di Wanzt Store.

*Detail Produk:*
- Varian: {varian}
- Harga: {price}
- Stok: {stock} tersedia

Produk tersedia selama stok masih ada. Silakan pilih tindakan di bawah ini untuk melanjutkan.`;

export const DEFAULT_CONFIG: CommandsConfig = {
  menuOutputText:
    'Halo kak! Selamat datang di wanztstore.web.id ✨\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:',
  menuButtons: [
    {
      id: 'btn-1',
      type: 'quick_reply',
      name: '🛍️ Katalog Produk',
      output: '.katalog',
    },
    {
      id: 'btn-2',
      type: 'cta_url',
      name: '🌐 Buka Website',
      output: 'https://wanztstore.web.id',
    },
    {
      id: 'btn-3',
      type: 'vcard',
      name: '📞 Hubungi Admin',
      output: 'Admin Store (6285712439395)',
      callTargetName: 'Admin Store',
      callPhoneNumber: '6285712439395',
    },
  ],
  includeMedia: false,
  selectedPicture: '',
  listOutputText:
    'Halo kak! Berikut daftar produk aplikasi yang tersedia di wanztstore.web.id:\n\n{daftarProduk}\n\nKetik nama produk yang ingin Anda pesan.\nwanztstore.web.id • Pilih Produk',
  carouselOutputText: DEFAULT_CAROUSEL_TEMPLATE,
  carouselPicture: 'snaptik-app-7690985506468908308-slide-2.jpg',
  xavieraApiKey: '',
  xavieraBaseUrl: 'https://xavierastore.com/api/v1',
};

export function loadCommandsConfig(): CommandsConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } else {
      saveCommandsConfig(DEFAULT_CONFIG, {});
      return DEFAULT_CONFIG;
    }
  } catch (err) {
    console.error('Gagal membaca commands_config.json, menggunakan default:', err);
    return DEFAULT_CONFIG;
  }
}

export function saveCommandsConfig(
  currentConfig: CommandsConfig,
  newConfig: Partial<CommandsConfig>
): CommandsConfig {
  const merged: CommandsConfig = { ...currentConfig, ...newConfig };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan file konfigurasi commands_config.json:', err);
  }
  return merged;
}
