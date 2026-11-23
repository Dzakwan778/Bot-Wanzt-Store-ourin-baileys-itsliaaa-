export const REPORT_TITLE_MAX_LENGTH = 30;
export const REPORT_MAX_MEDIA = 3;
export const REPORT_MAX_VIDEO_COUNT = 1;
export const REPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const REPORT_VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export type ReportStatus = 'terkirim' | 'proses' | 'selesai';
export type ReportMediaType = 'image' | 'video';

export const ALLOWED_REPORT_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_REPORT_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export interface ReportMediaValidationInput {
  mediaType: ReportMediaType;
  mimeType: string;
  sizeBytes: number;
  originalName?: string;
}

export interface ReportValidationResult<T> {
  valid: boolean;
  error?: string;
  data?: T;
}

export function classifyReportMediaMime(mimeType: string): ReportMediaType | null {
  const clean = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (ALLOWED_REPORT_IMAGE_MIME.has(clean)) return 'image';
  if (ALLOWED_REPORT_VIDEO_MIME.has(clean)) return 'video';
  return null;
}

export function countChars(text: string): number {
  return [...String(text || '')].length;
}

export function validateSingleReportMedia(
  input: { mimeType: string; sizeBytes: number; originalName?: string }
): ReportValidationResult<{ mediaType: ReportMediaType; mimeType: string; sizeBytes: number; originalName: string }> {
  const cleanMime = String(input.mimeType || '').split(';')[0].trim().toLowerCase();
  const mediaType = classifyReportMediaMime(cleanMime);
  if (!mediaType) {
    return {
      valid: false,
      error: 'Format media tidak didukung. Gunakan foto (JPG/PNG/WEBP/GIF) atau video (MP4/WEBM/MOV).',
    };
  }

  const sizeBytes = Number(input.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      valid: false,
      error: 'File media kosong atau ukurannya tidak valid.',
    };
  }

  if (mediaType === 'image' && sizeBytes > REPORT_IMAGE_MAX_BYTES) {
    return {
      valid: false,
      error: 'Ukuran foto maksimal 5 MB per file.',
    };
  }

  if (mediaType === 'video' && sizeBytes > REPORT_VIDEO_MAX_BYTES) {
    return {
      valid: false,
      error: 'Ukuran video maksimal 25 MB per file.',
    };
  }

  const normalizedMime = cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime;
  const originalName = String(input.originalName || 'media').trim() || 'media';

  return {
    valid: true,
    data: {
      mediaType,
      mimeType: normalizedMime,
      sizeBytes,
      originalName,
    },
  };
}

