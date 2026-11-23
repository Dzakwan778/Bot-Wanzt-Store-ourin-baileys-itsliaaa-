import express, { Router, Request, Response, NextFunction } from 'express';
import { getActiveTenantId } from '../database/tenantContext.ts';
import {
  createTenantReport,
  deleteStagingReportMedia,
  getTenantReportMediaFile,
  listTenantReports,
  saveStagingReportMedia,
} from '../services/reportService.ts';

export const reportRouter = Router();

// 1. Ambil daftar laporan milik tenant yang sedang login
reportRouter.get('/', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || getActiveTenantId();
    const reports = listTenantReports(tenantId);
    return res.json({ success: true, reports });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memuat daftar laporan.',
    });
  }
});

// 2. Unggah satu file media (foto maks 5 MB atau video maks 25 MB) ke staging sementara
const rawMediaParser = express.raw({
  type: () => true,
  limit: '26mb',
});

reportRouter.post(
  '/media',
  (req: Request, res: Response, next: NextFunction) => {
    rawMediaParser(req, res, (err: any) => {
      if (err) {
        if (err.type === 'entity.too.large' || err.status === 413) {
          return res.status(413).json({
            success: false,
            error: 'Ukuran file melebihi batas maksimal (Foto maks 5 MB, Video maks 25 MB).',
          });
        }
        return res.status(400).json({
          success: false,
          error: err?.message || 'Gagal membaca file media yang diunggah.',
        });
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId || getActiveTenantId();
      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const mimeType = String(req.headers['content-type'] || '');
      const rawNameHeader = String(req.headers['x-file-name'] || 'lampiran');
      let originalName = 'lampiran';
      try {
        originalName = decodeURIComponent(rawNameHeader);
      } catch {
        originalName = rawNameHeader;
      }

      const result = saveStagingReportMedia(tenantId, buffer, mimeType, originalName);
      if (!result.success || !result.media) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Media tidak valid.',
        });
      }

      return res.json({
        success: true,
        media: result.media,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal mengunggah media laporan.',
      });
    }
  }
);

// 3. Hapus lampiran staging yang dibatalkan sebelum submit
reportRouter.delete('/media/staging/:token', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || getActiveTenantId();
    const tokenParam = req.params.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    const deleted = deleteStagingReportMedia(tenantId, token || '');
    return res.json({ success: true, deleted });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Gagal menghapus lampiran.',
    });
  }
});

// 4. Kirim laporan masalah baru
reportRouter.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || getActiveTenantId();
    const { title, message, stagingTokens } = req.body || {};

    const result = createTenantReport(tenantId, {
      title: String(title || ''),
      message: String(message || ''),
      stagingTokens: Array.isArray(stagingTokens) ? stagingTokens : [],
    });

    if (!result.success || !result.report) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Gagal mengirim laporan.',
      });
    }

    return res.status(201).json({
      success: true,
      report: result.report,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal menyimpan laporan ke server.',
    });
  }
});

// 5. Sajikan media milik laporan tenant yang sedang login (terisolasi per tenant)
reportRouter.get('/media/:mediaId', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || getActiveTenantId();
    const idParam = req.params.mediaId;
    const mediaId = Number(Array.isArray(idParam) ? idParam[0] : idParam);

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).send('ID media tidak valid.');
    }

    const mediaFile = getTenantReportMediaFile(tenantId, mediaId);
    if (!mediaFile) {
      return res.status(404).send('Media laporan tidak ditemukan.');
    }

    return res.sendFile(mediaFile.filePath, {
      headers: {
        'Content-Type': mediaFile.mimeType,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return res.status(500).send('Gagal memuat media.');
  }
});
