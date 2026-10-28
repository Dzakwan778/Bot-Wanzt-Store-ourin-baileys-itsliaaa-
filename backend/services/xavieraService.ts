import { CommandsConfig, ProductVariantItem } from '../types/bot.types.js';

export const DEFAULT_CATALOG = [
  {
    kategori: 'Editing',
    items: [
      'Capcut',
      'Alightmotion',
      'Lightroom',
      'Vsco',
      'Remini',
      'Meitu',
      'Canva Premium',
      'Alightmotion Bot',
      'Picsart',
      'WINK PREMIUM',
      'POLAR IOS & ANDROID 1 TAHUN',
      'Cam Scanner Private',
    ],
  },
  {
    kategori: 'Aplikasi Premium',
    items: ['CapCut Pro', 'Apple Music'],
  },
  {
    kategori: 'Streaming',
    items: [
      'Dramabox',
      'Loklok',
      'WeTv',
      'Iqiyi',
      'Viu',
      'Gagaoolala',
      'Netflix',
      'Mango tv',
      'ReelShort',
      'Prime',
      'Youku',
      'Bstation',
      'Hbo Max',
      'Movie box',
      'Vidio',
      'YouTube',
      'Zoom Pro 100 partisipant',
      'Melolo',
      'Viki',
    ],
  },
  {
    kategori: 'Musik',
    items: ['Spotify'],
  },
  {
    kategori: 'Lainnya',
    items: [
      'Oldroll',
      'Dazzcam',
      'Getcontact',
      'Cek getcontac',
      'ChatGPT',
      'Grok Ai',
      'Gemini Ai',
      'Claude Ai',
      'Crunchyroll',
      'Drakor',
      'Disney+',
      'Duolingo',
      'Microsoft 365',
      'Wps',
      'Fizzo Novel',
      'Grammarly',
      'Scribd',
      'Quilbot',
      'ALL GMAIL',
      'Scribd Private',
      'Gsuite',
    ],
  },
  {
    kategori: 'VPN',
    items: [
      'HMA VPN',
      'VPN EXPRESS 1 TAHUN',
      'NORD VPN',
      'VPN SHURFSHARK',
      'VPN AVAST SEMI PRIVATE',
      'VPN AVIRA SEMI PRIVATE',
    ],
  },
  {
    kategori: 'AI & Tools',
    items: [
      'Link to Receive Gemini Pro 18 Months',
      'Wiktor AI',
      'Duolingo Super 12m',
      'Bolt.new Pro 12m',
      'Canva Business + Leonardo AI 1 Month',
      'Canva Business 12m',
      'iLovePDF Premium 12M',
      'Claude Pro',
      'Microsoft Office 365 Plus 1 year',
      '⭐ Adobe Express 12M',
      'Notion Plus 12M',
      'Notion Plus 12m FW',
      'iLovePdf Premium 1Yr',
      'Promo Linkedin Career 3M(NW)',
      'Duolingo Super 12M',
      'Doulingo Super 12M Redeem Link',
      'Gemini Pro 18Months (link)',
      'CAPCUT PRO 6 MONTHS',
      '‍ Avira Prime 3 Months',
    ],
  },
  {
    kategori: 'AI',
    items: ['Leonardo AI'],
  },
  {
    kategori: 'Akun Premium',
    items: [
      'Remini Web',
      'Meitu',
      'Alight Motion',
      'Google Gemini',
      'Zoom Pro',
      'Scribd Pro',
      'Wink',
      'Netflix',
      'Google Mail',
      'HMA VPN',
      'Surfshark VPN',
    ],
  },
];

