import fs from 'fs';
import path from 'path';
import {
  CommandsConfig,
  StoreInfoConfig,
  MenuCommandConfig,
  ListCommandConfig,
  CarouselCommandConfig,
  ApiConfig,
  CONFIG_FILE,
} from '../types/bot.types.js';

export const DB_DIR = path.join(process.cwd(), 'database');

export const DB_FILES = {
  storeInfo: path.join(DB_DIR, 'store_info.json'),
  menu: path.join(DB_DIR, 'command_menu.json'),
  list: path.join(DB_DIR, 'command_list.json'),
  carousel: path.join(DB_DIR, 'command_carousel.json'),
  api: path.join(DB_DIR, 'api_config.json'),
};

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
  listOutputText:
    'Halo kak! Berikut daftar produk aplikasi yang tersedia di {storeName}:\n\n{daftarProduk}\n\nKetik nama produk yang ingin Anda pesan.',
  listFooterText: '{webLink} • Pilih Produk',
};

export const DEFAULT_CAROUSEL_TEMPLATE = `*{storeName}*

*{produkName} | {category}*

Nikmati produk pilihanmu dengan harga terbaik di {storeName}.

*Detail Produk:*
- Varian: {varian}
- Harga: {price}
- Stok: {stock} tersedia

Produk tersedia selama stok masih ada. Silakan pilih tindakan di bawah ini untuk melanjutkan.`;

export const DEFAULT_CAROUSEL_CONFIG: CarouselCommandConfig = {
  carouselOutputText: DEFAULT_CAROUSEL_TEMPLATE,
  carouselFooterText: '{storeName} Official',
  carouselPicture: 'snaptik-app-7690985506468908308-slide-2.jpg',
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  xavieraApiKey: 'xvs_0726effe853aadea27bd6608ef98468cc3121b82e036e5f7',
  xavieraBaseUrl: 'https://xavierastore.com/api/v1',
  lunasQrisApiKey: '',
  lunasQrisSecretKey: '',
  lunasQrisBaseUrl: 'https://lunasqris.com',
};

export const DEFAULT_CONFIG: CommandsConfig = {
  storeInfo: DEFAULT_STORE_INFO,
  menuOutputText: DEFAULT_MENU_CONFIG.menuOutputText,
  menuFooterText: DEFAULT_MENU_CONFIG.menuFooterText,
  menuButtons: DEFAULT_MENU_CONFIG.menuButtons,
  includeMedia: DEFAULT_MENU_CONFIG.includeMedia,
  selectedPicture: DEFAULT_MENU_CONFIG.selectedPicture,
  listOutputText: DEFAULT_LIST_CONFIG.listOutputText,
  listFooterText: DEFAULT_LIST_CONFIG.listFooterText,
  carouselOutputText: DEFAULT_CAROUSEL_CONFIG.carouselOutputText,
  carouselFooterText: DEFAULT_CAROUSEL_CONFIG.carouselFooterText,
  carouselPicture: DEFAULT_CAROUSEL_CONFIG.carouselPicture,
  xavieraApiKey: DEFAULT_API_CONFIG.xavieraApiKey,
  xavieraBaseUrl: DEFAULT_API_CONFIG.xavieraBaseUrl,
  lunasQrisApiKey: DEFAULT_API_CONFIG.lunasQrisApiKey,
  lunasQrisSecretKey: DEFAULT_API_CONFIG.lunasQrisSecretKey,
  lunasQrisBaseUrl: DEFAULT_API_CONFIG.lunasQrisBaseUrl,
};

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { ...fallback, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error(`Gagal membaca file database ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T) {
  try {
    ensureDbDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Gagal menulis file database ${filePath}:`, err);
  }
}

/**
 * Migrasi data dari commands_config.json lama (jika ada) ke database terpisah per fitur
 */
