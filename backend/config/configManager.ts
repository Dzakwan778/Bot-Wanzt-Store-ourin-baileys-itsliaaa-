import path from 'path';
import fs from 'fs';
import { db, getPricingConfig, savePricingConfig } from '../database/sqlite.ts';
import {
  CommandsConfig,
  StoreInfoConfig,
  MenuCommandConfig,
  ListCommandConfig,
  CarouselCommandConfig,
  InvoiceCommandConfig,
  ConfirmationCommandConfig,
  ApiConfig,
  PricingConfig,
} from '../types/bot.types.ts';

function resolveDbDir(): string {
  const localDb = path.join(process.cwd(), 'database');
  if (fs.existsSync(localDb)) return localDb;
  const backendDb = path.join(process.cwd(), 'backend', 'database');
  if (fs.existsSync(backendDb)) return backendDb;
  return localDb;
}

export const DB_DIR = resolveDbDir();

export const DEFAULT_STORE_INFO: StoreInfoConfig = {
  storeName: '',
  ownerName: '',
  ownerNumber: '',
  adminName: '',
  adminNumber: '',
  webLink: '',
  telegramBot: '',
  waLink: '',
};

export const DEFAULT_MENU_CONFIG: MenuCommandConfig = {
  menuOutputText:
    'Halo kak! Selamat datang di {storeName} ✨\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:',
  menuFooterText: '{webLink} • Otomatis',
  menuButtons: [],
  includeMedia: true,
  selectedPicture: 'snaptik-app-7690985506468908308-slide-2.jpg',
};

export const DEFAULT_LIST_CONFIG: ListCommandConfig = {
  listOutputText: '📋 *DAFTAR LAYANAN & HARGA {storeName}*\n\nSilakan pilih produk yang tersedia:',
  listFooterText: '{webLink} • Katalog Resmi',
};

export const DEFAULT_CAROUSEL_CONFIG: CarouselCommandConfig = {
  carouselOutputText: '🛍️ *PRODUK TERSEDIA*\nSilakan geser kartu di bawah untuk memilih varian:',
  carouselFooterText: '{webLink} • Geser Kartu',
  carouselPicture: 'snaptik-app-7690985506468908308-slide-2.jpg',
};

export const DEFAULT_INVOICE_TEMPLATE = `🧾 *INVOICE PEMBAYARAN QRIS*
Halo kak, pesanan varian *{varian}* untuk produk *{produkName}* telah diterbitkan!

📌 *Detail Pesanan:*
• *ID Order:* \`{orderId}\`
• *Produk:* {produkName} ({varian})
• *Harga Produk:* Rp {price}
• *Kode Unik:* Rp {unikCode}
----------------------------------------
💰 *TOTAL BAYAR:* *Rp {total}*
----------------------------------------

⚠️ *PANDUAN PEMBAYARAN:*
1. Scan kode QRIS yang kami kirimkan di atas menggunakan BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, atau aplikasi e-wallet lainnya.
2. *PENTING:* Masukkan nominal *PERSIS Rp {total}* (jangan dibulatkan agar pembayaran otomatis diverifikasi sistem).
3. Kode QRIS ini berlaku selama *15 menit*.
4. Setelah saldo kami terima, akun/produk digital Anda akan *OTOMATIS* dikirimkan langsung ke chat pribadi ini!

Jika ada pertanyaan atau kendala pembayaran, silakan klik tombol *Hubungi Admin* di bawah.`;

export const DEFAULT_INVOICE_CONFIG: InvoiceCommandConfig = {
  invoiceOutputText: DEFAULT_INVOICE_TEMPLATE,
  invoiceFooterText: '{webLink} • Verifikasi Otomatis',
};

export const DEFAULT_CONFIRM_SUMMARY_TEMPLATE = `🛒 *RINCIAN PESANAN*
Halo kak, silakan konfirmasi pesanan Anda:

• *Produk:* {produkName}
• *Varian:* {varian}
• *Harga Normal:* Rp {price}

Punya kode promo? Silakan pilih tombol di bawah untuk menggunakan diskon atau langsung bayar.`;

