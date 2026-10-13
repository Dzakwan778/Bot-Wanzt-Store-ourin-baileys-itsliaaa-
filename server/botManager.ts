import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from 'ourin-baileys';
import { generateWAMessageContent as generateItsliaaaWAMessageContent } from '@itsliaaa/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

const DEFAULT_CUSTOM_CODE = 'WANZTSTR';
const SESSION_DIR = 'session_ourin';
const CONFIG_FILE = 'commands_config.json';

// Supported command prefixes: /, ., !, ?, #, $, %, &
export const ALLOWED_PREFIXES = ['/', '.', '!', '?', '#', '$', '%', '&'];

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'code';
  message: string;
}

export type WhatsAppButtonType =
  | 'quick_reply'
  | 'cta_url'
  | 'cta_copy'
  | 'cta_call'
  | 'cta_reminder'
  | 'cta_cancel_reminder';

export interface WhatsAppButton {
  id: string;
  type: WhatsAppButtonType;
  name: string;
  output: string;
  triggerAction?: 'list' | 'menu' | 'unknown';
  callTargetName?: string;
  callPhoneNumber?: string;
}

export interface ProductVariantItem {
  id: string;
  name: string;
  variant: string;
  stock: number;
  price: number;
  category: string;
}

export interface CommandsConfig {
  menuOutputText: string;
  menuButtons: WhatsAppButton[];
  includeMedia?: boolean;
  selectedPicture?: string;
  listOutputText: string;
  xavieraApiKey?: string;
  xavieraBaseUrl?: string;
}

const DEFAULT_CONFIG: CommandsConfig = {
  menuOutputText:
    'Halo kak! Selamat datang di wanztstore.web.id 🛒\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:',
  menuButtons: [
    {
      id: 'btn-1',
      type: 'quick_reply',
      name: '📦 Katalog Produk',
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
      type: 'cta_call',
      name: '📞 Hubungi Admin',
      output: 'Admin Store (6285712439395)',
      callTargetName: 'Admin Store',
      callPhoneNumber: '6285712439395',
    },
  ],
  includeMedia: false,
  selectedPicture: '',
  listOutputText:
    'Silakan pilih kategori produk dari daftar list di bawah ini untuk melihat detail produk:',
  xavieraApiKey: '',
  xavieraBaseUrl: 'https://xavierastore.com/api/v1',
};

