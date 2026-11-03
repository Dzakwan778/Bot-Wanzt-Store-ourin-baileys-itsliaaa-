import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getActiveTenantId } from '../database/tenantContext.ts';
import {
  getTenantPictures,
  getPicturePath,
  saveTenantPicture,
  deleteTenantPicture,
  MIME_TYPES,
} from '../services/mediaManager.ts';

export const mediaRouter = Router();

// 1. Ambil daftar file gambar milik tenant yang sedang aktif
mediaRouter.get('/pictures', (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || getActiveTenantId();
  const pictures = getTenantPictures(tenantId);
  return res.json({ success: true, tenantId, pictures });
});

// 2. Unggah file gambar baru untuk tenant aktif (Base64)
mediaRouter.post('/upload', (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || getActiveTenantId();
  const { filename, data } = req.body;

  if (!filename || !data) {
    return res.status(400).json({ success: false, error: 'Nama file dan data gambar wajib disertakan.' });
  }

  const result = saveTenantPicture(tenantId, filename, data);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const updatedPictures = getTenantPictures(tenantId);
  return res.json({
    success: true,
    message: 'Gambar berhasil diunggah.',
    filename: result.filename,
    pictures: updatedPictures,
  });
});

// 3. Hapus file gambar milik tenant aktif
mediaRouter.delete('/:filename', (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || getActiveTenantId();
  const paramName = req.params.filename;
  const filename = Array.isArray(paramName) ? paramName[0] : (paramName || '');

  const result = deleteTenantPicture(tenantId, filename);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  const updatedPictures = getTenantPictures(tenantId);
  return res.json({
    success: true,
    message: 'Gambar berhasil dihapus.',
    pictures: updatedPictures,
  });
});

// 4. Tampilkan file gambar (Streaming preview)
mediaRouter.get('/view', (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || getActiveTenantId();
  const filename = req.query.name as string;

  if (!filename) {
    return res.status(400).send('Parameter name diperlukan.');
  }

  const filePath = getPicturePath(tenantId, filename);
  if (filePath && fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

  return res.status(404).send('Gambar tidak ditemukan.');
});
