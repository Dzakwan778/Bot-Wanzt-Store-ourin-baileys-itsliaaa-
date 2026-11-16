export interface TenantRecord {
  id: number;
  tenant_id: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  username: string;
  package_name: string;
  status: 'active' | 'suspended' | 'expired';
  max_groups: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
  warned_3d?: number;
  warned_1d?: number;
  warned_5h?: number;
  warned_1h?: number;
  days_remaining?: number;
  duration_days?: number;
  bot_status?: 'online' | 'offline';
}

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface CreateTenantInput {
  tenant_id?: string;
  store_name?: string;
  owner_name?: string;
  owner_phone?: string;
  username?: string;
  password?: string;
  package_name?: string;
  duration_value?: number;
  duration_unit?: DurationUnit;
  duration_days?: number; // Keep for backward compatibility
  max_groups?: number;
  notes?: string;
}

export interface CreateTenantResult extends TenantRecord {
  generated_username?: string;
  generated_password?: string;
}

export interface TenantMessageStat {
  tenant_id: string;
  store_name: string;
  owner_name: string;
  whatsapp_messages: number;
  telegram_messages: number;
  total_messages: number;
}

export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
  totalMessages: number;
  whatsappMessagesTotal: number;
  telegramMessagesTotal: number;
  tenantMessageStats: TenantMessageStat[];
  serverTime: string;
}

export interface LicenseToken {
  id: string;
  token_code: string;
  amount: number;
  unit: DurationUnit;
  duration_label: string;
  status: 'available' | 'used' | 'revoked';
  created_at: string;
  used_by_tenant_id?: string;
  used_at?: string;
}

export interface CollaboratorApiKey {
  id: number;
  name: string;
  prefix_key: string;
  status: 'active' | 'suspended';
  last_used_at: string | null;
  created_at: string;
  usage_count?: number;
}

export interface CreatePartnerKeyResult {
  key: CollaboratorApiKey;
  raw_api_key: string;
}

export interface CollaboratorLog {
  id: number;
  collaborator_id: number;
  collaborator_name: string;
  action_type: 'create_tenant' | 'create_token';
  target_id: string;
  duration_label: string;
  request_ip: string;
  created_at: string;
}

export type BroadcastChannel = 'both' | 'whatsapp' | 'telegram';
export type BroadcastScheduleType = 'immediate' | 'once' | 'daily' | 'weekly' | 'monthly';
export type BroadcastCampaignStatus =
  | 'scheduled'
  | 'active_recurring'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

export interface BroadcastCampaign {
  id: number;
  title: string;
  message: string;
  channel: BroadcastChannel;
  schedule_type: BroadcastScheduleType;
  scheduled_at: string | null;
  recurrence_time: string | null;
  recurrence_day_of_week: number | null;
  recurrence_day_of_month: number | null;
  next_run_at: string | null;
  status: BroadcastCampaignStatus;
  total_targets: number;
  wa_success: number;
  wa_failed: number;
  tg_success: number;
  tg_failed: number;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastLogEntry {
  id: number;
  campaign_id: number;
  run_number: number;
  tenant_id: string;
  store_name: string;
  owner_name: string;
  channel: 'whatsapp' | 'telegram';
  target: string;
  status: 'success' | 'failed';
  error_message: string | null;
  rendered_message: string | null;
  sent_at: string;
}

export interface CreateBroadcastInput {
  title?: string;
  message: string;
  channel: BroadcastChannel;
  schedule_type: BroadcastScheduleType;
  scheduled_at_wib?: string; // Format YYYY-MM-DDTHH:mm WIB
  recurrence_time?: string; // Format HH:mm WIB
  recurrence_day_of_week?: number | null; // 0 (Minggu) - 6 (Sabtu)
  recurrence_day_of_month?: number | null; // 1 - 31
}