export const DEFAULT_CONFIRM_INPUT_PROMO_TEMPLATE = `🎟️ *MASUKKAN KODE PROMO*
Silakan ketik kode promo Anda (contoh: HEMAT10) atau ketik *BATAL* untuk melanjutkan dengan harga normal.

⏱️ _Batas waktu: 90 detik._`;

export const DEFAULT_CONFIRM_PROMO_SUCCESS_TEMPLATE = `🎉 *KODE PROMO BERHASIL DIGUNAKAN!*
• *Kode Promo:* {promoCode}
• *Harga Awal:* Rp {price}
• *Potongan Diskon:* -Rp {discount}
• *Total Bayar:* Rp {finalPrice}

Invoice pembayaran QRIS sedang diterbitkan...`;

export const DEFAULT_CONFIRM_PROMO_INVALID_TEMPLATE = `⚠️ *KODE PROMO TIDAK DAPAT DIGUNAKAN*
Kode promo *{promoCode}* tidak dapat diterapkan.
Penyebab: *{reason}*

Silakan ketik kode promo lain, atau ketik *BATAL* untuk lanjut bayar harga normal (Rp {price}).`;

export const DEFAULT_CONFIRMATION_CONFIG: ConfirmationCommandConfig = {
  confirmSummaryText: DEFAULT_CONFIRM_SUMMARY_TEMPLATE,
  confirmInputPromoText: DEFAULT_CONFIRM_INPUT_PROMO_TEMPLATE,
  confirmPromoSuccessText: DEFAULT_CONFIRM_PROMO_SUCCESS_TEMPLATE,
  confirmPromoInvalidText: DEFAULT_CONFIRM_PROMO_INVALID_TEMPLATE,
  confirmFooterText: '{storeName} • Konfirmasi Pesanan',
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  xavieraApiKey: '',
  xavieraBaseUrl: 'https://xaviera.store/api',
  lunasQrisApiKey: '',
  lunasQrisSecretKey: '',
  lunasQrisBaseUrl: 'https://lunasqris.com',
};

export const DEFAULT_CONFIG: CommandsConfig = {
  storeInfo: DEFAULT_STORE_INFO,
  ...DEFAULT_MENU_CONFIG,
  ...DEFAULT_LIST_CONFIG,
  ...DEFAULT_CAROUSEL_CONFIG,
  ...DEFAULT_INVOICE_CONFIG,
  ...DEFAULT_CONFIRMATION_CONFIG,
  ...DEFAULT_API_CONFIG,
};

// --- SQLite Getters & Savers ---

export function loadStoreInfo(): StoreInfoConfig {
  try {
    const row = db.prepare('SELECT * FROM store_info WHERE id = 1').get() as any;
    if (row) {
      return {
        storeName: row.store_name || '',
        ownerName: row.owner_name || '',
        ownerNumber: row.owner_number || '',
        adminName: row.admin_name || '',
        adminNumber: row.admin_number || '',
        webLink: row.web_link || '',
        telegramBot: row.telegram_bot || '',
        waLink: row.wa_link || '',
      };
    }
  } catch (err) {
    console.error('Gagal membaca store_info dari SQLite:', err);
  }
  return { ...DEFAULT_STORE_INFO };
}

export function saveStoreInfo(update: Partial<StoreInfoConfig>): StoreInfoConfig {
  const current = loadStoreInfo();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO store_info (
        id, store_name, owner_name, owner_number, admin_name, admin_number,
        web_link, telegram_bot, wa_link, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      merged.storeName || '',
      merged.ownerName || '',
      merged.ownerNumber || '',
      merged.adminName || '',
      merged.adminNumber || '',
      merged.webLink || '',
      merged.telegramBot || '',
      merged.waLink || '',
      now
    );
  } catch (err) {
    console.error('Gagal menyimpan store_info ke SQLite:', err);
  }

  return merged;
}

