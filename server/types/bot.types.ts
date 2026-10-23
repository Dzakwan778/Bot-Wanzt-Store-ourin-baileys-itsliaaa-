export const DEFAULT_CUSTOM_CODE = 'WANZTSTR';
export const SESSION_DIR = 'session_ourin';
export const CONFIG_FILE = 'commands_config.json';

// Supported command prefixes: /, ., !, ?, #, $, %, &
export const ALLOWED_PREFIXES = ['/', '.', '!', '?', '#', '$', '%', '&'];

export type BotStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_code'
  | 'code_ready'
  | 'connected'
  | 'closed'
  | 'error';

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
  | 'vcard'
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

export interface StoreInfoConfig {
  storeName: string;
  ownerName: string;
  ownerNumber: string;
  adminName?: string;
  adminNumber?: string;
  webLink?: string;
  telegramBot?: string;
  waLink?: string;
}

export interface MenuCommandConfig {
  menuOutputText: string;
  menuFooterText: string;
  menuButtons: WhatsAppButton[];
  includeMedia: boolean;
  selectedPicture: string;
}

export interface ListCommandConfig {
  listOutputText: string;
  listFooterText: string;
}

export interface CarouselCommandConfig {
  carouselOutputText: string;
  carouselFooterText: string;
  carouselPicture: string;
}

export interface ApiConfig {
  xavieraApiKey: string;
  xavieraBaseUrl: string;
}

export interface CommandsConfig {
  storeInfo: StoreInfoConfig;
  menuOutputText: string;
  menuFooterText?: string;
  menuButtons: WhatsAppButton[];
  includeMedia?: boolean;
  selectedPicture?: string;
  listOutputText: string;
  listFooterText?: string;
  carouselOutputText?: string;
  carouselFooterText?: string;
  carouselPicture?: string;
  xavieraApiKey?: string;
  xavieraBaseUrl?: string;
}