function migrateLegacyConfigIfNeeded() {
  ensureDbDir();
  const hasStoreInfo = fs.existsSync(DB_FILES.storeInfo);
  const hasMenu = fs.existsSync(DB_FILES.menu);
  const hasList = fs.existsSync(DB_FILES.list);
  const hasCarousel = fs.existsSync(DB_FILES.carousel);
  const hasApi = fs.existsSync(DB_FILES.api);

  if (hasStoreInfo && hasMenu && hasList && hasCarousel && hasApi) {
    return;
  }

  let legacyData: any = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      legacyData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {}
  }

  if (!hasStoreInfo) {
    const storeInfo: StoreInfoConfig = {
      ...DEFAULT_STORE_INFO,
      ...(legacyData.storeInfo || {}),
    };
    writeJsonFile(DB_FILES.storeInfo, storeInfo);
  }

  if (!hasMenu) {
    const menuConfig: MenuCommandConfig = {
      menuOutputText: legacyData.menuOutputText || DEFAULT_MENU_CONFIG.menuOutputText,
      menuFooterText: legacyData.menuFooterText || DEFAULT_MENU_CONFIG.menuFooterText,
      menuButtons: Array.isArray(legacyData.menuButtons) && legacyData.menuButtons.length > 0
        ? legacyData.menuButtons
        : DEFAULT_MENU_CONFIG.menuButtons,
      includeMedia: legacyData.includeMedia !== undefined ? Boolean(legacyData.includeMedia) : DEFAULT_MENU_CONFIG.includeMedia,
      selectedPicture: legacyData.selectedPicture || DEFAULT_MENU_CONFIG.selectedPicture,
    };
    writeJsonFile(DB_FILES.menu, menuConfig);
  }

  if (!hasList) {
    const listConfig: ListCommandConfig = {
      listOutputText: legacyData.listOutputText || DEFAULT_LIST_CONFIG.listOutputText,
      listFooterText: legacyData.listFooterText || DEFAULT_LIST_CONFIG.listFooterText,
    };
    writeJsonFile(DB_FILES.list, listConfig);
  }

  if (!hasCarousel) {
    const carouselConfig: CarouselCommandConfig = {
      carouselOutputText: legacyData.carouselOutputText || DEFAULT_CAROUSEL_CONFIG.carouselOutputText,
      carouselFooterText: legacyData.carouselFooterText || DEFAULT_CAROUSEL_CONFIG.carouselFooterText,
      carouselPicture: legacyData.carouselPicture || DEFAULT_CAROUSEL_CONFIG.carouselPicture,
    };
    writeJsonFile(DB_FILES.carousel, carouselConfig);
  }

  if (!hasApi) {
    const apiConfig: ApiConfig = {
      xavieraApiKey: legacyData.xavieraApiKey !== undefined ? legacyData.xavieraApiKey : DEFAULT_API_CONFIG.xavieraApiKey,
      xavieraBaseUrl: legacyData.xavieraBaseUrl || DEFAULT_API_CONFIG.xavieraBaseUrl,
      lunasQrisApiKey: legacyData.lunasQrisApiKey !== undefined ? legacyData.lunasQrisApiKey : (legacyData.sairiApiKey || DEFAULT_API_CONFIG.lunasQrisApiKey),
      lunasQrisSecretKey: legacyData.lunasQrisSecretKey !== undefined ? legacyData.lunasQrisSecretKey : DEFAULT_API_CONFIG.lunasQrisSecretKey,
      lunasQrisBaseUrl: legacyData.lunasQrisBaseUrl || DEFAULT_API_CONFIG.lunasQrisBaseUrl,
    };
    writeJsonFile(DB_FILES.api, apiConfig);
  }
}

// --- Individual getters and savers for modularity ---

export function loadStoreInfo(): StoreInfoConfig {
  ensureDbDir();
  return readJsonFile<StoreInfoConfig>(DB_FILES.storeInfo, DEFAULT_STORE_INFO);
}

export function saveStoreInfo(update: Partial<StoreInfoConfig>): StoreInfoConfig {
  const current = loadStoreInfo();
  const merged = { ...current, ...update };
  writeJsonFile(DB_FILES.storeInfo, merged);
  return merged;
}