export function loadMenuConfig(): MenuCommandConfig {
  try {
    const row = db.prepare('SELECT config_data FROM commands_config WHERE command_type = ?').get('menu') as any;
    if (row && row.config_data) {
      const parsed = JSON.parse(row.config_data);
      return { ...DEFAULT_MENU_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Gagal membaca menu config dari SQLite:', err);
  }
  return { ...DEFAULT_MENU_CONFIG };
}

export function saveMenuConfig(update: Partial<MenuCommandConfig>): MenuCommandConfig {
  const current = loadMenuConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
      VALUES (?, ?, ?)
    `).run('menu', JSON.stringify(merged), now);
  } catch (err) {
    console.error('Gagal menyimpan menu config ke SQLite:', err);
  }

  return merged;
}

export function loadListConfig(): ListCommandConfig {
  try {
    const row = db.prepare('SELECT config_data FROM commands_config WHERE command_type = ?').get('list') as any;
    if (row && row.config_data) {
      const parsed = JSON.parse(row.config_data);
      return { ...DEFAULT_LIST_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Gagal membaca list config dari SQLite:', err);
  }
  return { ...DEFAULT_LIST_CONFIG };
}

export function saveListConfig(update: Partial<ListCommandConfig>): ListCommandConfig {
  const current = loadListConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
      VALUES (?, ?, ?)
    `).run('list', JSON.stringify(merged), now);
  } catch (err) {
    console.error('Gagal menyimpan list config ke SQLite:', err);
  }

  return merged;
}

export function loadCarouselConfig(): CarouselCommandConfig {
  try {
    const row = db.prepare('SELECT config_data FROM commands_config WHERE command_type = ?').get('carousel') as any;
    if (row && row.config_data) {
      const parsed = JSON.parse(row.config_data);
      return { ...DEFAULT_CAROUSEL_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Gagal membaca carousel config dari SQLite:', err);
  }
  return { ...DEFAULT_CAROUSEL_CONFIG };
}

export function saveCarouselConfig(update: Partial<CarouselCommandConfig>): CarouselCommandConfig {
  const current = loadCarouselConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
      VALUES (?, ?, ?)
    `).run('carousel', JSON.stringify(merged), now);
  } catch (err) {
    console.error('Gagal menyimpan carousel config ke SQLite:', err);
  }

  return merged;
}

export function loadInvoiceConfig(): InvoiceCommandConfig {
  try {
    const row = db.prepare('SELECT config_data FROM commands_config WHERE command_type = ?').get('invoice') as any;
    if (row && row.config_data) {
      const parsed = JSON.parse(row.config_data);
      return { ...DEFAULT_INVOICE_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Gagal membaca invoice config dari SQLite:', err);
  }
  return { ...DEFAULT_INVOICE_CONFIG };
}

export function saveInvoiceConfig(update: Partial<InvoiceCommandConfig>): InvoiceCommandConfig {
  const current = loadInvoiceConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
      VALUES (?, ?, ?)
    `).run('invoice', JSON.stringify(merged), now);
  } catch (err) {
    console.error('Gagal menyimpan invoice config ke SQLite:', err);
  }

  return merged;
}