export const DEFAULT_VARIANTS_MAP: Record<string, ProductVariantItem[]> = {
  // YouTube
  youtube: [
    { id: 'yt-1', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan', stock: 14, price: 3500, category: 'Streaming' },
    { id: 'yt-2', name: 'YouTube', variant: 'YouTube Famplan 2 Bulan', stock: 9, price: 5500, category: 'Streaming' },
    { id: 'yt-3', name: 'YouTube', variant: 'YouTube Indplan 3 Bulan', stock: 7, price: 12000, category: 'Streaming' },
    { id: 'yt-4', name: 'YouTube', variant: 'YouTube Premium 1 Bulan', stock: 12, price: 4400, category: 'Streaming' },
    { id: 'yt-5', name: 'YouTube', variant: 'YouTube Premium 3 Bulan', stock: 6, price: 11000, category: 'Streaming' },
    { id: 'yt-6', name: 'YouTube', variant: 'YouTube Premium 6 Bulan', stock: 3, price: 19800, category: 'Streaming' },
    { id: 'yt-7', name: 'YouTube', variant: 'YouTube Premium 12 Bulan', stock: 5, price: 35000, category: 'Streaming' },
  ],
  // Netflix
  netflix: [
    { id: 'nf-1', name: 'Netflix', variant: 'Netflix Sharing 1 Bulan', stock: 12, price: 5500, category: 'Streaming' },
    { id: 'nf-2', name: 'Netflix', variant: 'Netflix Sharing 2 Bulan', stock: 8, price: 9900, category: 'Streaming' },
    { id: 'nf-3', name: 'Netflix', variant: 'Netflix Premium 1 Bulan', stock: 6, price: 13200, category: 'Streaming' },
    { id: 'nf-4', name: 'Netflix', variant: 'Netflix Premium 2 Bulan', stock: 4, price: 24200, category: 'Streaming' },
    { id: 'nf-5', name: 'Netflix', variant: 'Netflix Private 1 Bulan (4K UHD)', stock: 3, price: 27500, category: 'Streaming' },
  ],
  // Spotify
  spotify: [
    { id: 'sp-1', name: 'Spotify', variant: 'Spotify Famplan 1 Bulan', stock: 15, price: 4400, category: 'Music' },
    { id: 'sp-2', name: 'Spotify', variant: 'Spotify Famplan 2 Bulan', stock: 7, price: 7700, category: 'Music' },
    { id: 'sp-3', name: 'Spotify', variant: 'Spotify Premium 1 Bulan', stock: 18, price: 3300, category: 'Music' },
    { id: 'sp-4', name: 'Spotify', variant: 'Spotify Premium 2 Bulan', stock: 10, price: 6050, category: 'Music' },
    { id: 'sp-5', name: 'Spotify', variant: 'Spotify Premium 3 Bulan', stock: 8, price: 8800, category: 'Music' },
  ],
  // Disney+ Hotstar
  disney: [
    { id: 'ds-1', name: 'Disney+ Hotstar', variant: 'Disney+ Basic 1 Bulan', stock: 10, price: 18000, category: 'Streaming' },
    { id: 'ds-2', name: 'Disney+ Hotstar', variant: 'Disney+ Premium 1 Bulan', stock: 8, price: 25000, category: 'Streaming' },
    { id: 'ds-3', name: 'Disney+ Hotstar', variant: 'Disney+ Sharing 3 Bulan', stock: 5, price: 45000, category: 'Streaming' },
  ],
  'disney+': [
    { id: 'ds-1', name: 'Disney+ Hotstar', variant: 'Disney+ Basic 1 Bulan', stock: 10, price: 18000, category: 'Streaming' },
    { id: 'ds-2', name: 'Disney+ Hotstar', variant: 'Disney+ Premium 1 Bulan', stock: 8, price: 25000, category: 'Streaming' },
    { id: 'ds-3', name: 'Disney+ Hotstar', variant: 'Disney+ Sharing 3 Bulan', stock: 5, price: 45000, category: 'Streaming' },
  ],
  'disney+ hotstar': [
    { id: 'ds-1', name: 'Disney+ Hotstar', variant: 'Disney+ Basic 1 Bulan', stock: 10, price: 18000, category: 'Streaming' },
    { id: 'ds-2', name: 'Disney+ Hotstar', variant: 'Disney+ Premium 1 Bulan', stock: 8, price: 25000, category: 'Streaming' },
    { id: 'ds-3', name: 'Disney+ Hotstar', variant: 'Disney+ Sharing 3 Bulan', stock: 5, price: 45000, category: 'Streaming' },
  ],
  // Viu
  viu: [
    { id: 'viu-1', name: 'Viu', variant: 'Viu Premium Private 1 Bulan', stock: 15, price: 7000, category: 'Streaming' },
    { id: 'viu-2', name: 'Viu', variant: 'Viu Premium Private 3 Bulan', stock: 10, price: 16000, category: 'Streaming' },
    { id: 'viu-3', name: 'Viu', variant: 'Viu Premium Private 6 Bulan', stock: 7, price: 28000, category: 'Streaming' },
  ],
  // Vidio
  vidio: [
    { id: 'vd-1', name: 'Vidio', variant: 'Vidio Platinum 1 Bulan', stock: 12, price: 15000, category: 'Streaming' },
    { id: 'vd-2', name: 'Vidio', variant: 'Vidio Diamond (EPL) 1 Bulan', stock: 6, price: 45000, category: 'Streaming' },
  ],
  // WeTV
  wetv: [
    { id: 'wt-1', name: 'WeTV', variant: 'WeTV VIP Sharing 1 Bulan', stock: 14, price: 9000, category: 'Streaming' },
    { id: 'wt-2', name: 'WeTV', variant: 'WeTV VIP Private 1 Bulan', stock: 8, price: 22000, category: 'Streaming' },
  ],
  // Prime Video
  prime: [
    { id: 'pv-1', name: 'Prime Video', variant: 'Prime Video Private 1 Bulan', stock: 9, price: 14000, category: 'Streaming' },
    { id: 'pv-2', name: 'Prime Video', variant: 'Prime Video Sharing 1 Bulan', stock: 15, price: 7500, category: 'Streaming' },
  ],
  // Canva Pro
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
  // CapCut Pro
  capcut: [
    { id: 'cc-1', name: 'CapCut Pro', variant: 'CapCut Pro 7 Hari Sharing', stock: 15, price: 4000, category: 'Editing' },
    { id: 'cc-2', name: 'CapCut Pro', variant: 'CapCut Pro 1 Bulan Sharing', stock: 10, price: 12000, category: 'Editing' },
    { id: 'cc-3', name: 'CapCut Pro', variant: 'CapCut Pro 1 Tahun Sharing', stock: 4, price: 65000, category: 'Editing' },
  ],
  'capcut pro': [
    { id: 'cc-1', name: 'CapCut Pro', variant: 'CapCut Pro 7 Hari Sharing', stock: 15, price: 4000, category: 'Editing' },
    { id: 'cc-2', name: 'CapCut Pro', variant: 'CapCut Pro 1 Bulan Sharing', stock: 10, price: 12000, category: 'Editing' },
    { id: 'cc-3', name: 'CapCut Pro', variant: 'CapCut Pro 1 Tahun Sharing', stock: 4, price: 65000, category: 'Editing' },
  ],
  // ChatGPT
  chatgpt: [
    { id: 'cg-1', name: 'ChatGPT', variant: 'ChatGPT Plus Shared 1 Bulan', stock: 5, price: 45000, category: 'AI' },
    { id: 'cg-2', name: 'ChatGPT', variant: 'ChatGPT Plus Private 1 Bulan', stock: 2, price: 310000, category: 'AI' },
  ],
  gpt: [
    { id: 'cg-1', name: 'ChatGPT', variant: 'ChatGPT Plus Shared 1 Bulan', stock: 5, price: 45000, category: 'AI' },
    { id: 'cg-2', name: 'ChatGPT', variant: 'ChatGPT Plus Private 1 Bulan', stock: 2, price: 310000, category: 'AI' },
  ],
  // Claude
  claude: [
    { id: 'cl-1', name: 'Claude', variant: 'Claude Pro Shared 1 Bulan', stock: 4, price: 48000, category: 'AI' },
    { id: 'cl-2', name: 'Claude', variant: 'Claude Pro Private 1 Bulan', stock: 2, price: 320000, category: 'AI' },
  ],
  // Gemini
  gemini: [
    { id: 'gm-1', name: 'Gemini', variant: 'Gemini Advanced 1 Bulan', stock: 7, price: 35000, category: 'AI' },
    { id: 'gm-2', name: 'Gemini', variant: 'Gemini Workspace Pro 1 Bulan', stock: 4, price: 55000, category: 'AI' },
  ],
  // Microsoft 365
  microsoft: [
    { id: 'ms-1', name: 'Microsoft 365', variant: 'Microsoft 365 Family 1 Tahun (1TB)', stock: 8, price: 35000, category: 'Produktivitas' },
    { id: 'ms-2', name: 'Microsoft 365', variant: 'Office 365 Pro Plus Akun Baru', stock: 12, price: 25000, category: 'Produktivitas' },
  ],
  'microsoft 365': [
    { id: 'ms-1', name: 'Microsoft 365', variant: 'Microsoft 365 Family 1 Tahun (1TB)', stock: 8, price: 35000, category: 'Produktivitas' },
    { id: 'ms-2', name: 'Microsoft 365', variant: 'Office 365 Pro Plus Akun Baru', stock: 12, price: 25000, category: 'Produktivitas' },
  ],
  // Alight Motion
  alight: [
    { id: 'am-1', name: 'Alight Motion', variant: 'Alight Motion Pro 1 Tahun', stock: 15, price: 12000, category: 'Editing' },
    { id: 'am-2', name: 'Alight Motion', variant: 'Alight Motion Pro Lifetime Sharing', stock: 8, price: 25000, category: 'Editing' },
  ],
  'alight motion': [
    { id: 'am-1', name: 'Alight Motion', variant: 'Alight Motion Pro 1 Tahun', stock: 15, price: 12000, category: 'Editing' },
    { id: 'am-2', name: 'Alight Motion', variant: 'Alight Motion Pro Lifetime Sharing', stock: 8, price: 25000, category: 'Editing' },
  ],
  // Mobile Legends
  'mobile legends': [
    { id: 'ml-1', name: 'Mobile Legends', variant: '86 Diamonds (78 + 8 Bonus)', stock: 999, price: 19000, category: 'Game Topup' },
    { id: 'ml-2', name: 'Mobile Legends', variant: '172 Diamonds (156 + 16 Bonus)', stock: 999, price: 38000, category: 'Game Topup' },
    { id: 'ml-3', name: 'Mobile Legends', variant: '257 Diamonds (234 + 23 Bonus)', stock: 999, price: 57000, category: 'Game Topup' },
    { id: 'ml-4', name: 'Mobile Legends', variant: 'Weekly Diamond Pass (WDP)', stock: 999, price: 27500, category: 'Game Topup' },
    { id: 'ml-5', name: 'Mobile Legends', variant: '706 Diamonds (636 + 70 Bonus)', stock: 999, price: 152000, category: 'Game Topup' },
    { id: 'ml-6', name: 'Mobile Legends', variant: 'Twilight Pass', stock: 500, price: 135000, category: 'Game Topup' },
  ],
  ml: [
    { id: 'ml-1', name: 'Mobile Legends', variant: '86 Diamonds (78 + 8 Bonus)', stock: 999, price: 19000, category: 'Game Topup' },
    { id: 'ml-2', name: 'Mobile Legends', variant: '172 Diamonds (156 + 16 Bonus)', stock: 999, price: 38000, category: 'Game Topup' },
    { id: 'ml-3', name: 'Mobile Legends', variant: '257 Diamonds (234 + 23 Bonus)', stock: 999, price: 57000, category: 'Game Topup' },
    { id: 'ml-4', name: 'Mobile Legends', variant: 'Weekly Diamond Pass (WDP)', stock: 999, price: 27500, category: 'Game Topup' },
    { id: 'ml-5', name: 'Mobile Legends', variant: '706 Diamonds (636 + 70 Bonus)', stock: 999, price: 152000, category: 'Game Topup' },
  ],
  mlbb: [
    { id: 'ml-1', name: 'Mobile Legends', variant: '86 Diamonds (78 + 8 Bonus)', stock: 999, price: 19000, category: 'Game Topup' },
    { id: 'ml-2', name: 'Mobile Legends', variant: '172 Diamonds (156 + 16 Bonus)', stock: 999, price: 38000, category: 'Game Topup' },
    { id: 'ml-3', name: 'Mobile Legends', variant: 'Weekly Diamond Pass (WDP)', stock: 999, price: 27500, category: 'Game Topup' },
  ],
  // Free Fire
  'free fire': [
    { id: 'ff-1', name: 'Free Fire', variant: '70 Diamonds', stock: 999, price: 9000, category: 'Game Topup' },
    { id: 'ff-2', name: 'Free Fire', variant: '140 Diamonds', stock: 999, price: 18000, category: 'Game Topup' },
    { id: 'ff-3', name: 'Free Fire', variant: '355 Diamonds', stock: 999, price: 45000, category: 'Game Topup' },
    { id: 'ff-4', name: 'Free Fire', variant: 'Membership Mingguan FF', stock: 999, price: 28000, category: 'Game Topup' },
    { id: 'ff-5', name: 'Free Fire', variant: '720 Diamonds', stock: 999, price: 90000, category: 'Game Topup' },
  ],
  ff: [
    { id: 'ff-1', name: 'Free Fire', variant: '70 Diamonds', stock: 999, price: 9000, category: 'Game Topup' },
    { id: 'ff-2', name: 'Free Fire', variant: '140 Diamonds', stock: 999, price: 18000, category: 'Game Topup' },
    { id: 'ff-3', name: 'Free Fire', variant: '355 Diamonds', stock: 999, price: 45000, category: 'Game Topup' },
    { id: 'ff-4', name: 'Free Fire', variant: 'Membership Mingguan FF', stock: 999, price: 28000, category: 'Game Topup' },
  ],
  // PUBG Mobile
  pubg: [
    { id: 'pubg-1', name: 'PUBG Mobile', variant: '60 UC (Unknown Cash)', stock: 999, price: 14500, category: 'Game Topup' },
    { id: 'pubg-2', name: 'PUBG Mobile', variant: '300 + 25 UC', stock: 999, price: 72000, category: 'Game Topup' },
    { id: 'pubg-3', name: 'PUBG Mobile', variant: '600 + 60 UC', stock: 999, price: 142000, category: 'Game Topup' },
    { id: 'pubg-4', name: 'PUBG Mobile', variant: 'Royale Pass Upgrade', stock: 500, price: 150000, category: 'Game Topup' },
  ],
  'pubg mobile': [
    { id: 'pubg-1', name: 'PUBG Mobile', variant: '60 UC (Unknown Cash)', stock: 999, price: 14500, category: 'Game Topup' },
    { id: 'pubg-2', name: 'PUBG Mobile', variant: '300 + 25 UC', stock: 999, price: 72000, category: 'Game Topup' },
    { id: 'pubg-3', name: 'PUBG Mobile', variant: '600 + 60 UC', stock: 999, price: 142000, category: 'Game Topup' },
  ],
  // Valorant
  valorant: [
    { id: 'val-1', name: 'Valorant', variant: '475 VP (Valorant Points)', stock: 999, price: 52000, category: 'Game Topup' },
    { id: 'val-2', name: 'Valorant', variant: '1000 VP', stock: 999, price: 108000, category: 'Game Topup' },
    { id: 'val-3', name: 'Valorant', variant: '2050 VP', stock: 999, price: 215000, category: 'Game Topup' },
  ],
  val: [
    { id: 'val-1', name: 'Valorant', variant: '475 VP (Valorant Points)', stock: 999, price: 52000, category: 'Game Topup' },
    { id: 'val-2', name: 'Valorant', variant: '1000 VP', stock: 999, price: 108000, category: 'Game Topup' },
  ],
  // Genshin Impact
  genshin: [
    { id: 'gi-1', name: 'Genshin Impact', variant: 'Blessing of the Welkin Moon', stock: 999, price: 68000, category: 'Game Topup' },
    { id: 'gi-2', name: 'Genshin Impact', variant: '300 + 30 Genesis Crystals', stock: 999, price: 72000, category: 'Game Topup' },
  ],
  'genshin impact': [
    { id: 'gi-1', name: 'Genshin Impact', variant: 'Blessing of the Welkin Moon', stock: 999, price: 68000, category: 'Game Topup' },
    { id: 'gi-2', name: 'Genshin Impact', variant: '300 + 30 Genesis Crystals', stock: 999, price: 72000, category: 'Game Topup' },
  ],
  // Honor of Kings
  'honor of kings': [
    { id: 'hok-1', name: 'Honor of Kings', variant: '80 + 8 Tokens', stock: 999, price: 14500, category: 'Game Topup' },
    { id: 'hok-2', name: 'Honor of Kings', variant: '240 + 24 Tokens', stock: 999, price: 43500, category: 'Game Topup' },
    { id: 'hok-3', name: 'Honor of Kings', variant: 'Weekly Card HOK', stock: 999, price: 22000, category: 'Game Topup' },
  ],
  hok: [
    { id: 'hok-1', name: 'Honor of Kings', variant: '80 + 8 Tokens', stock: 999, price: 14500, category: 'Game Topup' },
    { id: 'hok-2', name: 'Honor of Kings', variant: 'Weekly Card HOK', stock: 999, price: 22000, category: 'Game Topup' },
  ],
  // Roblox
  roblox: [
    { id: 'rbx-1', name: 'Roblox', variant: '80 Robux Fast Delivery', stock: 999, price: 14000, category: 'Game Topup' },
    { id: 'rbx-2', name: 'Roblox', variant: '400 Robux Fast Delivery', stock: 999, price: 68000, category: 'Game Topup' },
    { id: 'rbx-3', name: 'Roblox', variant: '800 Robux Fast Delivery', stock: 999, price: 135000, category: 'Game Topup' },
  ],
  // DANA
  dana: [
    { id: 'ew-1', name: 'DANA', variant: 'Saldo DANA Rp20.000', stock: 999, price: 20600, category: 'E-Wallet' },
    { id: 'ew-2', name: 'DANA', variant: 'Saldo DANA Rp50.000', stock: 999, price: 50600, category: 'E-Wallet' },
    { id: 'ew-3', name: 'DANA', variant: 'Saldo DANA Rp100.000', stock: 999, price: 100700, category: 'E-Wallet' },
  ],
  // GoPay
  gopay: [
    { id: 'gp-1', name: 'GoPay', variant: 'Saldo GoPay Rp25.000', stock: 999, price: 25500, category: 'E-Wallet' },
    { id: 'gp-2', name: 'GoPay', variant: 'Saldo GoPay Rp50.000', stock: 999, price: 50700, category: 'E-Wallet' },
  ],
  // Pulsa Telkomsel
  telkomsel: [
    { id: 'pls-1', name: 'Telkomsel', variant: 'Pulsa Telkomsel Rp25.000', stock: 999, price: 25400, category: 'Pulsa' },
    { id: 'pls-2', name: 'Telkomsel', variant: 'Pulsa Telkomsel Rp50.000', stock: 999, price: 50400, category: 'Pulsa' },
  ],
  // Pulsa Indosat
  indosat: [
    { id: 'pls-3', name: 'Indosat', variant: 'Pulsa Indosat Rp25.000', stock: 999, price: 25300, category: 'Pulsa' },
    { id: 'pls-4', name: 'Indosat', variant: 'Pulsa Indosat Rp50.000', stock: 999, price: 49900, category: 'Pulsa' },
  ],
  // SMM TikTok
  tiktok: [
    { id: 'smm-1', name: 'TikTok', variant: '1.000 Followers TikTok Indonesia Aktif', stock: 999, price: 25000, category: 'SMM' },
    { id: 'smm-2', name: 'TikTok', variant: '1.000 Likes TikTok Real Server Cepat', stock: 999, price: 8000, category: 'SMM' },
    { id: 'smm-3', name: 'TikTok', variant: '10.000 Views TikTok Instant', stock: 999, price: 5000, category: 'SMM' },
  ],
  // SMM Instagram
  instagram: [
    { id: 'smm-4', name: 'Instagram', variant: '1.000 Followers Instagram Real Pasif', stock: 999, price: 18000, category: 'SMM' },
    { id: 'smm-5', name: 'Instagram', variant: '1.000 Likes Instagram High Quality', stock: 999, price: 6000, category: 'SMM' },
  ],
};

/**
 * Menghasilkan teks daftar produk terformat dan lengkap untuk command .list
 */
export async function generateDaftarProdukText(config: CommandsConfig): Promise<string> {
  const apiKey = config.xavieraApiKey?.trim();
  const baseUrl = (config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

  // Jika API Key kosong / tidak ada, kosongkan daftar produk (tidak menggunakan data cadangan lokal)
  if (!apiKey) {
    return '';
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
      return '';
    }

    const json = await response.json();
    const rawProducts = json.products || json.data || [];

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return '';
    }

    const groups: Record<string, string[]> = {};

    for (const prod of rawProducts) {
      let name = (prod.name || '').trim();
      if (!name) continue;

      const lowerName = name.toLowerCase();
      // Lewati bot creator internal dan voucher makanan/minuman
      if (lowerName.startsWith('bot ') || lowerName.includes('voucher')) continue;

      let cat = (prod.category || prod.kategori || 'Lainnya').trim();
      // Normalisasi 'editing' menjadi 'Editing'
      if (cat.toLowerCase() === 'editing') cat = 'Editing';

      // Lewati kategori di luar produk aplikasi digital
      if (cat === 'E WALLET' || cat === 'Olahraga') continue;

      // Bersihkan pemisah varian waktu ' — 1 Bulan', ' — 7 Hari' dll jika ada
      if (name.includes(' — ')) {
        name = name.split(' — ')[0].trim();
      }
      name = name.replace(/\s+/g, ' ');

      if (!groups[cat]) groups[cat] = [];

      // Khusus Akun Premium, lewati Spotify dan CapCut Pro agar tidak redundan
      if (cat === 'Akun Premium' && (name === 'Spotify' || name === 'CapCut Pro')) continue;

      if (!groups[cat].includes(name)) {
        groups[cat].push(name);
      }
    }

    let globalCounter = 1;
    const sections: string[] = [];

    for (const [cat, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      const listText = items.map((item) => `• ${globalCounter++}. ${item}`).join('\n');
      sections.push(`*${cat}:*\n${listText}`);
    }

    return sections.length > 0 ? sections.join('\n\n') : '';
  } catch {
    return '';
  }
}

export interface SingleSelectSection {
  title: string;
  rows: Array<{
    title: string;
    description: string;
    id: string;
    rowId: string;
  }>;
}

/**
 * Mengambil sections dan baris pilihan produk dropdown single select langsung dari API Xaviera
 * Terbagi otomatis per kategori produk persis seperti pada menu list.
 */
export async function getSingleSelectSections(config: CommandsConfig): Promise<SingleSelectSection[]> {
  const apiKey = config.xavieraApiKey?.trim();
  const baseUrl = (config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

  if (!apiKey) {
    return [];
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
      return [];
    }

    const json = await response.json();
    const rawProducts = json.products || json.data || [];

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return [];
    }

    const groups: Record<string, Array<{ name: string; desc: string }>> = {};

    for (const prod of rawProducts) {
      let name = (prod.name || '').trim();
      if (!name) continue;

      const lowerName = name.toLowerCase();
      if (lowerName.startsWith('bot ') || lowerName.includes('voucher')) continue;

      let cat = (prod.category || prod.kategori || 'Lainnya').trim();
      if (cat.toLowerCase() === 'editing') cat = 'Editing';
      if (cat === 'E WALLET' || cat === 'Olahraga') continue;

      if (name.includes(' — ')) {
        name = name.split(' — ')[0].trim();
      }
      name = name.replace(/\s+/g, ' ');

      if (cat === 'Akun Premium' && (name === 'Spotify' || name === 'CapCut Pro')) continue;

      if (!groups[cat]) groups[cat] = [];

      const exists = groups[cat].some((i) => i.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        let desc = (prod.desc || '').trim();
        if (desc) {
          desc = desc.split('\n')[0].replace(/^[-•*]\s*/, '').trim();
          if (desc.length > 50) desc = desc.substring(0, 47) + '...';
        }
        if (!desc) {
          desc = `Paket & langganan resmi ${name}`;
        }
        groups[cat].push({ name, desc });
      }
    }

    const sections: SingleSelectSection[] = [];
    for (const [cat, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      sections.push({
        title: cat,
        rows: items.map((item) => ({
          title: item.name,
          description: `Tampilkan varian *${item.name}*`,
          id: `prod_select:${item.name}`,
          rowId: `prod_select:${item.name}`,
        })),
      });
    }

    return sections;
  } catch {
    return [];
  }
}

/**
 * Memeriksa apakah nama produk cocok dengan salah satu produk dalam katalog
 */
export function isKnownProduct(query: string): boolean {
  if (!query) return false;
  const clean = query.trim().toLowerCase();

  for (const group of DEFAULT_CATALOG) {
    for (const item of group.items) {
      const lower = item.toLowerCase();
      if (lower === clean || clean.includes(lower) || lower.includes(clean)) {
        return true;
      }
    }
  }

  for (const key of Object.keys(DEFAULT_VARIANTS_MAP)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return true;
    }
  }

  return false;
}


