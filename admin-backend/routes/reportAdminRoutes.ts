import { Router, Request, Response } from 'express';
import {
  getAdminReportMediaFile,
  listAdminReports,
  updateAdminReportStatus,
} from '../../backend/services/reportService.ts';

export const reportAdminRouter = Router();

// 1. Ambil seluruh laporan tenant + ringkasan hitung status (terkirim, proses, selesai)
reportAdminRouter.get('/reports', (req: Request, res: Response) => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'all';
    const data = listAdminReports(statusFilter);
    return res.json({
      success: true,
      reports: data.reports,
      counts: data.counts,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal memuat daftar laporan tenant.',
    });
  }
});

// 2. Perbarui status laporan (Proses Laporan / Laporan Selesai) serta toggle & pesan balasan admin
reportAdminRouter.patch('/reports/:id/status', (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const reportId = Number(Array.isArray(idParam) ? idParam[0] : idParam);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid.',
      });
    }

    const { status, replyEnabled, adminReply } = req.body || {};
    const result = updateAdminReportStatus(reportId, {
      status,
      replyEnabled: typeof replyEnabled === 'boolean' ? replyEnabled : undefined,
      adminReply: adminReply !== undefined ? String(adminReply) : undefined,
    });

    if (!result.success || !result.report) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error || 'Gagal memperbarui status laporan.',
      });
    }

    return res.json({
      success: true,
      report: result.report,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Gagal memproses pembaruan laporan.',
    });
  }
});

// 3. Sajikan file media lampiran laporan untuk preview di dashboard Master Admin
reportAdminRouter.get('/reports/media/:mediaId', (req: Request, res: Response) => {
  try {
    const idParam = req.params.mediaId;
    const mediaId = Number(Array.isArray(idParam) ? idParam[0] : idParam);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).send('ID media tidak valid.');
    }

    const mediaFile = getAdminReportMediaFile(mediaId);
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
    return res.status(500).send('Gagal memuat media laporan.');
  }
});
