import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getMasterDb, initMasterDatabase } from '../../admin-backend/database/masterSqlite.ts';
import { runWithTenant } from '../database/tenantContext.ts';
import { loadStoreInfo } from '../config/configManager.ts';
import {
  REPORT_IMAGE_MAX_BYTES,
  REPORT_VIDEO_MAX_BYTES,
  ReportMediaType,
  ReportStatus,
  SerializedReportMedia,
  StoredReportRow,
  TenantReportDTO,
  AdminReportDTO,
  resolveAdminReportUpdate,
  serializeReportForAdmin,
  serializeReportForTenant,
  validateReportSubmission,
  validateSingleReportMedia,
} from '../utils/reportValidation.ts';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

interface StoredMediaRow {
  id: number;
  report_id: number;
  tenant_id: string;
  media_type: ReportMediaType;
  original_name: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface StagingMediaMetadata {
  stagingToken: string;
  tenantId: string;
  mediaType: ReportMediaType;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  storedFilename: string;
  createdAt: string;
}

function sanitizeIdSegment(raw: string): string {
  const clean = String(raw || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!clean) {
    throw new Error('Tenant ID tidak valid.');
  }
  return clean;
}

function getTenantReportsBaseDir(tenantId: string): string {
  const safeTenantId = sanitizeIdSegment(tenantId);
  return path.resolve(process.cwd(), 'storage', 'tenants', safeTenantId, 'reports');
}

function getStagingDir(tenantId: string): string {
  const dir = path.join(getTenantReportsBaseDir(tenantId), 'staging');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getCommittedDir(tenantId: string): string {
  const dir = path.join(getTenantReportsBaseDir(tenantId), 'committed');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function resolveSafeChildPath(baseDir: string, filename: string): string {
  const baseName = path.basename(String(filename || ''));
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, baseName);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Path media tidak valid.');
  }
  return resolvedTarget;
}

function hasValidMediaSignature(buf: Buffer, mimeType: string): boolean {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  switch (mimeType) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return (
        buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      );
    case 'image/gif':
      return buf.subarray(0, 3).toString('ascii') === 'GIF';
    case 'image/webp':
      return (
        buf.length >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'video/webm':
      return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    case 'video/mp4':
    case 'video/quicktime':
      return buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
    default:
      return false;
  }
}

function sanitizeOriginalFilename(rawName: string): string {
  const base = path.basename(String(rawName || 'lampiran')).replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').trim();
  return base ? base.slice(0, 120) : 'lampiran';
}

function cleanupExpiredStagingFiles(tenantId: string): void {
  try {
    const dir = getStagingDir(tenantId);
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.json')) continue;
      const metaPath = resolveSafeChildPath(dir, entry);
      const stat = fs.statSync(metaPath);
      if (stat.mtimeMs < cutoff) {
        try {
          const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as StagingMediaMetadata;
          if (parsed?.storedFilename) {
            const binPath = resolveSafeChildPath(dir, parsed.storedFilename);
            if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
          }
        } catch {}
        fs.unlinkSync(metaPath);
      }
    }
  } catch {}
}

export function saveStagingReportMedia(
  tenantId: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string
): {
  success: boolean;
  error?: string;
  media?: {
    stagingToken: string;
    mediaType: ReportMediaType;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
  };
} {
  const safeTenantId = sanitizeIdSegment(tenantId);
  cleanupExpiredStagingFiles(safeTenantId);

  const check = validateSingleReportMedia({
    mimeType,
    sizeBytes: buffer.length,
    originalName: sanitizeOriginalFilename(originalName),
  });
  if (!check.valid || !check.data) {
    return { success: false, error: check.error };
  }

  if (!hasValidMediaSignature(buffer, check.data.mimeType)) {
    return {
      success: false,
      error: 'Isi file tidak cocok dengan format foto/video yang diizinkan.',
    };
  }

  const ext = MIME_EXTENSION_MAP[check.data.mimeType];
  if (!ext) {
    return { success: false, error: 'Ekstensi media tidak didukung.' };
  }

  const stagingToken = crypto.randomBytes(16).toString('hex');
  const storedFilename = `${stagingToken}${ext}`;
  const stagingDir = getStagingDir(safeTenantId);
  const targetBinPath = resolveSafeChildPath(stagingDir, storedFilename);
  const targetMetaPath = resolveSafeChildPath(stagingDir, `${stagingToken}.json`);

  const metadata: StagingMediaMetadata = {
    stagingToken,
    tenantId: safeTenantId,
    mediaType: check.data.mediaType,
    mimeType: check.data.mimeType,
    sizeBytes: buffer.length,
    originalName: check.data.originalName,
    storedFilename,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(targetBinPath, buffer);
  fs.writeFileSync(targetMetaPath, JSON.stringify(metadata));

  return {
    success: true,
    media: {
      stagingToken,
      mediaType: metadata.mediaType,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      originalName: metadata.originalName,
    },
  };
}

export function deleteStagingReportMedia(tenantId: string, stagingToken: string): boolean {
  const cleanToken = String(stagingToken || '').trim();
  if (!/^[a-f0-9]{32}$/.test(cleanToken)) return false;

  const stagingDir = getStagingDir(tenantId);
  const metaPath = resolveSafeChildPath(stagingDir, `${cleanToken}.json`);
  if (!fs.existsSync(metaPath)) return false;

  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as StagingMediaMetadata;
    if (parsed?.storedFilename) {
      const binPath = resolveSafeChildPath(stagingDir, parsed.storedFilename);
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    }
  } catch {}
  try {
    fs.unlinkSync(metaPath);
  } catch {}
  return true;
}