export function validateReportSubmission(input: {
  title: string;
  message: string;
  mediaItems?: ReportMediaValidationInput[];
}): ReportValidationResult<{
  title: string;
  message: string;
  mediaItems: ReportMediaValidationInput[];
}> {
  const trimmedTitle = String(input.title || '').trim();
  const trimmedMessage = String(input.message || '').trim();
  const mediaItems = Array.isArray(input.mediaItems) ? input.mediaItems : [];

  if (!trimmedTitle) {
    return { valid: false, error: 'Nama laporan wajib diisi.' };
  }
  if (countChars(trimmedTitle) > REPORT_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Nama laporan maksimal ${REPORT_TITLE_MAX_LENGTH} karakter.`,
    };
  }
  if (!trimmedMessage) {
    return { valid: false, error: 'Pesan laporan wajib diisi.' };
  }

  if (mediaItems.length > REPORT_MAX_MEDIA) {
    return {
      valid: false,
      error: `Maksimal ${REPORT_MAX_MEDIA} media per laporan.`,
    };
  }

  let videoCount = 0;
  for (const item of mediaItems) {
    const check = validateSingleReportMedia(item);
    if (!check.valid || !check.data) {
      return { valid: false, error: check.error };
    }
    if (check.data.mediaType === 'video') {
      videoCount += 1;
      if (videoCount > REPORT_MAX_VIDEO_COUNT) {
        return {
          valid: false,
          error: `Maksimal hanya ${REPORT_MAX_VIDEO_COUNT} video per laporan.`,
        };
      }
    }
  }

  return {
    valid: true,
    data: {
      title: trimmedTitle,
      message: trimmedMessage,
      mediaItems,
    },
  };
}

export interface StoredReportRow {
  id: number;
  tenant_id: string;
  owner_name: string;
  owner_phone: string;
  store_name: string;
  title: string;
  message: string;
  status: ReportStatus;
  reply_enabled: number;
  admin_reply: string;
  created_at: string;
  updated_at: string;
}

export interface SerializedReportMedia {
  id: number;
  mediaType: ReportMediaType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface TenantReportDTO {
  id: number;
  title: string;
  message: string;
  status: ReportStatus;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  media: SerializedReportMedia[];
}

export interface AdminReportDTO {
  id: number;
  tenantId: string;
  storeName: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  message: string;
  status: ReportStatus;
  replyEnabled: boolean;
  adminReply: string;
  createdAt: string;
  updatedAt: string;
  media: SerializedReportMedia[];
}

/**
 * Mengembalikan balasan admin ke tenant HANYA jika:
 * - status laporan sudah 'selesai'
 * - reply_enabled bernilai aktif (1)
 * - pesan balasan admin tidak kosong
 */
export function resolveVisibleAdminReplyForTenant(
  status: ReportStatus,
  replyEnabled: boolean | number,
  adminReply: string | null | undefined
): string | null {
  if (status !== 'selesai') return null;
  if (!replyEnabled) return null;
  const trimmed = String(adminReply || '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function serializeReportForTenant(
  row: StoredReportRow,
  media: SerializedReportMedia[]
): TenantReportDTO {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    status: row.status,
    adminReply: resolveVisibleAdminReplyForTenant(row.status, row.reply_enabled, row.admin_reply),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
  };
}

export function serializeReportForAdmin(
  row: StoredReportRow,
  media: SerializedReportMedia[]
): AdminReportDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeName: row.store_name,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    title: row.title,
    message: row.message,
    status: row.status,
    replyEnabled: Boolean(row.reply_enabled),
    adminReply: String(row.admin_reply || ''),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
  };
}

export function resolveAdminReportUpdate(input: {
  nextStatus: 'proses' | 'selesai';
  replyEnabled?: boolean;
  adminReply?: string;
  existingReplyEnabled?: boolean;
  existingAdminReply?: string;
}): ReportValidationResult<{
  status: 'proses' | 'selesai';
  replyEnabled: boolean;
  adminReply: string;
}> {
  const nextStatus = input.nextStatus;
  if (nextStatus !== 'proses' && nextStatus !== 'selesai') {
    return { valid: false, error: 'Status laporan tidak valid.' };
  }

  const replyEnabled =
    typeof input.replyEnabled === 'boolean'
      ? input.replyEnabled
      : Boolean(input.existingReplyEnabled);

  const rawReply =
    input.adminReply !== undefined ? String(input.adminReply) : String(input.existingAdminReply || '');
  const trimmedReply = rawReply.trim();

  if (nextStatus === 'selesai') {
    if (replyEnabled) {
      if (!trimmedReply) {
        return {
          valid: false,
          error: 'Isi pesan balasan terlebih dahulu atau matikan toggle balasan sebelum menyelesaikan laporan.',
        };
      }
      return {
        valid: true,
        data: {
          status: 'selesai',
          replyEnabled: true,
          adminReply: trimmedReply,
        },
      };
    }

    // Toggle OFF saat Laporan Selesai -> tidak melampirkan balasan
    return {
      valid: true,
      data: {
        status: 'selesai',
        replyEnabled: false,
        adminReply: '',
      },
    };
  }

  // Status 'proses': toggle & teks balasan boleh disimpan sebagai draft, tidak pernah tampil di tenant sebelum 'selesai'
  return {
    valid: true,
    data: {
      status: 'proses',
      replyEnabled,
      adminReply: trimmedReply,
    },
  };
}
