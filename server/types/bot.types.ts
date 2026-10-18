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

export interface CommandsConfig {
  menuOutputText: string;
  menuButtons: WhatsAppButton[];
  includeMedia?: boolean;
  selectedPicture?: string;
  listOutputText: string;
  xavieraApiKey?: string;
  xavieraBaseUrl?: string;
}