export function loadMenuConfig(): MenuCommandConfig {
  ensureDbDir();
  return readJsonFile<MenuCommandConfig>(DB_FILES.menu, DEFAULT_MENU_CONFIG);
}

export function saveMenuConfig(update: Partial<MenuCommandConfig>): MenuCommandConfig {
  const current = loadMenuConfig();
  const merged = { ...current, ...update };
  writeJsonFile(DB_FILES.menu, merged);
  return merged;
}

export function loadListConfig(): ListCommandConfig {
  ensureDbDir();
  return readJsonFile<ListCommandConfig>(DB_FILES.list, DEFAULT_LIST_CONFIG);
}

export function saveListConfig(update: Partial<ListCommandConfig>): ListCommandConfig {
  const current = loadListConfig();
  const merged = { ...current, ...update };
  writeJsonFile(DB_FILES.list, merged);
  return merged;
}

export function loadCarouselConfig(): CarouselCommandConfig {
  ensureDbDir();
  return readJsonFile<CarouselCommandConfig>(DB_FILES.carousel, DEFAULT_CAROUSEL_CONFIG);
}

export function saveCarouselConfig(update: Partial<CarouselCommandConfig>): CarouselCommandConfig {
  const current = loadCarouselConfig();
  const merged = { ...current, ...update };
  writeJsonFile(DB_FILES.carousel, merged);
  return merged;
}

export function loadApiConfig(): ApiConfig {
  ensureDbDir();
  return readJsonFile<ApiConfig>(DB_FILES.api, DEFAULT_API_CONFIG);
}

export function saveApiConfig(update: Partial<ApiConfig>): ApiConfig {
  const current = loadApiConfig();
  const merged = { ...current, ...update };
  writeJsonFile(DB_FILES.api, merged);
  return merged;
}

/**
 * Memuat konfigurasi lengkap gabungan dari masing-masing file database
 */
export function loadCommandsConfig(): CommandsConfig {
  migrateLegacyConfigIfNeeded();

  const storeInfo = loadStoreInfo();
  const menu = loadMenuConfig();
  const list = loadListConfig();
  const carousel = loadCarouselConfig();
  const api = loadApiConfig();

  return {
    storeInfo,
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
    xavieraApiKey: api.xavieraApiKey,
    xavieraBaseUrl: api.xavieraBaseUrl,
    lunasQrisApiKey: api.lunasQrisApiKey !== undefined ? api.lunasQrisApiKey : DEFAULT_API_CONFIG.lunasQrisApiKey,
    lunasQrisSecretKey: api.lunasQrisSecretKey !== undefined ? api.lunasQrisSecretKey : DEFAULT_API_CONFIG.lunasQrisSecretKey,
    lunasQrisBaseUrl: api.lunasQrisBaseUrl || DEFAULT_API_CONFIG.lunasQrisBaseUrl,
  };
}

/**
 * Menyimpan konfigurasi ke file database terpisah yang sesuai
 */
export function saveCommandsConfig(
  currentConfig: CommandsConfig,
  newConfig: Partial<CommandsConfig>
): CommandsConfig {
  ensureDbDir();

  // 1. Simpan ke database/store_info.json jika ada data storeInfo
  if (newConfig.storeInfo) {
    saveStoreInfo(newConfig.storeInfo);
  }

  // 2. Simpan ke database/command_menu.json jika ada data menu
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

  // 3. Simpan ke database/command_list.json jika ada data list
  if (newConfig.listOutputText !== undefined || newConfig.listFooterText !== undefined) {
    saveListConfig({
      ...(newConfig.listOutputText !== undefined && { listOutputText: newConfig.listOutputText }),
      ...(newConfig.listFooterText !== undefined && { listFooterText: newConfig.listFooterText }),
    });
  }

  // 4. Simpan ke database/command_carousel.json jika ada data carousel
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

  // 5. Simpan ke database/api_config.json jika ada data API
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