function readStagingMetadata(tenantId: string, stagingToken: string): StagingMediaMetadata | null {
  const cleanToken = String(stagingToken || '').trim();
  if (!/^[a-f0-9]{32}$/.test(cleanToken)) return null;

  const stagingDir = getStagingDir(tenantId);
  const metaPath = resolveSafeChildPath(stagingDir, `${cleanToken}.json`);
  if (!fs.existsSync(metaPath)) return null;

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as StagingMediaMetadata;
    if (!meta || meta.tenantId !== sanitizeIdSegment(tenantId)) return null;
    const binPath = resolveSafeChildPath(stagingDir, meta.storedFilename);
    if (!fs.existsSync(binPath)) return null;
    const stat = fs.statSync(binPath);
    return { ...meta, sizeBytes: stat.size };
  } catch {
    return null;
  }
}

function mapMediaRows(rows: StoredMediaRow[], scope: 'tenant' | 'admin'): SerializedReportMedia[] {
  const prefix = scope === 'admin' ? '/api/admin/reports/media' : '/api/reports/media';
  return rows.map((m) => ({
    id: m.id,
    mediaType: m.media_type,
    originalName: m.original_name,
    mimeType: m.mime_type,
    sizeBytes: m.size_bytes,
    url: `${prefix}/${m.id}`,
  }));
}

function getTenantIdentitySnapshot(tenantId: string): {
  storeName: string;
  ownerName: string;
  ownerPhone: string;
} {
  initMasterDatabase();
  const masterDb = getMasterDb();
  const tenantRow = masterDb
    .prepare('SELECT store_name, owner_name, owner_phone FROM tenants WHERE tenant_id = ?')
    .get(tenantId) as { store_name?: string; owner_name?: string; owner_phone?: string } | undefined;

  let storeInfoData: { storeName?: string; ownerName?: string; ownerNumber?: string } = {};
  try {
    storeInfoData = runWithTenant(tenantId, () => loadStoreInfo());
  } catch {}

  const storeName = String(storeInfoData.storeName || tenantRow?.store_name || tenantId).trim();
  const ownerName = String(storeInfoData.ownerName || tenantRow?.owner_name || '-').trim();
  const ownerPhone = String(storeInfoData.ownerNumber || tenantRow?.owner_phone || '-').trim();

  return { storeName, ownerName, ownerPhone };
}