export function loadConfirmationConfig(): ConfirmationCommandConfig {
  try {
    const row = db.prepare('SELECT config_data FROM commands_config WHERE command_type = ?').get('confirmation') as any;
    if (row && row.config_data) {
      const parsed = JSON.parse(row.config_data);
      return { ...DEFAULT_CONFIRMATION_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Gagal membaca confirmation config dari SQLite:', err);
  }
  return { ...DEFAULT_CONFIRMATION_CONFIG };
}

export function saveConfirmationConfig(update: Partial<ConfirmationCommandConfig>): ConfirmationCommandConfig {
  const current = loadConfirmationConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO commands_config (command_type, config_data, updated_at)
      VALUES (?, ?, ?)
    `).run('confirmation', JSON.stringify(merged), now);
  } catch (err) {
    console.error('Gagal menyimpan confirmation config ke SQLite:', err);
  }

  return merged;
}

export function loadApiConfig(): ApiConfig {
  try {
    const row = db.prepare('SELECT * FROM api_config WHERE id = 1').get() as any;
    if (row) {
      return {
        lunasQrisApiKey: row.lunas_api_key || '',
        lunasQrisSecretKey: row.lunas_secret_key || '',
        lunasQrisBaseUrl: row.lunas_base_url || DEFAULT_API_CONFIG.lunasQrisBaseUrl,
        xavieraApiKey: row.xaviera_api_key || '',
        xavieraBaseUrl: row.xaviera_base_url || DEFAULT_API_CONFIG.xavieraBaseUrl,
      };
    }
  } catch (err) {
    console.error('Gagal membaca api_config dari SQLite:', err);
  }
  return { ...DEFAULT_API_CONFIG };
}

export function saveApiConfig(update: Partial<ApiConfig>): ApiConfig {
  const current = loadApiConfig();
  const merged = { ...current, ...update };
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO api_config (
        id, lunas_api_key, lunas_secret_key, lunas_base_url, lunas_default_fee,
        xaviera_api_key, xaviera_base_url, xaviera_markup_percent, updated_at
      ) VALUES (1, ?, ?, ?, 0, ?, ?, 10, ?)
    `).run(
      merged.lunasQrisApiKey || '',
      merged.lunasQrisSecretKey || '',
      merged.lunasQrisBaseUrl || DEFAULT_API_CONFIG.lunasQrisBaseUrl,
      merged.xavieraApiKey || '',
      merged.xavieraBaseUrl || DEFAULT_API_CONFIG.xavieraBaseUrl,
      now
    );
  } catch (err) {
    console.error('Gagal menyimpan api_config ke SQLite:', err);
  }

  return merged;
}

/**
 * Memuat konfigurasi lengkap gabungan dari SQLite
 */
export function loadCommandsConfig(): CommandsConfig {
  const storeInfo = loadStoreInfo();
  const pricing = getPricingConfig();
  const menu = loadMenuConfig();
  const list = loadListConfig();
  const carousel = loadCarouselConfig();
  const invoice = loadInvoiceConfig();
  const confirm = loadConfirmationConfig();
  const api = loadApiConfig();

  return {
    storeInfo,
    pricingConfig: {
      mode: pricing.mode,
      value: pricing.value,
    },
    menuOutputText: menu.menuOutputText,
    menuFooterText: menu.menuFooterText,
    menuButtons: menu.menuButtons,
    includeMedia: menu.includeMedia,
    selectedPicture: menu.selectedPicture,
    listOutputText: list.listOutputText,
    listFooterText: list.listFooterText,
    carouselOutputText: carousel.carouselOutputText,
    carouselFooterText: carousel.carouselFooterText,
    carouselPicture: carousel.carouselPicture,
    invoiceOutputText: invoice.invoiceOutputText,
    invoiceFooterText: invoice.invoiceFooterText,
    confirmSummaryText: confirm.confirmSummaryText,
    confirmInputPromoText: confirm.confirmInputPromoText,
    confirmPromoSuccessText: confirm.confirmPromoSuccessText,
    confirmPromoInvalidText: confirm.confirmPromoInvalidText,
    confirmFooterText: confirm.confirmFooterText,
    xavieraApiKey: api.xavieraApiKey,
    xavieraBaseUrl: api.xavieraBaseUrl,
    lunasQrisApiKey: api.lunasQrisApiKey !== undefined ? api.lunasQrisApiKey : DEFAULT_API_CONFIG.lunasQrisApiKey,
    lunasQrisSecretKey: api.lunasQrisSecretKey !== undefined ? api.lunasQrisSecretKey : DEFAULT_API_CONFIG.lunasQrisSecretKey,
    lunasQrisBaseUrl: api.lunasQrisBaseUrl || DEFAULT_API_CONFIG.lunasQrisBaseUrl,
  };
}

/**
 * Menyimpan konfigurasi ke SQLite database
 */
