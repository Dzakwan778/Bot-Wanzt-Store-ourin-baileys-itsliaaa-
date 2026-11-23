import {
  BroadcastCampaignStatus,
  BroadcastScheduleType,
} from '../types/admin.types.ts';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface BroadcastTenantPlaceholderInput {
  tenant_id: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  expires_at: string;
}

export function formatIndonesianWibDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return (
      new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(d) + ' WIB'
    );
  } catch {
    return isoStr;
  }
}

export function formatRemainingDurationLabel(expiresAtIso: string, nowMs: number = Date.now()): string {
  const expMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expMs)) return '-';
  const diffMs = Math.max(0, expMs - nowMs);
  if (diffMs === 0) return 'Kedaluwarsa';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  }
  return `${Math.max(1, minutes)} menit`;
}

/**
 * Menggantikan variabel placeholder dinamis pada pesan broadcast murni sesuai ketikan admin.
 */
export function resolveBroadcastPlaceholders(
  rawMessage: string,
  tenant: BroadcastTenantPlaceholderInput,
  nowMs: number = Date.now()
): string {
  if (!rawMessage) return '';

  const expMs = new Date(tenant.expires_at).getTime();
  const daysRemaining = Number.isNaN(expMs)
    ? 0
    : Math.max(0, Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24)));

  const formattedExpiry = formatIndonesianWibDateTime(tenant.expires_at);
  const remainingLabel = formatRemainingDurationLabel(tenant.expires_at, nowMs);

  return rawMessage
    .replace(/\{storeName\}|\{namaStore\}/gi, tenant.store_name || tenant.tenant_id)
    .replace(/\{ownerName\}|\{namaOwner\}/gi, tenant.owner_name || 'Owner')
    .replace(/\{tenantId\}/gi, tenant.tenant_id || '')
    .replace(/\{ownerPhone\}|\{ownerNumber\}|\{nomerOwner\}/gi, tenant.owner_phone || '-')
    .replace(/\{expiryDate\}|\{waktuKedaluwarsa\}/gi, formattedExpiry)
    .replace(/\{daysRemaining\}|\{sisaHari\}/gi, String(daysRemaining))
    .replace(/\{remainingTime\}|\{sisaWaktu\}/gi, remainingLabel);
}

/**
 * Mengonversi string datetime-local WIB ('YYYY-MM-DDTHH:mm') menjadi ISO UTC string yang presisi.
 */
export function parseWibDateTimeToUtcIso(wibDateTimeStr: string): string | null {
  const trimmed = String(wibDateTimeStr || '').trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || '0');

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0) - WIB_OFFSET_MS;
  const checkWib = new Date(utcMs + WIB_OFFSET_MS);
  if (
    checkWib.getUTCFullYear() !== year ||
    checkWib.getUTCMonth() !== month - 1 ||
    checkWib.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(utcMs).toISOString();
}

function parseTimeHHmm(timeStr?: string | null): { hour: number; minute: number } | null {
  const match = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function getDaysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export interface NextRunScheduleParams {
  schedule_type: BroadcastScheduleType;
  recurrence_time?: string | null;
  recurrence_day_of_week?: number | null;
  recurrence_day_of_month?: number | null;
}

/**
 * Menghitung jadwal eksekusi berikutnya (UTC ISO) dalam zona waktu WIB (UTC+7)
 * setelah titik waktu referensi `fromUtcMs`.
 */
export function computeNextRecurringRunUtc(
  params: NextRunScheduleParams,
  fromUtcMs: number
): string | null {
  const parsedTime = parseTimeHHmm(params.recurrence_time);
  if (!parsedTime) return null;

  const { hour, minute } = parsedTime;
  const wibNow = new Date(fromUtcMs + WIB_OFFSET_MS);
  const wibYear = wibNow.getUTCFullYear();
  const wibMonth = wibNow.getUTCMonth();
  const wibDate = wibNow.getUTCDate();
  const wibWeekday = wibNow.getUTCDay();

  if (params.schedule_type === 'daily') {
    let candidateUtcMs = Date.UTC(wibYear, wibMonth, wibDate, hour, minute, 0, 0) - WIB_OFFSET_MS;
    if (candidateUtcMs <= fromUtcMs) {
      candidateUtcMs = Date.UTC(wibYear, wibMonth, wibDate + 1, hour, minute, 0, 0) - WIB_OFFSET_MS;
    }
    return new Date(candidateUtcMs).toISOString();
  }

  if (params.schedule_type === 'weekly') {
    const targetDay =
      typeof params.recurrence_day_of_week === 'number' &&
      params.recurrence_day_of_week >= 0 &&
      params.recurrence_day_of_week <= 6
        ? params.recurrence_day_of_week
        : wibWeekday;

    let dayOffset = (targetDay - wibWeekday + 7) % 7;
    let candidateUtcMs =
      Date.UTC(wibYear, wibMonth, wibDate + dayOffset, hour, minute, 0, 0) - WIB_OFFSET_MS;
    if (candidateUtcMs <= fromUtcMs) {
      dayOffset += 7;
      candidateUtcMs =
        Date.UTC(wibYear, wibMonth, wibDate + dayOffset, hour, minute, 0, 0) - WIB_OFFSET_MS;
    }
    return new Date(candidateUtcMs).toISOString();
  }

  if (params.schedule_type === 'monthly') {
    const rawTargetDay =
      typeof params.recurrence_day_of_month === 'number' &&
      params.recurrence_day_of_month >= 1 &&
      params.recurrence_day_of_month <= 31
        ? params.recurrence_day_of_month
        : wibDate;

    const clampedThisMonth = Math.min(rawTargetDay, getDaysInMonth(wibYear, wibMonth));
    let candidateUtcMs =
      Date.UTC(wibYear, wibMonth, clampedThisMonth, hour, minute, 0, 0) - WIB_OFFSET_MS;

    if (candidateUtcMs <= fromUtcMs) {
      const nextMonth = wibMonth + 1;
      const nextYear = wibYear + Math.floor(nextMonth / 12);
      const normMonth = nextMonth % 12;
      const clampedNextMonth = Math.min(rawTargetDay, getDaysInMonth(nextYear, normMonth));
      candidateUtcMs =
        Date.UTC(nextYear, normMonth, clampedNextMonth, hour, minute, 0, 0) - WIB_OFFSET_MS;
    }

    return new Date(candidateUtcMs).toISOString();
  }

  return null;
}

/**
 * Mengevaluasi status akhir suatu eksekusi kampanye berdasarkan jumlah sukses & gagal.
 */
export function evaluateCampaignRunStatus(params: {
  totalSuccess: number;
  totalFailed: number;
}): BroadcastCampaignStatus {
  const { totalSuccess, totalFailed } = params;
  if (totalSuccess === 0 && totalFailed === 0) return 'completed';
  if (totalSuccess > 0 && totalFailed === 0) return 'completed';
  if (totalSuccess > 0 && totalFailed > 0) return 'partial';
  return 'failed';
}

export function deriveCampaignTitle(explicitTitle: string | undefined, message: string): string {
  const cleanTitle = String(explicitTitle || '').trim();
  if (cleanTitle) return cleanTitle.slice(0, 80);

  const firstLine = String(message || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (!firstLine) return 'Pesan Siaran Tanpa Judul';
  return firstLine.length > 56 ? `${firstLine.slice(0, 56)}...` : firstLine;
}
