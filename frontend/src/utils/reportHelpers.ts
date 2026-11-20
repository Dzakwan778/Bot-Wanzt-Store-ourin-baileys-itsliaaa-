export const REPORT_TITLE_MAX_LENGTH = 30;
export const REPORT_MAX_MEDIA = 3;
export const REPORT_MAX_VIDEO_COUNT = 1;
export const REPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REPORT_VIDEO_MAX_BYTES = 25 * 1024 * 1024;

export type ReportStatus = 'terkirim' | 'proses' | 'selesai';
export type ReportMediaType = 'image' | 'video';

export interface ReportMediaItem {
  id: number;
  mediaType: ReportMediaType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface TenantReportItem {
  id: number;
  title: string;
  message: string;
  status: ReportStatus;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  media: ReportMediaItem[];
}

export function getReportStatusBadge(status: ReportStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'proses':
      return {
        label: 'Proses',
        className: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    case 'selesai':
      return {
        label: 'Selesai',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'terkirim':
    default:
      return {
        label: 'Terkirim',
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}

export function formatReportTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ClientFileCandidate {
  name: string;
  type: string;
  size: number;
}

export function classifyClientMediaType(mimeType: string): ReportMediaType | null {
  const clean = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (
    clean === 'image/jpeg' ||
    clean === 'image/jpg' ||
    clean === 'image/png' ||
    clean === 'image/webp' ||
    clean === 'image/gif'
  ) {
    return 'image';
  }
  if (clean === 'video/mp4' || clean === 'video/webm' || clean === 'video/quicktime') {
    return 'video';
  }
  return null;
}

export function validateClientReportFileSelection(
  existingItems: Array<{ mediaType: ReportMediaType }>,
  candidate: ClientFileCandidate
): { valid: boolean; mediaType?: ReportMediaType; error?: string } {
  if (existingItems.length >= REPORT_MAX_MEDIA) {
    return {
      valid: false,
      error: `Maksimal ${REPORT_MAX_MEDIA} media per laporan.`,
    };
  }

  const mediaType = classifyClientMediaType(candidate.type);
  if (!mediaType) {
    return {
      valid: false,
      error: `Format "${candidate.name}" tidak didukung. Gunakan foto (JPG/PNG/WEBP/GIF) atau video (MP4/WEBM/MOV).`,
    };
  }

  if (mediaType === 'video') {
    const existingVideoCount = existingItems.filter((item) => item.mediaType === 'video').length;
    if (existingVideoCount >= REPORT_MAX_VIDEO_COUNT) {
      return {
        valid: false,
        error: `Maksimal hanya ${REPORT_MAX_VIDEO_COUNT} video per laporan.`,
      };
    }
    if (candidate.size > REPORT_VIDEO_MAX_BYTES) {
      return {
        valid: false,
        error: `Ukuran video "${candidate.name}" melebihi batas maksimal 25 MB.`,
      };
    }
  } else {
    if (candidate.size > REPORT_IMAGE_MAX_BYTES) {
      return {
        valid: false,
        error: `Ukuran foto "${candidate.name}" melebihi batas maksimal 5 MB.`,
      };
    }
  }

  if (candidate.size <= 0) {
    return {
      valid: false,
      error: `File "${candidate.name}" kosong atau tidak dapat dibaca.`,
    };
  }

  return { valid: true, mediaType };
}

export function validateClientReportForm(input: {
  title: string;
  message: string;
}): { valid: boolean; error?: string } {
  const trimmedTitle = String(input.title || '').trim();
  const trimmedMessage = String(input.message || '').trim();

  if (!trimmedTitle) {
    return { valid: false, error: 'Nama laporan wajib diisi.' };
  }
  if ([...trimmedTitle].length > REPORT_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Nama laporan maksimal ${REPORT_TITLE_MAX_LENGTH} karakter.`,
    };
  }
  if (!trimmedMessage) {
    return { valid: false, error: 'Pesan laporan wajib diisi.' };
  }
  return { valid: true };
}
