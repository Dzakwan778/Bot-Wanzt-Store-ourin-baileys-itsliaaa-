import { BroadcastCampaign, BroadcastReadinessSummary } from '../types/admin.types.ts';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export const DAY_OF_WEEK_LABELS: { value: number; label: string }[] = [
  { value: 0, label: 'Minggu' },
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
];

export const BROADCAST_PLACEHOLDERS: { tag: string; label: string }[] = [
  { tag: '{storeName}', label: 'Nama Toko' },
  { tag: '{ownerName}', label: 'Nama Owner' },
  { tag: '{tenantId}', label: 'ID Unit Bot' },
  { tag: '{ownerPhone}', label: 'No. WA Owner' },
  { tag: '{expiryDate}', label: 'Tanggal Expired' },
  { tag: '{daysRemaining}', label: 'Sisa Hari' },
  { tag: '{remainingTime}', label: 'Sisa Waktu Lengkap' },
];

export function formatWibDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return (
      new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(d) + ' WIB'
    );
  } catch {
    return isoStr;
  }
}

export function toWibDateTimeLocalInput(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  const ms = new Date(isoStr).getTime();
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + WIB_OFFSET_MS);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function getDefaultScheduledWibInput(nowMs: number = Date.now()): string {
  const futureMs = nowMs + 60 * 60 * 1000;
  return toWibDateTimeLocalInput(new Date(futureMs).toISOString());
}

export function describeScheduleRule(campaign: Pick<
  BroadcastCampaign,
  'schedule_type' | 'scheduled_at' | 'recurrence_time' | 'recurrence_day_of_week' | 'recurrence_day_of_month'
>): string {
  switch (campaign.schedule_type) {
    case 'immediate':
      return 'Kirim Langsung';
    case 'once':
      return `Sekali Kirim (${formatWibDateTime(campaign.scheduled_at)})`;
    case 'daily':
      return `Harian · Pukul ${campaign.recurrence_time || '09:00'} WIB`;
    case 'weekly': {
      const dayObj = DAY_OF_WEEK_LABELS.find((d) => d.value === campaign.recurrence_day_of_week);
      return `Mingguan · Setiap ${dayObj ? dayObj.label : 'Senin'}, ${campaign.recurrence_time || '09:00'} WIB`;
    }
    case 'monthly':
      return `Bulanan · Tanggal ${campaign.recurrence_day_of_month || 1}, ${campaign.recurrence_time || '09:00'} WIB`;
    default:
      return 'Kirim Langsung';
  }
}

export function previewBroadcastText(
  rawMessage: string,
  sampleTenant: BroadcastReadinessSummary['sampleTenant'],
  nowMs: number = Date.now()
): string {
  if (!rawMessage) return '';
  const tenant = sampleTenant || {
    tenant_id: 't_contoh',
    store_name: 'Toko Contoh',
    owner_name: 'Pemilik Toko',
    owner_phone: '+6281234567890',
    expires_at: new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const expMs = new Date(tenant.expires_at).getTime();
  const daysRemaining = Number.isNaN(expMs)
    ? 30
    : Math.max(0, Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24)));

  return rawMessage
    .replace(/\{storeName\}|\{namaStore\}/gi, tenant.store_name || tenant.tenant_id)
    .replace(/\{ownerName\}|\{namaOwner\}/gi, tenant.owner_name || 'Owner')
    .replace(/\{tenantId\}/gi, tenant.tenant_id)
    .replace(/\{ownerPhone\}|\{ownerNumber\}|\{nomerOwner\}/gi, tenant.owner_phone || '-')
    .replace(/\{expiryDate\}|\{waktuKedaluwarsa\}/gi, formatWibDateTime(tenant.expires_at))
    .replace(/\{daysRemaining\}|\{sisaHari\}/gi, String(daysRemaining))
    .replace(/\{remainingTime\}|\{sisaWaktu\}/gi, `${daysRemaining} hari`);
}