export function saveCommandsConfig(
  currentConfig: CommandsConfig,
  newConfig: Partial<CommandsConfig>
): CommandsConfig {
  if (newConfig.storeInfo) {
    saveStoreInfo(newConfig.storeInfo);
  }

  if (newConfig.pricingConfig) {
    savePricingConfig(newConfig.pricingConfig.mode, newConfig.pricingConfig.value);
  }

  if (
    newConfig.menuOutputText !== undefined ||
    newConfig.menuFooterText !== undefined ||
    newConfig.menuButtons !== undefined ||
    newConfig.includeMedia !== undefined ||
    newConfig.selectedPicture !== undefined
  ) {
    saveMenuConfig({
      ...(newConfig.menuOutputText !== undefined && { menuOutputText: newConfig.menuOutputText }),
      ...(newConfig.menuFooterText !== undefined && { menuFooterText: newConfig.menuFooterText }),
      ...(newConfig.menuButtons !== undefined && { menuButtons: newConfig.menuButtons }),
      ...(newConfig.includeMedia !== undefined && { includeMedia: newConfig.includeMedia }),
      ...(newConfig.selectedPicture !== undefined && { selectedPicture: newConfig.selectedPicture }),
    });
  }

  if (newConfig.listOutputText !== undefined || newConfig.listFooterText !== undefined) {
    saveListConfig({
      ...(newConfig.listOutputText !== undefined && { listOutputText: newConfig.listOutputText }),
      ...(newConfig.listFooterText !== undefined && { listFooterText: newConfig.listFooterText }),
    });
  }

  if (
    newConfig.carouselOutputText !== undefined ||
    newConfig.carouselFooterText !== undefined ||
    newConfig.carouselPicture !== undefined
  ) {
    saveCarouselConfig({
      ...(newConfig.carouselOutputText !== undefined && { carouselOutputText: newConfig.carouselOutputText }),
      ...(newConfig.carouselFooterText !== undefined && { carouselFooterText: newConfig.carouselFooterText }),
      ...(newConfig.carouselPicture !== undefined && { carouselPicture: newConfig.carouselPicture }),
    });
  }

  if (newConfig.invoiceOutputText !== undefined || newConfig.invoiceFooterText !== undefined) {
    saveInvoiceConfig({
      ...(newConfig.invoiceOutputText !== undefined && { invoiceOutputText: newConfig.invoiceOutputText }),
      ...(newConfig.invoiceFooterText !== undefined && { invoiceFooterText: newConfig.invoiceFooterText }),
    });
  }

  if (
    newConfig.confirmSummaryText !== undefined ||
    newConfig.confirmInputPromoText !== undefined ||
    newConfig.confirmPromoSuccessText !== undefined ||
    newConfig.confirmPromoInvalidText !== undefined ||
    newConfig.confirmFooterText !== undefined
  ) {
    saveConfirmationConfig({
      ...(newConfig.confirmSummaryText !== undefined && { confirmSummaryText: newConfig.confirmSummaryText }),
      ...(newConfig.confirmInputPromoText !== undefined && { confirmInputPromoText: newConfig.confirmInputPromoText }),
      ...(newConfig.confirmPromoSuccessText !== undefined && { confirmPromoSuccessText: newConfig.confirmPromoSuccessText }),
      ...(newConfig.confirmPromoInvalidText !== undefined && { confirmPromoInvalidText: newConfig.confirmPromoInvalidText }),
      ...(newConfig.confirmFooterText !== undefined && { confirmFooterText: newConfig.confirmFooterText }),
    });
  }

  if (
    newConfig.xavieraApiKey !== undefined ||
    newConfig.xavieraBaseUrl !== undefined ||
    newConfig.lunasQrisApiKey !== undefined ||
    newConfig.lunasQrisSecretKey !== undefined ||
    newConfig.lunasQrisBaseUrl !== undefined
  ) {
    saveApiConfig({
      ...(newConfig.xavieraApiKey !== undefined && { xavieraApiKey: newConfig.xavieraApiKey }),
      ...(newConfig.xavieraBaseUrl !== undefined && { xavieraBaseUrl: newConfig.xavieraBaseUrl }),
      ...(newConfig.lunasQrisApiKey !== undefined && { lunasQrisApiKey: newConfig.lunasQrisApiKey }),
      ...(newConfig.lunasQrisSecretKey !== undefined && { lunasQrisSecretKey: newConfig.lunasQrisSecretKey }),
      ...(newConfig.lunasQrisBaseUrl !== undefined && { lunasQrisBaseUrl: newConfig.lunasQrisBaseUrl }),
    });
  }

  return loadCommandsConfig();
}

