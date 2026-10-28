import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';
import { loadStoreInfo } from '../config/configManager.ts';

export const botRouter = Router();

// Status bot saat ini
botRouter.get('/status', (_req: Request, res: Response) => {
  return res.json(botManager.getStatus());
});

// Daftar grup WhatsApp tempat bot bergabung
botRouter.get('/groups', async (_req: Request, res: Response) => {
  try {
    const result = await botManager.getParticipatingGroups();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mengambil grup' });
  }
});

// Start bot (dengan Server-Side Enforcement Store Info)
botRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const currentStore = botManager.config?.storeInfo || loadStoreInfo();
    const hasStoreName = Boolean(currentStore?.storeName && currentStore.storeName.trim());
    const hasOwnerName = Boolean(currentStore?.ownerName && currentStore.ownerName.trim());
    const hasOwnerNumber = Boolean(currentStore?.ownerNumber && currentStore.ownerNumber.trim());

    if (!hasStoreName || !hasOwnerName || !hasOwnerNumber) {
      return res.status(400).json({
        success: false,
        error:
          'Akses Dikunci: Anda wajib melengkapi Nama Toko, Nama Owner, dan Nomer Owner di Store Info sebelum menjalankan bot WhatsApp!',
        locked: true,
      });
    }

    const { phoneNumber, customCode } = req.body || {};
    const result = await botManager.start(phoneNumber, customCode);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal menyalakan bot' });
  }
});

// Stop bot
botRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    await botManager.stop();
    return res.json({ success: true, status: botManager.getStatus() });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal menghentikan bot' });
  }
});

// Reset koneksi bot
botRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    await botManager.reset();
    return res.json({ success: true, status: botManager.getStatus() });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mereset bot' });
  }
});

// Simpan konfigurasi bot
botRouter.post('/save-config', (req: Request, res: Response) => {
  try {
    botManager.saveConfig(req.body);
    return res.json({ success: true, config: botManager.config });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal menyimpan konfigurasi' });
  }
});

// Toggle whitelist respon bot per grup
botRouter.post('/groups/toggle', (req: Request, res: Response) => {
  try {
    const { groupId, enabled } = req.body || {};
    if (!groupId) {
      return res.status(400).json({ error: 'groupId diperlukan' });
    }
    const updatedToggles = botManager.setGroupToggle(groupId, Boolean(enabled));
    return res.json({
      success: true,
      groupId,
      enabled: Boolean(enabled),
      toggles: updatedToggles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Gagal mengubah status grup' });
  }
});