class BotManager {
  public status: 'idle' | 'connecting' | 'waiting_code' | 'code_ready' | 'connected' | 'closed' | 'error' = 'idle';
  public phoneNumber: string = '';
  public pairingCode: string = '';
  public customCode: string = DEFAULT_CUSTOM_CODE;
  public user: any = null;
  public logs: LogEntry[] = [];
  public sock: any = null;
  public config: CommandsConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      } else {
        this.saveConfig(DEFAULT_CONFIG);
      }
    } catch {
      this.config = DEFAULT_CONFIG;
    }
  }

  saveConfig(newConfig: Partial<CommandsConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('Gagal menyimpan file konfigurasi command:', e);
    }
  }

  addLog(type: 'info' | 'success' | 'warning' | 'error' | 'code', message: string) {
    const entry: LogEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
    };
    this.logs.push(entry);
    if (this.logs.length > 80) this.logs.shift();
  }

  getStatus() {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    const hasSession = fs.existsSync(credsPath);
    let isRegistered = false;
    if (hasSession) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        isRegistered = Boolean(creds.registered);
      } catch {}
    }

    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      pairingCode: this.pairingCode,
      customCode: this.customCode,
      user: this.user,
      logs: this.logs,
      hasSession,
      isRegistered,
      config: this.config,
    };
  }

  async generateDaftarProdukText(): Promise<string> {
    const apiKey = this.config.xavieraApiKey?.trim();
    const baseUrl = (this.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

    // Default fallback list jika API offline atau belum disetting
    const defaultCatalog = [
      {
        kategori: 'Streaming',
        items: ['YouTube', 'Netflix', 'Spotify', 'Disney+ Hotstar', 'Viu', 'WeTV', 'Vidio'],
      },
      {
        kategori: 'AI',
        items: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity AI'],
      },
      {
        kategori: 'Produktivitas',
        items: ['Canva Pro', 'Microsoft 365', 'CapCut Pro', 'Alight Motion', 'Adobe Lightroom'],
      },
    ];

    if (!apiKey) {
      let counter = 1;
      return defaultCatalog
        .map((group) => {
          const list = group.items.map((item) => `• ${counter++}. ${item}`).join('\n');
          return `*${group.kategori}:*\n${list}`;
        })
        .join('\n\n');
    }

    try {
      const response = await fetch(`${baseUrl}/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const json = await response.json();
      const rawProducts = json.products || json.data || [];

      if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
        throw new Error('Data produk kosong');
      }

      const groups: Record<string, string[]> = {};

      for (const prod of rawProducts) {
        let name = (prod.name || '').trim();
        if (!name || name.toLowerCase().startsWith('bot ') || name.toLowerCase().includes('voucher')) continue;

        // Bersihkan nama jika ada varian/penanda lain
        if (name.includes('—')) name = name.split('—')[0].trim();
        name = name.replace(/\s+/g, ' ').trim();

        const cat = (prod.category || prod.kategori || 'Lainnya').trim();
        const categoryName = cat.charAt(0).toUpperCase() + cat.slice(1);

        if (!groups[categoryName]) {
          groups[categoryName] = [];
        }

        if (!groups[categoryName].includes(name)) {
          groups[categoryName].push(name);
        }
      }

      let counter = 1;
      const sections: string[] = [];

      for (const [kategori, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        const listText = items.map((item) => `• ${counter++}. ${item}`).join('\n');
        sections.push(`*${kategori}:*\n${listText}`);
      }

      return sections.length > 0
        ? sections.join('\n\n')
        : defaultCatalog
            .map((g) => {
              const list = g.items.map((i) => `• ${counter++}. ${i}`).join('\n');
              return `*${g.kategori}:*\n${list}`;
            })
            .join('\n\n');
    } catch (err: any) {
      let counter = 1;
      return defaultCatalog
        .map((group) => {
          const list = group.items.map((item) => `• ${counter++}. ${item}`).join('\n');
          return `*${group.kategori}:*\n${list}`;
        })
        .join('\n\n');
    }
  }

  async sendMenuInteractiveMessage(remoteJid: string) {
    if (!this.sock) return;

    const nativeButtons: any[] = (this.config.menuButtons || []).map((btn) => {
      switch (btn.type) {
        case 'quick_reply':
          return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              id: btn.output || btn.name || 'menu_item',
            }),
          };

        case 'cta_url':
          return {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              url: btn.output.startsWith('http') ? btn.output : `https://${btn.output}`,
              merchant_url: btn.output.startsWith('http') ? btn.output : `https://${btn.output}`,
            }),
          };

        case 'cta_copy':
          return {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              copy_code: btn.output,
            }),
          };

        case 'cta_call':
          return {
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              phone_number: btn.callPhoneNumber || btn.output.replace(/[^0-9+]/g, ''),
            }),
          };

        case 'cta_reminder':
        case 'cta_cancel_reminder':
          return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              id: btn.output || 'reminder',
            }),
          };

        default:
          return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: btn.name,
              id: btn.output || 'menu_item',
            }),
          };
      }
    });

    let imageInput: Buffer | undefined = undefined;

    if (this.config.includeMedia && this.config.selectedPicture) {
      try {
        const safeName = path.basename(this.config.selectedPicture);
        const picPath = path.join(process.cwd(), 'src', 'media', 'picture', safeName);
        if (fs.existsSync(picPath)) {
          const buf = fs.readFileSync(picPath);
          if (buf.length <= 10 * 1024 * 1024) {
            imageInput = buf;
          } else {
            this.addLog('warning', `Ukuran gambar menu (${(buf.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas 10MB.`);
          }
        } else {
          this.addLog('warning', `File gambar terpilih tidak ditemukan di ./src/media/picture: ${safeName}`);
        }
      } catch (err: any) {
        this.addLog('warning', `Gagal membaca gambar dari ./src/media/picture: ${err?.message || err}`);
      }
    }

    const titleText = this.config.menuOutputText || 'Halo! Berikut menu kami:';
    const footerText = 'wanztstore.web.id • Otomatis';

    try {
      let mediaHeader: any = {};
      if (imageInput) {
        try {
          const uploaded = await prepareWAMessageMedia(
            { image: imageInput },
            { upload: this.sock.waUploadToServer }
          );
          mediaHeader = {
            hasMediaAttachment: true,
            ...uploaded,
          };
        } catch (mediaErr: any) {
          this.addLog('warning', `Upload media menu gagal: ${mediaErr?.message || mediaErr}. Mengirim tombol tanpa gambar...`);
        }
      }

      const interactiveMessagePayload = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              body: { text: titleText },
              footer: { text: footerText },
              header: {
                title: '',
                hasMediaAttachment: Boolean(mediaHeader.imageMessage),
                ...mediaHeader,
              },
              nativeFlowMessage: {
                buttons: nativeButtons,
              },
            },
          },
        },
      };

      const userJid = this.sock.user?.id || this.sock.authState?.creds?.me?.id || '';
      const fullMsg = generateWAMessageFromContent(remoteJid, interactiveMessagePayload, { userJid });

      await this.sock.relayMessage(remoteJid, fullMsg.message, { messageId: fullMsg.key.id });

      this.addLog('success', `📤 Berhasil membalas command MENU dengan tombol interaktif ourin-baileys ke ${remoteJid}${mediaHeader.imageMessage ? ' (dengan gambar)' : ''}`);
    } catch (err: any) {
      this.addLog('warning', `Pengiriman menu interaktif nativeFlow gagal: ${err?.message || err}. Mencoba fallback teks...`);
      try {
        await this.sock.sendMessage(remoteJid, { text: titleText });
        this.addLog('success', `📤 Berhasil membalas command MENU (fallback text) ke ${remoteJid}`);
      } catch (fallbackErr: any) {
        this.addLog('error', `Gagal mengirim menu interaktif: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }

  async sendListInteractiveMessage(remoteJid: string) {
    if (!this.sock) return;

    const apiKey = this.config.xavieraApiKey?.trim();
    const baseUrl = (this.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

    let sectionsData: Array<{ title: string; rows: Array<{ title: string; description: string; id: string }> }> = [];

    const defaultSections = [
      {
        title: 'Streaming',
        rows: [
          { title: 'YouTube', description: 'Pilih YouTube', id: 'YouTube' },
          { title: 'Netflix', description: 'Pilih Netflix', id: 'Netflix' },
          { title: 'Spotify', description: 'Pilih Spotify', id: 'Spotify' },
          { title: 'Disney+ Hotstar', description: 'Pilih Disney+', id: 'Disney+ Hotstar' },
          { title: 'Viu', description: 'Pilih Viu', id: 'Viu' },
          { title: 'WeTV', description: 'Pilih WeTV', id: 'WeTV' },
          { title: 'Vidio', description: 'Pilih Vidio', id: 'Vidio' },
        ],
      },
      {
        title: 'AI',
        rows: [
          { title: 'ChatGPT', description: 'Pilih ChatGPT', id: 'ChatGPT' },
          { title: 'Gemini', description: 'Pilih Gemini', id: 'Gemini' },
          { title: 'Claude', description: 'Pilih Claude', id: 'Claude' },
          { title: 'Perplexity AI', description: 'Pilih Perplexity AI', id: 'Perplexity AI' },
        ],
      },
      {
        title: 'Produktivitas',
        rows: [
          { title: 'Canva Pro', description: 'Pilih Canva Pro', id: 'Canva Pro' },
          { title: 'Microsoft 365', description: 'Pilih Microsoft 365', id: 'Microsoft 365' },
          { title: 'CapCut Pro', description: 'Pilih CapCut Pro', id: 'CapCut Pro' },
          { title: 'Alight Motion', description: 'Pilih Alight Motion', id: 'Alight Motion' },
          { title: 'Adobe Lightroom', description: 'Pilih Adobe Lightroom', id: 'Adobe Lightroom' },
        ],
      },
    ];

    if (!apiKey) {
      sectionsData = defaultSections;
    } else {
      try {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const json = await response.json();
          const rawProducts = json.products || json.data || [];
          if (Array.isArray(rawProducts) && rawProducts.length > 0) {
            const groups: Record<string, string[]> = {};
            for (const prod of rawProducts) {
              let name = (prod.name || '').trim();
              if (!name || name.toLowerCase().startsWith('bot ') || name.toLowerCase().includes('voucher')) continue;
              if (name.includes('—')) name = name.split('—')[0].trim();
              name = name.replace(/\s+/g, ' ').trim();

              const cat = (prod.category || prod.kategori || 'Lainnya').trim();
              const categoryName = cat.charAt(0).toUpperCase() + cat.slice(1);

              if (!groups[categoryName]) groups[categoryName] = [];
              if (!groups[categoryName].includes(name)) groups[categoryName].push(name);
            }

            for (const [kategori, items] of Object.entries(groups)) {
              if (items.length === 0) continue;
              sectionsData.push({
                title: kategori,
                rows: items.map((item) => ({
                  title: item,
                  description: `Pilih ${item}`,
                  id: item,
                })),
              });
            }
          }
        }
      } catch {
        sectionsData = defaultSections;
      }

      if (sectionsData.length === 0) {
        sectionsData = defaultSections;
      }
    }

    let responseText = this.config.listOutputText || 'Halo kak! Berikut daftar produk aplikasi yang tersedia di wanztstore.web.id:\n\n{daftarProduk}\n\nSilakan pilih melalui menu dropdown di bawah.';
    if (responseText.includes('{daftarProduk}')) {
      const daftarProdukText = await this.generateDaftarProdukText();
      responseText = responseText.replace(/\{daftarProduk\}/g, daftarProdukText);
    }

    try {
      const singleSelectButton = {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '📋 Pilih Produk',
          sections: sectionsData,
        }),
      };

      const interactiveListPayload = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              body: { text: responseText },
              footer: { text: 'wanztstore.web.id • Pilih Produk' },
              header: {
                title: '',
                hasMediaAttachment: false,
              },
              nativeFlowMessage: {
                buttons: [singleSelectButton],
              },
            },
          },
        },
      };

      const userJid = this.sock.user?.id || this.sock.authState?.creds?.me?.id || '';
      const fullMsg = generateWAMessageFromContent(remoteJid, interactiveListPayload, { userJid });
      await this.sock.relayMessage(remoteJid, fullMsg.message, { messageId: fullMsg.key.id });

      this.addLog('success', `📤 Berhasil mengirim pesan LIST dengan tombol dropdown produk ke ${remoteJid}`);
    } catch (err: any) {
      this.addLog('warning', `Pengiriman dropdown LIST nativeFlow gagal (${err?.message || err}). Mengirim fallback text...`);
      try {
        await this.sock.sendMessage(remoteJid, { text: responseText });
        this.addLog('success', `📤 Berhasil membalas command LIST (fallback text) ke ${remoteJid}`);
      } catch (fallbackErr: any) {
        this.addLog('error', `Gagal mengirim respon LIST: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }

  async getProductVariants(productName: string): Promise<ProductVariantItem[]> {
    const apiKey = this.config.xavieraApiKey?.trim();
    const baseUrl = (this.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');
    const cleanSearch = (productName || '').trim().toLowerCase();

    // Default predefined variants map dengan struktur realistis dan margin harga yang pas
    const defaultVariantsMap: Record<string, ProductVariantItem[]> = {
      youtube: [
        { id: 'yt-1', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan', stock: 14, price: 3500, category: 'Streaming' },
        { id: 'yt-2', name: 'YouTube', variant: 'YouTube Famplan 2 Bulan', stock: 9, price: 5500, category: 'Streaming' },
        { id: 'yt-3', name: 'YouTube', variant: 'YouTube Indplan 3 Bulan', stock: 7, price: 12000, category: 'Streaming' },
        { id: 'yt-4', name: 'YouTube', variant: 'YouTube Premium 1 Bulan', stock: 12, price: 4400, category: 'Streaming' },
        { id: 'yt-5', name: 'YouTube', variant: 'YouTube Premium 3 Bulan', stock: 6, price: 11000, category: 'Streaming' },
        { id: 'yt-6', name: 'YouTube', variant: 'YouTube Premium 6 Bulan', stock: 3, price: 19800, category: 'Streaming' },
        { id: 'yt-7', name: 'YouTube', variant: 'YouTube Premium 12 Bulan', stock: 5, price: 35000, category: 'Streaming' },
        { id: 'yt-8', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan No Garansi', stock: 11, price: 2750, category: 'Streaming' },
      ],
      netflix: [
        { id: 'nf-1', name: 'Netflix', variant: 'Netflix Premium 1 Bulan', stock: 6, price: 13200, category: 'Streaming' },
        { id: 'nf-2', name: 'Netflix', variant: 'Netflix Premium 2 Bulan', stock: 4, price: 24200, category: 'Streaming' },
        { id: 'nf-3', name: 'Netflix', variant: 'Netflix Sharing 1 Bulan', stock: 12, price: 5500, category: 'Streaming' },
        { id: 'nf-4', name: 'Netflix', variant: 'Netflix Sharing 2 Bulan', stock: 8, price: 9900, category: 'Streaming' },
        { id: 'nf-5', name: 'Netflix', variant: 'Netflix Private 1 Bulan', stock: 3, price: 27500, category: 'Streaming' },
        { id: 'nf-6', name: 'Netflix', variant: 'Netflix Private 3 Bulan', stock: 2, price: 71500, category: 'Streaming' },
      ],
      spotify: [
        { id: 'sp-1', name: 'Spotify', variant: 'Spotify Famplan 1 Bulan', stock: 15, price: 4400, category: 'Music' },
        { id: 'sp-2', name: 'Spotify', variant: 'Spotify Famplan 2 Bulan', stock: 7, price: 7700, category: 'Music' },
        { id: 'sp-3', name: 'Spotify', variant: 'Spotify Premium 1 Bulan', stock: 18, price: 3300, category: 'Music' },
        { id: 'sp-4', name: 'Spotify', variant: 'Spotify Premium 2 Bulan', stock: 10, price: 6050, category: 'Music' },
        { id: 'sp-5', name: 'Spotify', variant: 'Spotify Premium 3 Bulan', stock: 8, price: 8800, category: 'Music' },
        { id: 'sp-6', name: 'Spotify', variant: 'Spotify Premium 6 Bulan', stock: 5, price: 16500, category: 'Music' },
      ],
      canva: [
        { id: 'cv-1', name: 'Canva Pro', variant: 'Canva Pro 1 Bulan', stock: 12, price: 4400, category: 'Produktivitas' },
        { id: 'cv-2', name: 'Canva Pro', variant: 'Canva Pro 3 Bulan', stock: 8, price: 11000, category: 'Produktivitas' },
        { id: 'cv-3', name: 'Canva Pro', variant: 'Canva Pro 6 Bulan', stock: 5, price: 19800, category: 'Produktivitas' },
        { id: 'cv-4', name: 'Canva Pro', variant: 'Canva Pro 12 Bulan', stock: 3, price: 33000, category: 'Produktivitas' },
        { id: 'cv-5', name: 'Canva Pro', variant: 'Canva Teams 1 Bulan', stock: 9, price: 6600, category: 'Produktivitas' },
      ],
      'canva pro': [
        { id: 'cv-1', name: 'Canva Pro', variant: 'Canva Pro 1 Bulan', stock: 12, price: 4400, category: 'Produktivitas' },
        { id: 'cv-2', name: 'Canva Pro', variant: 'Canva Pro 3 Bulan', stock: 8, price: 11000, category: 'Produktivitas' },
        { id: 'cv-3', name: 'Canva Pro', variant: 'Canva Pro 6 Bulan', stock: 5, price: 19800, category: 'Produktivitas' },
        { id: 'cv-4', name: 'Canva Pro', variant: 'Canva Pro 12 Bulan', stock: 3, price: 33000, category: 'Produktivitas' },
      ],
      chatgpt: [
        { id: 'gpt-1', name: 'ChatGPT', variant: 'ChatGPT Plus 1 Bulan Sharing', stock: 7, price: 35000, category: 'AI' },
        { id: 'gpt-2', name: 'ChatGPT', variant: 'ChatGPT Plus 1 Bulan Private', stock: 4, price: 120000, category: 'AI' },
      ],
      gemini: [
        { id: 'gem-1', name: 'Gemini', variant: 'Gemini Advanced 1 Bulan', stock: 5, price: 30000, category: 'AI' },
      ],
      claude: [
        { id: 'cld-1', name: 'Claude', variant: 'Claude Pro 1 Bulan', stock: 4, price: 40000, category: 'AI' },
      ],
      'disney+ hotstar': [
        { id: 'ds-1', name: 'Disney+ Hotstar', variant: 'Disney+ Hotstar Basic 1 Bulan', stock: 6, price: 16500, category: 'Streaming' },
        { id: 'ds-2', name: 'Disney+ Hotstar', variant: 'Disney+ Hotstar Premium 1 Bulan', stock: 4, price: 27500, category: 'Streaming' },
      ],
      viu: [
        { id: 'vu-1', name: 'Viu', variant: 'Viu Premium 1 Bulan', stock: 10, price: 8000, category: 'Streaming' },
        { id: 'vu-2', name: 'Viu', variant: 'Viu Premium 3 Bulan', stock: 6, price: 20000, category: 'Streaming' },
      ],
      wetv: [
        { id: 'wt-1', name: 'WeTV', variant: 'WeTV VIP 1 Bulan', stock: 9, price: 9000, category: 'Streaming' },
      ],
      vidio: [
        { id: 'vd-1', name: 'Vidio', variant: 'Vidio Platinum 1 Bulan', stock: 8, price: 13200, category: 'Streaming' },
        { id: 'vd-2', name: 'Vidio', variant: 'Vidio Diamond 1 Bulan', stock: 5, price: 30800, category: 'Streaming' },
      ],
      capcut: [
        { id: 'cc-1', name: 'CapCut Pro', variant: 'CapCut Pro 1 Bulan', stock: 9, price: 8800, category: 'Produktivitas' },
        { id: 'cc-2', name: 'CapCut Pro', variant: 'CapCut Pro 3 Bulan', stock: 6, price: 22000, category: 'Produktivitas' },
      ],
      'capcut pro': [
        { id: 'cc-1', name: 'CapCut Pro', variant: 'CapCut Pro 1 Bulan', stock: 9, price: 8800, category: 'Produktivitas' },
        { id: 'cc-2', name: 'CapCut Pro', variant: 'CapCut Pro 3 Bulan', stock: 6, price: 22000, category: 'Produktivitas' },
      ],
      'microsoft 365': [
        { id: 'ms-1', name: 'Microsoft 365', variant: 'Microsoft 365 Family 1 Bulan', stock: 6, price: 15000, category: 'Produktivitas' },
        { id: 'ms-2', name: 'Microsoft 365', variant: 'Microsoft 365 Family 1 Tahun', stock: 4, price: 140000, category: 'Produktivitas' },
      ],
      'alight motion': [
        { id: 'am-1', name: 'Alight Motion', variant: 'Alight Motion Pro 1 Tahun', stock: 10, price: 12000, category: 'Produktivitas' },
      ],
      'adobe lightroom': [
        { id: 'lr-1', name: 'Adobe Lightroom', variant: 'Lightroom Premium 1 Bulan', stock: 8, price: 15000, category: 'Produktivitas' },
      ],
    };

    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const json = await response.json();
          const rawProducts = json.products || json.data || [];
          if (Array.isArray(rawProducts) && rawProducts.length > 0) {
            const matchedProducts = rawProducts.filter((p: any) => {
              const name = (p.name || p.title || '').trim().toLowerCase();
              return name.includes(cleanSearch) || cleanSearch.includes(name);
            });

            if (matchedProducts.length > 0) {
              const resultVariants: ProductVariantItem[] = [];
              for (const p of matchedProducts) {
                const pName = p.name || p.title || productName;
                const pCategory = p.category || p.kategori || 'Streaming';
                if (Array.isArray(p.variants) && p.variants.length > 0) {
                  for (const v of p.variants) {
                    const origPrice = Number(v.price || v.harga || 0);
                    const sellingPrice = origPrice + Math.round(origPrice * 0.1);
                    resultVariants.push({
                      id: v.id || `${p.id}-${v.name}`,
                      name: pName,
                      variant: v.name || v.title || `${pName} Varian`,
                      stock: Number(v.stock ?? v.stok ?? 0),
                      price: sellingPrice,
                      category: pCategory,
                    });
                  }
                } else {
                  const origPrice = Number(p.price || p.harga || 0);
                  const sellingPrice = origPrice + Math.round(origPrice * 0.1);
                  resultVariants.push({
                    id: p.id || `prod-${pName}`,
                    name: pName,
                    variant: p.variant || p.name || `${pName} Reguler`,
                    stock: Number(p.stock ?? p.stok ?? 0),
                    price: sellingPrice,
                    category: pCategory,
                  });
                }
              }
              if (resultVariants.length > 0) return resultVariants;
            }
          }
        }
      } catch (err) {
        console.warn('Gagal fetch varian dari API Xaviera:', err);
      }
    }

    for (const [key, vars] of Object.entries(defaultVariantsMap)) {
      if (cleanSearch.includes(key) || key.includes(cleanSearch)) {
        return vars;
      }
    }

    const titleCase = productName.charAt(0).toUpperCase() + productName.slice(1);
    return [
      { id: `${cleanSearch}-1`, name: titleCase, variant: `${titleCase} Paket 1 Bulan`, stock: 10, price: 15000, category: 'Layanan' },
      { id: `${cleanSearch}-2`, name: titleCase, variant: `${titleCase} Paket 3 Bulan`, stock: 5, price: 35000, category: 'Layanan' },
    ];
  }

  async sendProductVariantsCarousel(remoteJid: string, productName: string) {
    if (!this.sock) return;

    this.addLog('info', `Menyiapkan kartu carousel varian produk "${productName}" untuk ${remoteJid}...`);

    const variants = await this.getProductVariants(productName);
    if (!variants || variants.length === 0) {
      await this.sock.sendMessage(remoteJid, {
        text: `Maaf kak, varian untuk produk *${productName}* sedang tidak tersedia saat ini.`,
      });
      return;
    }

    // Siapkan gambar untuk header card carousel
    let cardImage: Buffer | undefined = undefined;
    const pictureDir = path.join(process.cwd(), 'src', 'media', 'picture');

    if (this.config.selectedPicture) {
      const p = path.join(pictureDir, path.basename(this.config.selectedPicture));
      if (fs.existsSync(p)) {
        try {
          cardImage = fs.readFileSync(p);
        } catch {}
      }
    }

    if (!cardImage && fs.existsSync(pictureDir)) {
      const files = fs.readdirSync(pictureDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
      if (files.length > 0) {
        try {
          cardImage = fs.readFileSync(path.join(pictureDir, files[0]));
        } catch {}
      }
    }

    if (!cardImage) {
      try {
        cardImage = await sharp({
          create: {
            width: 800,
            height: 450,
            channels: 3,
            background: { r: 15, g: 23, b: 42 },
          },
        })
          .jpeg({ quality: 90 })
          .toBuffer();
      } catch {}
    }

    // Bangun daftar kartu (cards) persis sesuai instruksi dan contoh pengguna:
    const cardsPayload = variants.slice(0, 10).map((v) => {
      const formattedPrice = Number(v.price).toLocaleString('id-ID');
      const cat = (v.category || 'Streaming').trim();
      const pName = v.name || productName;

      let intro = `Nikmati hiburan favoritmu dengan pilihan paket ${pName} yang tersedia di Wanzt Store.`;
      const catLower = cat.toLowerCase();
      if (
        catLower.includes('ai') ||
        catLower.includes('produktivitas') ||
        catLower.includes('editing') ||
        catLower.includes('design')
      ) {
        intro = `Tingkatkan produktivitas dan kreativitasmu dengan pilihan paket ${pName} yang tersedia di Wanzt Store.`;
      }

      const captionText = 
`*${pName} | ${cat}*

${intro}

📦 *Detail Produk*

▪️ Varian: ${v.variant}
💰 Harga: Rp${formattedPrice}
📊 Stok: ${v.stock} tersedia

Paket tersedia selama stok masih ada. Pastikan kamu memilih varian yang sesuai sebelum melanjutkan pesanan.

Silakan pilih tindakan di bawah ini untuk melanjutkan.`;

      return {
        image: cardImage,
        caption: captionText,
        footer: 'Wanzt Store Official',
        nativeFlow: [
          {
            text: '📋 Order',
            id: `order_${v.variant}`,
          },
          {
            text: '📞 Contact Admin',
            id: 'contact_admin',
          },
        ],
      };
    });

    try {
      // 1. Manfaatkan library @itsliaaa/baileys KHUSUS untuk membangun konten Carousel Message:
      const carouselMessageContent = await generateItsliaaaWAMessageContent(
        {
          text: `Katalog Varian Produk *${productName}* • Wanzt Store 🛒`,
          footer: 'Wanzt Store • Silakan geser kartu varian di bawah ini',
          cards: cardsPayload,
        },
        {
          upload: this.sock.waUploadToServer,
        }
      );

      // 2. Bungkus ke dalam viewOnceMessage dan kirim via ourin-baileys (generateWAMessageFromContent & relayMessage):
      const userJid = this.sock.user?.id || this.sock.authState?.creds?.me?.id || '';
      const fullCarouselMsg = generateWAMessageFromContent(
        remoteJid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              ...carouselMessageContent,
            },
          },
        },
        { userJid }
      );

      await this.sock.relayMessage(remoteJid, fullCarouselMsg.message, {
        messageId: fullCarouselMsg.key.id,
      });

      this.addLog(
        'success',
        `🎠 Berhasil mengirim pesan CAROUSEL (@itsliaaa/baileys) berisi ${cardsPayload.length} kartu varian untuk "${productName}" ke ${remoteJid}`
      );
    } catch (err: any) {
      this.addLog(
        'warning',
        `Gagal mengirim carousel varian (${err?.message || err}). Mengirim fallback teks varian...`
      );
      try {
        for (const card of cardsPayload.slice(0, 3)) {
          await this.sock.sendMessage(remoteJid, { text: card.caption });
        }
      } catch (fallbackErr: any) {
        this.addLog('error', `Fallback pesan varian gagal: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }

  async sendAdminContact(remoteJid: string) {
    if (!this.sock) return;

    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      'FN:Admin Wanzt Store\n' +
      'ORG:Wanzt Store;\n' +
      'TEL;type=CELL;type=VOICE;waid=6283861276608:+62 838-6127-6608\n' +
      'END:VCARD';

    try {
      await this.sock.sendMessage(remoteJid, {
        contacts: {
          displayName: 'Admin Wanzt Store',
          contacts: [{ vcard }],
        },
      });
      this.addLog('success', `👤 Berhasil mengirimkan kontak tunggal Admin Wanzt Store (083861276608) ke ${remoteJid}`);
    } catch (err: any) {
      this.addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
    }
  }

  async start(rawPhoneNumber: string, customCode: string = DEFAULT_CUSTOM_CODE, isReconnect: boolean = false) {
    if (!rawPhoneNumber) {
      throw new Error('Nomor WhatsApp target wajib diisi');
    }

    const cleanPhone = rawPhoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      throw new Error('Nomor telepon tidak valid (minimal 9 digit)');
    }

    const codeToUse = (customCode || DEFAULT_CUSTOM_CODE).toUpperCase().trim();
    if (codeToUse.length !== 8) {
      throw new Error('Custom pairing code wajib tepat 8 karakter (contoh: WANZTSTR)');
    }

    this.phoneNumber = cleanPhone;
    this.customCode = codeToUse;
    this.status = 'connecting';

    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    // Bersihkan sesi gantung jika belum terdaftar agar tidak terjadi error 401
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (!isReconnect && fs.existsSync(credsPath)) {
      try {
        const existingCreds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        if (!existingCreds.registered) {
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          this.addLog('info', 'Membersihkan sesi penautan sebelumnya untuk mencegah konflik kredensial.');
        }
      } catch {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      }
    }

    this.addLog('info', `Menginisialisasi koneksi soket untuk nomor +${cleanPhone}...`);
    this.addLog('info', `Target Custom Pairing Code: "${codeToUse}" (8 karakter)`);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Pantau frame error dari server WhatsApp
      this.sock.ws.on('frame', (frame: any) => {
        if (frame?.tag === 'iq' && frame?.attrs?.type === 'error') {
          const errChild = frame.content?.[0];
          const errCode = errChild?.attrs?.code;
          const errText = errChild?.attrs?.text;
          if (errCode === '429' || errText === 'rate-overlimit') {
            this.addLog('error', '⚠️ Server WhatsApp menerapkan batas permintaan (Rate-limit 429). Tunggu 10 menit.');
          } else {
            this.addLog('warning', `Respon penolakan WhatsApp: ${errCode || ''} ${errText || ''}`);
          }
        }
      });

      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
          this.status = 'connecting';
          this.addLog('info', 'Menghubungkan ke server WhatsApp Web...');
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.user = this.sock.user;
          this.addLog('success', `✅ WhatsApp Bot BERHASIL TERHUBUNG! (ID: ${this.sock.user?.id || cleanPhone})`);
          this.addLog('info', '⚡ Command /menu aktif dengan prefix [/, ., !, ?, #, $, %, &] dan tombol interaktif.');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          // Status code 515 (restartRequired) muncul saat kode pairing berhasil diverifikasi di HP!
          if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
            this.status = 'connecting';
            this.addLog('success', '🎉 Verifikasi pairing sukses di HP! WhatsApp meminta restart koneksi (Kode 515).');
            this.addLog('info', 'Menghubungkan ulang sesi resmi sekarang...');
            setTimeout(() => {
              this.start(this.phoneNumber, this.customCode, true).catch((err: any) => {
                this.addLog('error', `Gagal menghubungkan ulang: ${err?.message || err}`);
              });
            }, 1500);
            return;
          }

          if (isLoggedOut) {
            this.status = 'closed';
            this.addLog('error', 'Sesi telah dikeluarkan (logged out) oleh WhatsApp. Sesi otomatis dibersihkan.');
            if (fs.existsSync(SESSION_DIR)) {
              fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            }
          } else {
            this.status = 'closed';
            this.addLog('warning', `Koneksi tertutup. Kode status: ${statusCode || 'unknown'}`);
          }
        }
      });

      // Handler Pesan Masuk (messages.upsert)
      this.sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify') return;

        for (const m of messages) {
          if (!m.message) continue;
          if (m.key.fromMe) continue; // Jangan balas pesan dari bot sendiri

          const remoteJid = m.key.remoteJid;
          if (!remoteJid || remoteJid === 'status@broadcast') continue;

          // Deteksi apakah pesan berasal dari klik tombol interaktif (Quick Reply / Native Flow / Template / List)
          let isInteractiveButtonResponse = false;
          let buttonIdOrText = '';

          // 1. Tombol Respon WhatsApp (buttonsResponseMessage)
          if (m.message?.buttonsResponseMessage) {
            isInteractiveButtonResponse = true;
            buttonIdOrText =
              m.message.buttonsResponseMessage.selectedButtonId ||
              m.message.buttonsResponseMessage.selectedDisplayText ||
              '';
          }
          // 2. Tombol Balasan Template (templateButtonReplyMessage)
          else if (m.message?.templateButtonReplyMessage) {
            isInteractiveButtonResponse = true;
            buttonIdOrText =
              m.message.templateButtonReplyMessage.selectedId ||
              m.message.templateButtonReplyMessage.selectedDisplayText ||
              '';
          }
          // 3. Tombol Native Flow / Single Select / Quick Reply (interactiveResponseMessage)
          else if (m.message?.interactiveResponseMessage) {
            isInteractiveButtonResponse = true;
            const nativeFlow = m.message.interactiveResponseMessage?.nativeFlowResponseMessage;
            const paramsJson = nativeFlow?.paramsJson;
            if (paramsJson) {
              try {
                const parsed = JSON.parse(paramsJson);
                buttonIdOrText = parsed.id || parsed.title || parsed.display_text || '';
              } catch {
                buttonIdOrText = paramsJson;
              }
            }
            if (!buttonIdOrText && m.message.interactiveResponseMessage?.body?.text) {
              buttonIdOrText = m.message.interactiveResponseMessage.body.text;
            }
          }
          // 4. Tombol Balasan List Menu (listResponseMessage)
          else if (m.message?.listResponseMessage) {
            isInteractiveButtonResponse = true;
            buttonIdOrText =
              m.message.listResponseMessage.singleSelectReply?.selectedRowId ||
              m.message.listResponseMessage.title ||
              '';
          }

          // Ekstraksi teks biasa jika bukan pesan respon tombol
          const rawText =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            '';

          const trimmedText = rawText.trim();
          const senderName = m.pushName || remoteJid.split('@')[0];

          // 1. TANGANI INTERAKSI TOMBOL KHUSUS CAROUSEL & KONTAK ADMIN
          const cleanBtn = (buttonIdOrText || '').trim();

          // A. Tombol Contact Admin (atau command .admin / .contact)
          if (
            cleanBtn === 'contact_admin' ||
            (isInteractiveButtonResponse && cleanBtn.toLowerCase().includes('contact_admin'))
          ) {
            this.addLog('info', `📞 Tombol "📞 Contact Admin" ditekan oleh ${senderName}`);
            await this.sendAdminContact(remoteJid);
            continue;
          }

          // B. Tombol Order Varian (atau command .order)
          if (cleanBtn.startsWith('order_')) {
            const variantChoice = cleanBtn.replace(/^order_/, '').trim() || 'Produk Pilihan';
            this.addLog('info', `🛒 Pelanggan ${senderName} menekan tombol ORDER untuk varian: "${variantChoice}"`);

            await this.sock.sendMessage(remoteJid, {
              text: `Halo kak *${senderName}*! 🛒\n\nPilihan pesanan kamu untuk *${variantChoice}* telah kami terima.\n\nSilakan konfirmasi ke Admin Wanzt Store melalui kontak resmi berikut untuk pembayaran dan pengiriman akun:`,
            });
            await this.sendAdminContact(remoteJid);
            continue;
          }

          // Logika Pemicu Command:
          // A. JIKA DARI KLIK TOMBOL (Quick Reply):
          //    Pengecualian: Boleh memicu command meskipun tanpa diawali prefix!
          // B. JIKA TEKS DIKETIK MANUAL:
          //    Wajib diawali salah satu prefix: /, ., !, ?, #, $, %, &
          let commandToTrigger: string | null = null;
          let usedPrefix = '';
          let triggerSource = 'text';

          if (isInteractiveButtonResponse && cleanBtn) {
            triggerSource = 'quick_reply';

            // Cek apakah tombol cocok dengan konfigurasi menuButtons
            const cleanLower = cleanBtn.toLowerCase();
            const matchedButton = (this.config.menuButtons || []).find((b) => {
              if (b.type !== 'quick_reply') return false;
              const bOutput = (b.output || '').trim().toLowerCase();
              const bName = (b.name || '').trim().toLowerCase();
              const bId = (b.id || '').trim().toLowerCase();
              return (
                bOutput === cleanLower ||
                bName === cleanLower ||
                bId === cleanLower ||
                cleanLower.includes(bOutput) ||
                cleanLower.includes(bName)
              );
            });

            if (matchedButton) {
              if (matchedButton.triggerAction === 'list') {
                commandToTrigger = 'list';
                this.addLog('info', `⚡ Tombol Quick Reply "${matchedButton.name}" (Action: List) ditekan oleh ${senderName}. Memicu Command List!`);
              } else if (matchedButton.triggerAction === 'unknown') {
                // Konfigurasi unknown: Tidak memicu command apapun
                this.addLog('info', `ℹ️ Tombol Quick Reply "${matchedButton.name}" (Action: Unknown) ditekan oleh ${senderName}. Tidak memicu command.`);
                commandToTrigger = null;
              } else {
                // Fallback normal jika triggerAction belum diset atau custom
                const firstChar = cleanBtn.charAt(0);
                if (ALLOWED_PREFIXES.includes(firstChar)) {
                  commandToTrigger = cleanBtn.substring(1).toLowerCase().split(/\s+/)[0];
                  usedPrefix = firstChar;
                } else {
                  commandToTrigger = cleanBtn.toLowerCase().split(/\s+/)[0];
                }
              }
            } else {
              // Jika tidak cocok dengan list config, evaluasi teks bawaan tombol
              const firstChar = cleanBtn.charAt(0);
              if (ALLOWED_PREFIXES.includes(firstChar)) {
                commandToTrigger = cleanBtn.substring(1).toLowerCase().split(/\s+/)[0];
                usedPrefix = firstChar;
              } else {
                commandToTrigger = cleanBtn.toLowerCase().split(/\s+/)[0];
              }
            }
          } else if (trimmedText) {
            // Teks biasa dari ketikan pengguna: HARUS diawali prefix!
            const firstChar = trimmedText.charAt(0);
            if (ALLOWED_PREFIXES.includes(firstChar)) {
              usedPrefix = firstChar;
              const textWithoutPrefix = trimmedText.substring(1).trim();
              commandToTrigger = textWithoutPrefix.toLowerCase().split(/\s+/)[0];
            } else {
              // Tidak memiliki prefix: TIDAK TERPICU (Aman sesuai permintaan user)
              commandToTrigger = null;
            }
          }

          // Cek apakah perintah manual adalah contact / admin
          if (commandToTrigger && ['contact', 'admin', 'kontak', 'owner'].includes(commandToTrigger.toLowerCase())) {
            this.addLog('info', `📞 Menerima command ${usedPrefix}${commandToTrigger} dari ${senderName}`);
            await this.sendAdminContact(remoteJid);
            continue;
          }

          // Cek apakah perintah manual adalah order
          if (commandToTrigger && commandToTrigger.toLowerCase().startsWith('order')) {
            const variantChoice = trimmedText.replace(/^[/.!?#$%&]order\s*/i, '').trim() || 'Produk Pilihan';
            this.addLog('info', `🛒 Pelanggan ${senderName} mengetik command ORDER: "${variantChoice}"`);
            await this.sock.sendMessage(remoteJid, {
              text: `Halo kak *${senderName}*! 🛒\n\nPilihan pesanan kamu untuk *${variantChoice}* telah kami terima.\n\nSilakan konfirmasi ke Admin Wanzt Store melalui kontak di bawah ini:`,
            });
            await this.sendAdminContact(remoteJid);
            continue;
          }

          // DETEKSI PEMILIHAN PRODUK (Dari dropdown Single-Select list atau command nama produk)
          const potentialProductName = isInteractiveButtonResponse ? cleanBtn : (usedPrefix ? commandToTrigger : null);

          if (potentialProductName) {
            const cleanCand = potentialProductName.trim().toLowerCase();
            const reserved = ['menu', 'list', 'help', 'info', 'ping', 'start', 'stop', 'reset', 'admin', 'contact', 'owner'];

            if (!reserved.includes(cleanCand)) {
              const knownProducts = [
                'YouTube', 'Netflix', 'Spotify', 'Disney+ Hotstar', 'Viu', 'WeTV', 'Vidio',
                'ChatGPT', 'Gemini', 'Claude', 'Perplexity AI',
                'Canva Pro', 'Canva', 'Microsoft 365', 'CapCut Pro', 'CapCut', 'Alight Motion', 'Adobe Lightroom'
              ];

              let matchedProduct: string | null = null;
              const found = knownProducts.find(
                (p) => p.toLowerCase() === cleanCand || cleanCand.includes(p.toLowerCase()) || p.toLowerCase().includes(cleanCand)
              );

              if (found) {
                matchedProduct = found;
              } else if (isInteractiveButtonResponse && potentialProductName.length >= 2) {
                // Dropdown list response langsung dari API Xaviera
                matchedProduct = potentialProductName.trim();
              }

              if (matchedProduct) {
                const triggerInfo = isInteractiveButtonResponse
                  ? `[Pilihan Dropdown List: "${cleanBtn}"]`
                  : `[Prefix: "${usedPrefix}${commandToTrigger}"]`;

                this.addLog('info', `📦 Memproses varian produk "${matchedProduct}" dari ${senderName} ${triggerInfo}`);

                try {
                  await this.sendProductVariantsCarousel(remoteJid, matchedProduct);
                } catch (err: any) {
                  this.addLog('error', `Gagal memproses carousel varian: ${err?.message || err}`);
                }
                continue;
              }
            }
          }

          if (!commandToTrigger) {
            continue;
          }

          // Tangani Command 'menu'
          if (commandToTrigger === 'menu') {
            const triggerInfo =
              triggerSource === 'quick_reply'
                ? `[Tombol Quick Reply: "${buttonIdOrText}"]`
                : `[Prefix: "${usedPrefix}menu"]`;

            this.addLog('info', `📩 Menerima command MENU dari ${senderName} ${triggerInfo}`);

            try {
              await this.sendMenuInteractiveMessage(remoteJid);
            } catch (sendErr: any) {
              this.addLog('error', `Gagal mengirim respon MENU: ${sendErr?.message || sendErr}`);
            }
          } else if (commandToTrigger === 'list') {
            const triggerInfo =
              triggerSource === 'quick_reply'
                ? `[Tombol Quick Reply: "${buttonIdOrText}"]`
                : `[Prefix: "${usedPrefix}list"]`;

            this.addLog('info', `📩 Menerima command LIST dari ${senderName} ${triggerInfo}`);

            try {
              await this.sendListInteractiveMessage(remoteJid);
            } catch (sendErr: any) {
              this.addLog('error', `Gagal mengirim respon LIST: ${sendErr?.message || sendErr}`);
            }
          }
        }
      });

      // Jika belum terdaftar, panggil requestPairingCode dengan kode kustom WANZTSTR
      if (!this.sock.authState.creds.registered) {
        this.status = 'waiting_code';
        this.addLog('info', 'Menunggu soket siap mengirim permintaan pairing code...');

        setTimeout(async () => {
          try {
            this.addLog('info', `Mengirim requestPairingCode("${cleanPhone}", "${codeToUse}")...`);
            const code = await this.sock.requestPairingCode(cleanPhone, codeToUse);
            this.pairingCode = code;
            this.status = 'code_ready';
            this.addLog('code', `🔑 KODE PAIRING SIAP: ${code}`);
            this.addLog('info', 'Silakan buka WhatsApp di HP > Perangkat Tertaut > masukkan kode di atas.');
          } catch (err: any) {
            this.status = 'error';
            this.addLog('error', `Gagal mendapatkan kode pairing: ${err?.message || err}`);
          }
        }, 3000);
      } else {
        this.addLog('success', 'Sesi kredensial terdaftar ditemukan, menghubungkan otomatis...');
      }

      return { success: true, status: this.status };
    } catch (err: any) {
      this.status = 'error';
      this.addLog('error', `Inisialisasi bot gagal: ${err?.message || err}`);
      throw err;
    }
  }

  async stop() {
    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    this.status = 'idle';
    this.pairingCode = '';
    this.addLog('info', 'Koneksi WhatsApp bot dimatikan oleh admin.');
  }

  async reset() {
    await this.stop();
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
    this.phoneNumber = '';
    this.pairingCode = '';
    this.customCode = DEFAULT_CUSTOM_CODE;
    this.user = null;
    this.addLog('warning', 'Folder sesi telah dibersihkan total. Siap untuk penautan baru.');
  }
}

export const botManager = new BotManager();

