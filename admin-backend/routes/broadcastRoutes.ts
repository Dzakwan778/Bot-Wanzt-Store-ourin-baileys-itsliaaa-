import { Router, Request, Response } from 'express';
import { BroadcastService } from '../services/broadcastService.ts';

export const broadcastRouter = Router();

// GET /api/admin/broadcasts - Ambil daftar kampanye & ringkasan kesiapan tenant aktif
broadcastRouter.get('/broadcasts', (_req: Request, res: Response) => {
  try {
    const campaigns = BroadcastService.getAllCampaigns();
    const readiness = BroadcastService.getReadinessSummary();
    res.json({
      success: true,
      data: campaigns,
      readiness,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/broadcasts - Buat broadcast langsung atau terjadwal/berulang
broadcastRouter.post('/broadcasts', async (req: Request, res: Response) => {
  try {
    const result = await BroadcastService.createBroadcast(req.body || {});
    res.json({
      success: true,
      message: result.executedImmediately
        ? 'Broadcast berhasil dikirim ke seluruh tenant aktif.'
        : 'Jadwal broadcast berhasil disimpan.',
      data: result.campaign,
      executedImmediately: result.executedImmediately,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/broadcasts/:id - Edit pesan & jadwal kampanye
broadcastRouter.put('/broadcasts/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    const updated = BroadcastService.updateBroadcast(id, req.body || {});
    res.json({
      success: true,
      message: 'Jadwal dan pesan broadcast berhasil diperbarui.',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/admin/broadcasts/:id/send-now - Jalankan jadwal broadcast sekarang juga
broadcastRouter.post('/broadcasts/:id/send-now', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    const updated = await BroadcastService.executeCampaign(id, { triggeredManually: true });
    res.json({
      success: true,
      message: 'Broadcast berhasil dikirim sekarang ke seluruh tenant aktif.',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/admin/broadcasts/:id/cancel - Batalkan jadwal broadcast
broadcastRouter.post('/broadcasts/:id/cancel', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    const updated = BroadcastService.cancelCampaign(id);
    res.json({
      success: true,
      message: 'Jadwal broadcast berhasil dibatalkan.',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/broadcasts/:id - Hapus riwayat / kampanye beserta lognya
broadcastRouter.delete('/broadcasts/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    BroadcastService.deleteCampaign(id);
    res.json({
      success: true,
      message: 'Riwayat broadcast dan log berhasil dihapus.',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/broadcasts/:id/logs - Ambil rincian log per-tenant & per-kanal
broadcastRouter.get('/broadcasts/:id/logs', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    const runParam = req.query.run ? Number(req.query.run) : undefined;
    const result = BroadcastService.getCampaignLogs(id, runParam);
    res.json({
      success: true,
      campaign: result.campaign,
      data: result.logs,
      availableRuns: result.availableRuns,
    });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

// POST /api/admin/broadcasts/:id/retry-failed - Kirim ulang log pengiriman yang gagal
broadcastRouter.post('/broadcasts/:id/retry-failed', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kampanye tidak valid.' });
    }
    const runNumber = req.body?.runNumber ? Number(req.body.runNumber) : undefined;
    const result = await BroadcastService.retryFailedLogs(id, runNumber);
    res.json({
      success: true,
      message:
        result.retriedCount === 0
          ? 'Tidak ada log gagal yang perlu dikirim ulang.'
          : `Pengiriman ulang selesai: ${result.newlySucceeded} dari ${result.retriedCount} pengiriman gagal kini berhasil terkirim.`,
      data: result.campaign,
      retriedCount: result.retriedCount,
      newlySucceeded: result.newlySucceeded,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
