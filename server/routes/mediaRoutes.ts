import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const mediaRouter = Router();

// 1. Ambil daftar file gambar
mediaRouter.get('/pictures', (_req: Request, res: Response) => {
  const dir = path.join(process.cwd(), 'src', 'media', 'picture');
  let pictures: string[] = [];
  try {
    if (fs.existsSync(dir)) {
      pictures = fs.readdirSync(dir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
      });
    }
  } catch {}
  return res.json({ pictures });
});

// 2. Tampilkan file gambar
mediaRouter.get('/view', (req: Request, res: Response) => {
  const filename = req.query.name as string;
  if (filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'src', 'media', 'picture', safeName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      return res.sendFile(filePath);
    }
  }
  return res.status(404).send('Not found');
});
