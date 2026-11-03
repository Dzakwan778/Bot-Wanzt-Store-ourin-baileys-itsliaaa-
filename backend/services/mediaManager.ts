import fs from 'fs';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Mendapatkan direktori media terisolasi milik tenant tertentu.
 * Otomatis membuat folder jika belum ada.
 */
export function getTenantMediaDir(tenantId: string): string {
  const safeTenantId = (tenantId || 't_wanzt').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(process.cwd(), 'storage', 'tenants', safeTenantId, 'media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Mendapatkan direktori media default bersama (shared).
 */
export function getSharedDefaultMediaDir(): string {
  const dir = path.join(process.cwd(), 'storage', 'shared', 'default_media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Inisialisasi awal aset bawaan (seed) dari folder statis frontend ke storage.
 */
export function seedDefaultMedia(): void {
  const sharedDir = getSharedDefaultMediaDir();
  const legacyDirs = [
    path.join(process.cwd(), 'frontend', 'src', 'media', 'picture'),
    path.join(process.cwd(), 'src', 'media', 'picture'),
  ];

  for (const legacyDir of legacyDirs) {
    if (fs.existsSync(legacyDir)) {
      try {
        const files = fs.readdirSync(legacyDir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (ALLOWED_EXTENSIONS.includes(ext)) {
            const srcPath = path.join(legacyDir, file);
            const destPath = path.join(sharedDir, file);
            if (!fs.existsSync(destPath)) {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        }
      } catch (err) {
        console.error('[MediaManager] Gagal menyalin default media:', err);
      }
    }
  }

  // Khusus t_wanzt (tenant utama), jika folder medianya masih kosong, salin aset awal
  const wanztDir = getTenantMediaDir('t_wanzt');
  try {
    const existing = fs.readdirSync(wanztDir);
    if (existing.length === 0 && fs.existsSync(sharedDir)) {
      const sharedFiles = fs.readdirSync(sharedDir);
      for (const file of sharedFiles) {
        fs.copyFileSync(path.join(sharedDir, file), path.join(wanztDir, file));
      }
    }
  } catch {}
}

/**
 * Mengambil daftar nama file gambar milik tenant aktif.
 * Jika tenant belum mengunggah gambar kustom, kembalikan gambar dari shared default.
 */
export function getTenantPictures(tenantId: string): string[] {
  const dir = getTenantMediaDir(tenantId);
  let tenantPictures: string[] = [];

  try {
    if (fs.existsSync(dir)) {
      tenantPictures = fs.readdirSync(dir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      });
    }
  } catch {}

  if (tenantPictures.length > 0) {
    return tenantPictures;
  }

  // Fallback: baca dari shared default
  const sharedDir = getSharedDefaultMediaDir();
  try {
    if (fs.existsSync(sharedDir)) {
      const defaultPics = fs.readdirSync(sharedDir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      });
      return defaultPics;
    }
  } catch {}

  return [];
}

/**
 * Mencari path file gambar secara hierarkis:
 * 1. Folder media tenant aktif
 * 2. Folder shared default media
 * 3. Folder legacy frontend/src/media/picture
 */
export function getPicturePath(tenantId: string, filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null;
  const safeName = path.basename(filename.trim());
  if (!safeName) return null;

  // 1. Cek folder tenant aktif
  const tenantPath = path.join(getTenantMediaDir(tenantId), safeName);
  if (fs.existsSync(tenantPath)) {
    return tenantPath;
  }

  // 2. Cek shared default
  const sharedPath = path.join(getSharedDefaultMediaDir(), safeName);
  if (fs.existsSync(sharedPath)) {
    return sharedPath;
  }

  // 3. Cek folder legacy
  const legacyDirs = [
    path.join(process.cwd(), 'frontend', 'src', 'media', 'picture', safeName),
    path.join(process.cwd(), 'src', 'media', 'picture', safeName),
  ];
  for (const leg of legacyDirs) {
    if (fs.existsSync(leg)) {
      return leg;
    }
  }

  return null;
}

/**
 * Menyimpan gambar baru ke folder tenant dari data Base64.
 */
export function saveTenantPicture(
  tenantId: string,
  originalFilename: string,
  base64Data: string
): { success: boolean; filename?: string; error?: string } {
  try {
    if (!originalFilename || !base64Data) {
      return { success: false, error: 'Data gambar atau nama file tidak valid.' };
    }

    const ext = path.extname(originalFilename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: `Format file ${ext} tidak didukung. Gunakan format JPG, PNG, atau WEBP.`,
      };
    }

    // Bersihkan prefix data URL (misal: "data:image/png;base64,...")
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Batasi ukuran maksimal 10 MB
    if (buffer.length > 10 * 1024 * 1024) {
      return { success: false, error: 'Ukuran gambar melebihi batas maksimal 10 MB.' };
    }

    // Buat nama file unik yang bersih dan aman
    const rawClean = path
      .basename(originalFilename, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .substring(0, 20);
    const newFilename = `${rawClean || 'img'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;

    const tenantDir = getTenantMediaDir(tenantId);
    const targetPath = path.join(tenantDir, newFilename);

    fs.writeFileSync(targetPath, buffer);
    return { success: true, filename: newFilename };
  } catch (err: any) {
    console.error('[MediaManager] Gagal menyimpan gambar:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan gambar di server.' };
  }
}

/**
 * Menghapus gambar dari folder tenant.
 */
export function deleteTenantPicture(
  tenantId: string,
  filename: string
): { success: boolean; error?: string } {
  try {
    if (!filename) return { success: false, error: 'Nama file tidak boleh kosong.' };
    const safeName = path.basename(filename.trim());
    const tenantDir = getTenantMediaDir(tenantId);
    const targetPath = path.join(tenantDir, safeName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return { success: true };
    }
    return { success: false, error: 'File tidak ditemukan di direktori toko Anda.' };
  } catch (err: any) {
    console.error('[MediaManager] Gagal menghapus gambar:', err);
    return { success: false, error: err?.message || 'Gagal menghapus file.' };
  }
}