/**
 * Mengambil varian produk dari API Xaviera dengan fallback ke daftar statis
 */
export async function getProductVariants(
  productName: string,
  config: CommandsConfig
): Promise<ProductVariantItem[]> {
  const apiKey = config.xavieraApiKey?.trim();
  const baseUrl = (config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');
  const cleanSearch = (productName || '').trim().toLowerCase();

  // Alias lookup
  const aliasMap: Record<string, string> = {
    yt: 'youtube',
    nf: 'netflix',
    sp: 'spotify',
    cv: 'canva',
    cc: 'capcut',
    cg: 'chatgpt',
    gpt: 'chatgpt',
    ml: 'mobile legends',
    mlbb: 'mobile legends',
    ff: 'free fire',
    freefire: 'free fire',
    pubg: 'pubg mobile',
    pubgm: 'pubg mobile',
    val: 'valorant',
    gi: 'genshin impact',
    hok: 'honor of kings',
    rbx: 'roblox',
  };
  const resolvedSearch = aliasMap[cleanSearch] || cleanSearch;

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
          const matchedList = rawProducts.filter((p: any) => {
            const pName = (p.name || '').toLowerCase();
            const pCode = (p.code || p.buyer_sku_code || '').toLowerCase();
            return (
              pName.includes(resolvedSearch) ||
              resolvedSearch.includes(pName) ||
              pCode.includes(resolvedSearch) ||
              (resolvedSearch.includes('capcut') && pName.includes('capcut')) ||
              (resolvedSearch.includes('disney') && pName.includes('disney')) ||
              (resolvedSearch.includes('netflix') && pName.includes('netflix')) ||
              (resolvedSearch.includes('youtube') && pName.includes('youtube')) ||
              (resolvedSearch.includes('spotify') && pName.includes('spotify')) ||
              (resolvedSearch.includes('canva') && pName.includes('canva'))
            );
          });

          if (matchedList.length > 0) {
            // Prioritaskan exact match nama produk jika ada (contoh "YouTube" persis)
            const exactMatches = matchedList.filter(
              (p: any) => (p.name || '').toLowerCase() === resolvedSearch
            );
            const listToProcess = exactMatches.length > 0 ? exactMatches : matchedList;

            const resultVariants: ProductVariantItem[] = [];
            for (const item of listToProcess) {
              const cat = item.category || item.type || 'Layanan Digital';
              const pName = item.name || productName;

              // Jika produk dari API Xaviera memiliki array variants asli (misal YouTube memiliki 3 varian)
              if (item.hasVariants && Array.isArray(item.variants) && item.variants.length > 0) {
                for (const v of item.variants) {
                  const basePrice = Number(v.price ?? v.harga ?? 0);
                  let stockNum = 0;
                  if (typeof v.stock === 'number') stockNum = v.stock;
                  else if (typeof item.stock === 'number') stockNum = item.stock;

                  resultVariants.push({
                    id: v.id || v.code || `var-${Math.random().toString(36).substring(2, 6)}`,
                    name: pName,
                    variant: v.name || v.variant || `${pName} Varian`,
                    stock: stockNum,
                    price: basePrice || 5000,
                    category: cat,
                  });
                }
              } else {
                const basePrice = Number(item.price || item.harga || 0);
                const margin = Math.round(basePrice * 0.1);
                const sellPrice = basePrice + margin;

                let stockNum = 10;
                if (typeof item.stock === 'number') stockNum = item.stock;
                else if (typeof item.buyer_product_status === 'boolean') stockNum = item.buyer_product_status ? 25 : 0;
                else if (item.status && item.status.toString().toLowerCase().includes('empty')) stockNum = 0;

                resultVariants.push({
                  id: item.code || item.id || `var-${Math.random().toString(36).substring(2, 6)}`,
                  name: item.brand || item.name || productName,
                  variant: item.name || item.product_name || `${productName} Varian`,
                  stock: stockNum,
                  price: sellPrice || 5000,
                  category: cat,
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

  // Jika produk tidak ditemukan di API Xaviera atau API Key tidak valid, kosongkan varian (tidak menggunakan cadangan lokal)
  return [];
}

/**
 * Cek apakah saldo akun utama di API Xaviera mencukupi sebelum memproses transaksi
 */
export async function checkXavieraBalance(
  amountNeeded: number,
  config: CommandsConfig
): Promise<{ sufficient: boolean; currentBalance: number; error?: string }> {
  const apiKey = config.xavieraApiKey?.trim();
  const baseUrl = (config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');

  if (!apiKey) {
    return { sufficient: true, currentBalance: 0 };
  }

  try {
    const res = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const raw = json.data || json.user || json;
      const bal = Number(raw.balance ?? raw.saldo ?? 0);
      return {
        sufficient: bal >= amountNeeded,
        currentBalance: bal,
      };
    } else {
      return { sufficient: true, currentBalance: 0, error: 'Gagal cek saldo Xaviera' };
    }
  } catch (err: any) {
    return { sufficient: true, currentBalance: 0, error: err?.message };
  }
}