export function createTenantReport(
  tenantId: string,
  input: {
    title: string;
    message: string;
    stagingTokens?: string[];
  }
): { success: boolean; error?: string; report?: TenantReportDTO } {
  const safeTenantId = sanitizeIdSegment(tenantId);
  initMasterDatabase();
  const masterDb = getMasterDb();

  const uniqueTokens = Array.from(
    new Set((Array.isArray(input.stagingTokens) ? input.stagingTokens : []).map((t) => String(t || '').trim()).filter(Boolean))
  );

  const stagingItems: StagingMediaMetadata[] = [];
  for (const token of uniqueTokens) {
    const meta = readStagingMetadata(safeTenantId, token);
    if (!meta) {
      return {
        success: false,
        error: 'Salah satu lampiran media tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang.',
      };
    }
    stagingItems.push(meta);
  }

  const validation = validateReportSubmission({
    title: input.title,
    message: input.message,
    mediaItems: stagingItems.map((item) => ({
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      originalName: item.originalName,
    })),
  });

  if (!validation.valid || !validation.data) {
    return { success: false, error: validation.error };
  }

  const identity = getTenantIdentitySnapshot(safeTenantId);
  const nowIso = new Date().toISOString();
  const stagingDir = getStagingDir(safeTenantId);
  const committedDir = getCommittedDir(safeTenantId);

  const movedFiles: { meta: StagingMediaMetadata; finalFilename: string; targetPath: string }[] = [];
  try {
    for (const meta of stagingItems) {
      const ext = MIME_EXTENSION_MAP[meta.mimeType] || path.extname(meta.storedFilename) || '';
      const finalFilename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const srcPath = resolveSafeChildPath(stagingDir, meta.storedFilename);
      const destPath = resolveSafeChildPath(committedDir, finalFilename);
      fs.renameSync(srcPath, destPath);
      const metaJsonPath = resolveSafeChildPath(stagingDir, `${meta.stagingToken}.json`);
      if (fs.existsSync(metaJsonPath)) {
        fs.unlinkSync(metaJsonPath);
      }
      movedFiles.push({ meta, finalFilename, targetPath: destPath });
    }
  } catch (fsErr: any) {
    for (const moved of movedFiles) {
      try {
        if (fs.existsSync(moved.targetPath)) fs.unlinkSync(moved.targetPath);
      } catch {}
    }
    return { success: false, error: fsErr?.message || 'Gagal memproses lampiran laporan.' };
  }

  const tx = masterDb.transaction(() => {
    const insertReport = masterDb
      .prepare(
        `
        INSERT INTO tenant_reports (
          tenant_id, owner_name, owner_phone, store_name, title, message,
          status, reply_enabled, admin_reply, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'terkirim', 0, '', ?, ?)
      `
      )
      .run(
        safeTenantId,
        identity.ownerName,
        identity.ownerPhone,
        identity.storeName,
        validation.data!.title,
        validation.data!.message,
        nowIso,
        nowIso
      );

    const reportId = Number(insertReport.lastInsertRowid);
    const insertMediaStmt = masterDb.prepare(
      `
      INSERT INTO tenant_report_media (
        report_id, tenant_id, media_type, original_name, stored_filename, mime_type, size_bytes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    );

    for (const item of movedFiles) {
      insertMediaStmt.run(
        reportId,
        safeTenantId,
        item.meta.mediaType,
        item.meta.originalName,
        item.finalFilename,
        item.meta.mimeType,
        item.meta.sizeBytes,
        nowIso
      );
    }

    return reportId;
  });

  const reportId = tx();
  const reportRow = masterDb.prepare('SELECT * FROM tenant_reports WHERE id = ?').get(reportId) as StoredReportRow;
  const mediaRows = masterDb
    .prepare('SELECT * FROM tenant_report_media WHERE report_id = ? ORDER BY id ASC')
    .all(reportId) as StoredMediaRow[];

  return {
    success: true,
    report: serializeReportForTenant(reportRow, mapMediaRows(mediaRows, 'tenant')),
  };
}

export function listTenantReports(tenantId: string): TenantReportDTO[] {
  const safeTenantId = sanitizeIdSegment(tenantId);
  initMasterDatabase();
  const masterDb = getMasterDb();

  const rows = masterDb
    .prepare('SELECT * FROM tenant_reports WHERE tenant_id = ? ORDER BY created_at DESC, id DESC')
    .all(safeTenantId) as StoredReportRow[];

  if (rows.length === 0) return [];

  const reportIds = rows.map((r) => r.id);
  const placeholders = reportIds.map(() => '?').join(',');
  const mediaRows = masterDb
    .prepare(`SELECT * FROM tenant_report_media WHERE report_id IN (${placeholders}) ORDER BY id ASC`)
    .all(...reportIds) as StoredMediaRow[];

  const mediaByReport = new Map<number, StoredMediaRow[]>();
  for (const m of mediaRows) {
    const arr = mediaByReport.get(m.report_id) || [];
    arr.push(m);
    mediaByReport.set(m.report_id, arr);
  }

  return rows.map((row) =>
    serializeReportForTenant(row, mapMediaRows(mediaByReport.get(row.id) || [], 'tenant'))
  );
}

export function listAdminReports(statusFilter?: string): {
  reports: AdminReportDTO[];
  counts: {
    all: number;
    terkirim: number;
    proses: number;
    selesai: number;
  };
} {
  initMasterDatabase();
  const masterDb = getMasterDb();

  const countRows = masterDb
    .prepare('SELECT status, COUNT(*) as total FROM tenant_reports GROUP BY status')
    .all() as { status: ReportStatus; total: number }[];

  const counts = {
    all: 0,
    terkirim: 0,
    proses: 0,
    selesai: 0,
  };
  for (const row of countRows) {
    const qty = Number(row.total) || 0;
    counts.all += qty;
    if (row.status === 'terkirim') counts.terkirim = qty;
    else if (row.status === 'proses') counts.proses = qty;
    else if (row.status === 'selesai') counts.selesai = qty;
  }

  const normalizedFilter = String(statusFilter || 'all').trim().toLowerCase();
  const hasSpecificStatus =
    normalizedFilter === 'terkirim' ||
    normalizedFilter === 'proses' ||
    normalizedFilter === 'selesai';

  const rows = (hasSpecificStatus
    ? masterDb
        .prepare('SELECT * FROM tenant_reports WHERE status = ? ORDER BY created_at DESC, id DESC')
        .all(normalizedFilter)
    : masterDb
        .prepare('SELECT * FROM tenant_reports ORDER BY created_at DESC, id DESC')
        .all()) as StoredReportRow[];

  if (rows.length === 0) {
    return { reports: [], counts };
  }

  const reportIds = rows.map((r) => r.id);
  const placeholders = reportIds.map(() => '?').join(',');
  const mediaRows = masterDb
    .prepare(`SELECT * FROM tenant_report_media WHERE report_id IN (${placeholders}) ORDER BY id ASC`)
    .all(...reportIds) as StoredMediaRow[];

  const mediaByReport = new Map<number, StoredMediaRow[]>();
  for (const m of mediaRows) {
    const arr = mediaByReport.get(m.report_id) || [];
    arr.push(m);
    mediaByReport.set(m.report_id, arr);
  }

  return {
    reports: rows.map((row) =>
      serializeReportForAdmin(row, mapMediaRows(mediaByReport.get(row.id) || [], 'admin'))
    ),
    counts,
  };
}

export function updateAdminReportStatus(
  reportId: number,
  input: {
    status: 'proses' | 'selesai';
    replyEnabled?: boolean;
    adminReply?: string;
  }
): { success: boolean; statusCode?: number; error?: string; report?: AdminReportDTO } {
  initMasterDatabase();
  const masterDb = getMasterDb();

  const existing = masterDb
    .prepare('SELECT * FROM tenant_reports WHERE id = ?')
    .get(reportId) as StoredReportRow | undefined;

  if (!existing) {
    return { success: false, statusCode: 404, error: 'Laporan tidak ditemukan.' };
  }

  const resolved = resolveAdminReportUpdate({
    nextStatus: input.status,
    replyEnabled: input.replyEnabled,
    adminReply: input.adminReply,
    existingReplyEnabled: Boolean(existing.reply_enabled),
    existingAdminReply: existing.admin_reply,
  });

  if (!resolved.valid || !resolved.data) {
    return { success: false, statusCode: 400, error: resolved.error };
  }

  const nowIso = new Date().toISOString();
  masterDb
    .prepare(
      `
      UPDATE tenant_reports
      SET status = ?, reply_enabled = ?, admin_reply = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .run(
      resolved.data.status,
      resolved.data.replyEnabled ? 1 : 0,
      resolved.data.adminReply,
      nowIso,
      reportId
    );

  const updatedRow = masterDb
    .prepare('SELECT * FROM tenant_reports WHERE id = ?')
    .get(reportId) as StoredReportRow;
  const mediaRows = masterDb
    .prepare('SELECT * FROM tenant_report_media WHERE report_id = ? ORDER BY id ASC')
    .all(reportId) as StoredMediaRow[];

  return {
    success: true,
    report: serializeReportForAdmin(updatedRow, mapMediaRows(mediaRows, 'admin')),
  };
}

export function getTenantReportMediaFile(
  tenantId: string,
  mediaId: number
): { filePath: string; mimeType: string; originalName: string } | null {
  const safeTenantId = sanitizeIdSegment(tenantId);
  initMasterDatabase();
  const masterDb = getMasterDb();

  const mediaRow = masterDb
    .prepare('SELECT * FROM tenant_report_media WHERE id = ? AND tenant_id = ?')
    .get(mediaId, safeTenantId) as StoredMediaRow | undefined;

  if (!mediaRow) return null;

  const filePath = resolveSafeChildPath(getCommittedDir(safeTenantId), mediaRow.stored_filename);
  if (!fs.existsSync(filePath)) return null;

  return {
    filePath,
    mimeType: mediaRow.mime_type,
    originalName: mediaRow.original_name,
  };
}

export function getAdminReportMediaFile(
  mediaId: number
): { filePath: string; mimeType: string; originalName: string } | null {
  initMasterDatabase();
  const masterDb = getMasterDb();

  const mediaRow = masterDb
    .prepare('SELECT * FROM tenant_report_media WHERE id = ?')
    .get(mediaId) as StoredMediaRow | undefined;

  if (!mediaRow) return null;

  const filePath = resolveSafeChildPath(getCommittedDir(mediaRow.tenant_id), mediaRow.stored_filename);
  if (!fs.existsSync(filePath)) return null;

  return {
    filePath,
    mimeType: mediaRow.mime_type,
    originalName: mediaRow.original_name,
  };
}

export { REPORT_IMAGE_MAX_BYTES, REPORT_VIDEO_MAX_BYTES };
