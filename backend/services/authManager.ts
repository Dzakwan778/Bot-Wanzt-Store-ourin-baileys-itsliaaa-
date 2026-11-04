import crypto from 'crypto';
import { db } from '../database/sqlite.ts';

export interface AuthConfig {
  username: string;
  salt: string;
  hash: string;
  updatedAt: string;
}

export interface SessionData {
  token: string;
  username: string;
  tenantId: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionData>();

// Durasi sesi login: 7 Hari
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hash password menggunakan PBKDF2 (SHA-512 dengan 100.000 iterasi)
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Inisialisasi kredensial awal di SQLite jika belum ada
 * Akun default awal: username: "admin", password: "admin123"
 */
export function initAuth(): AuthConfig {
  try {
    const row = db.prepare(`
      SELECT username, password_hash as hash, salt, updated_at as updatedAt
      FROM auth
      WHERE id = 1
    `).get() as AuthConfig | undefined;

    if (row && row.username && row.hash && row.salt) {
      return row;
    }

    const defaultSalt = crypto.randomBytes(16).toString('hex');
    const defaultHash = hashPassword('admin123', defaultSalt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO auth (id, username, password_hash, salt, iterations, updated_at)
      VALUES (1, ?, ?, ?, 100000, ?)
    `).run('admin', defaultHash, defaultSalt, now);

    return {
      username: 'admin',
      salt: defaultSalt,
      hash: defaultHash,
      updatedAt: now,
    };
  } catch (err) {
    console.error('Gagal membaca kredensial auth dari SQLite:', err);
    const fallbackSalt = crypto.randomBytes(16).toString('hex');
    return {
      username: 'admin',
      salt: fallbackSalt,
      hash: hashPassword('admin123', fallbackSalt),
      updatedAt: new Date().toISOString(),
    };
  }
}

import { getMasterDb, hashPassword as hashMasterPassword } from '../../admin-backend/database/masterSqlite.ts';

export interface AuthVerificationResult {
  success: boolean;
  username: string;
  tenantId?: string;
  accountStatus?: 'active' | 'suspended' | 'expired';
}


/**
 * Verifikasi login dengan perbandingan waktu konstan (constant-time comparison)
 * Mencegah timing attacks.
 * Mendukung kredensial Admin Utama dan Akun Tenant Apartemen.
 */
export function verifyLogin(usernameInput: string, passwordInput: string): AuthVerificationResult | false {
  try {
    if (!usernameInput || !passwordInput) return false;
    const trimmedInputUser = usernameInput.trim();

    // 1. Verifikasi Admin Utama (Tabel auth di SQLite)
    const auth = initAuth();
    if (trimmedInputUser.toLowerCase() === auth.username.toLowerCase()) {
      const inputHash = hashPassword(passwordInput, auth.salt);
      const hashBuffer = Buffer.from(auth.hash, 'hex');
      const inputBuffer = Buffer.from(inputHash, 'hex');

      if (hashBuffer.length === inputBuffer.length && crypto.timingSafeEqual(hashBuffer, inputBuffer)) {
        return { success: true, username: auth.username, tenantId: 't_wanzt' };
      }
    }

    // 2. Verifikasi Tenant Apartemen (Tabel tenants di master.db)
    try {
      const masterDb = getMasterDb();
      const masterTenant = masterDb.prepare(`
        SELECT tenant_id, username, password_hash, status
        FROM tenants
        WHERE LOWER(username) = LOWER(?)
      `).get(trimmedInputUser) as any;

      if (masterTenant && masterTenant.password_hash) {
        const masterHash = hashMasterPassword(passwordInput);
        if (masterHash === masterTenant.password_hash) {
          return {
            success: true,
            username: masterTenant.username,
            tenantId: masterTenant.tenant_id,
            accountStatus: masterTenant.status || 'active',
          };
        }
      }
    } catch {}


    // 3. Verifikasi Tenant di database lokal (jika ada unit terdaftar di tabel tenants bot.db)
    try {
      const localTenant = db.prepare(`
        SELECT id, username, password_hash, salt, status
        FROM tenants
        WHERE LOWER(username) = LOWER(?)
      `).get(trimmedInputUser) as any;

      if (localTenant && localTenant.password_hash && localTenant.salt) {
        const tenantHash = crypto.pbkdf2Sync(passwordInput, localTenant.salt, 100000, 64, 'sha512').toString('hex');
        const hashBuffer = Buffer.from(localTenant.password_hash, 'hex');
        const inputBuffer = Buffer.from(tenantHash, 'hex');

        if (hashBuffer.length === inputBuffer.length && crypto.timingSafeEqual(hashBuffer, inputBuffer)) {
          return {
            success: true,
            username: localTenant.username,
            tenantId: localTenant.id,
            accountStatus: localTenant.status || 'active',
          };
        }
      }
    } catch {}


    return false;
  } catch (err) {
    console.error('Error saat verifikasi login SQLite:', err);
    return false;
  }
}

/**
 * Buat sesi login baru dan kembalikan session token
 */
export function createSession(username: string, tenantId: string = 't_wanzt'): string {
  cleanExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  activeSessions.set(token, {
    token,
    username,
    tenantId: tenantId || 't_wanzt',
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  return token;
}

/**
 * Dapatkan data sesi aktif
 */
export function getSession(token?: string | null): SessionData | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Validasi session token
 */
export function validateSession(token?: string | null): boolean {
  return Boolean(getSession(token));
}

/**
 * Hapus sesi login (Logout)
 */
export function revokeSession(token?: string | null): void {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Hapus sesi kedaluwarsa dari memori
 */
function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, data] of activeSessions.entries()) {
    if (now > data.expiresAt) {
      activeSessions.delete(token);
    }
  }
}

/**
 * Pembaruan Username Akun Tenant Mandiri
 */
export function updateTenantUsername(
  tenantId: string,
  currentUsername: string,
  newUsernameRaw: string
): { success: boolean; message: string; newUsername?: string } {
  try {
    if (!newUsernameRaw || typeof newUsernameRaw !== 'string') {
      return { success: false, message: 'Username baru tidak boleh kosong.' };
    }
    const newUsername = newUsernameRaw.trim();
    if (newUsername.length < 3 || newUsername.length > 32) {
      return { success: false, message: 'Panjang username minimal 3 dan maksimal 32 karakter.' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(newUsername)) {
      return { success: false, message: 'Username hanya boleh memuat huruf, angka, titik, strip (-), atau underscore (_).' };
    }

    if (newUsername.toLowerCase() === currentUsername.toLowerCase()) {
      return { success: false, message: 'Username baru sama dengan username saat ini.' };
    }

    // 1. Cek apakah username sudah dipakai di master.db oleh tenant lain
    const masterDb = getMasterDb();
    const existingTenant = masterDb.prepare(`
      SELECT tenant_id FROM tenants 
      WHERE LOWER(username) = LOWER(?) AND tenant_id != ?
    `).get(newUsername, tenantId);

    if (existingTenant) {
      return { success: false, message: 'Username sudah digunakan oleh akun toko/tenant lain.' };
    }

    // Cek juga di super_admins
    const existingAdmin = masterDb.prepare(`
      SELECT id FROM super_admins WHERE LOWER(username) = LOWER(?)
    `).get(newUsername);
    if (existingAdmin) {
      return { success: false, message: 'Username tidak dapat digunakan (khusus sistem).' };
    }

    // 2. Update di master.db tabel tenants
    masterDb.prepare(`
      UPDATE tenants SET username = ? WHERE tenant_id = ?
    `).run(newUsername, tenantId);

    // 3. Update di SQLite database lokal tenant (auth table)
    try {
      db.prepare(`
        UPDATE auth SET username = ?, updated_at = ? WHERE id = 1
      `).run(newUsername, new Date().toISOString());
    } catch {}

    // Update di tabel tenants lokal (jika ada)
    try {
      db.prepare(`
        UPDATE tenants SET username = ? WHERE id = ?
      `).run(newUsername, tenantId);
    } catch {}

    // 4. Update sesi aktif yang sedang login dengan tenantId ini
    for (const [token, sess] of activeSessions.entries()) {
      if (sess.tenantId === tenantId) {
        sess.username = newUsername;
      }
    }

    return {
      success: true,
      message: 'Username berhasil diperbarui!',
      newUsername,
    };
  } catch (err: any) {
    console.error('Error saat updateTenantUsername:', err);
    return { success: false, message: err?.message || 'Gagal mengubah username.' };
  }
}

/**
 * Pembaruan Password Akun Tenant Mandiri (dengan verifikasi 3 kolom)
 */
export function updateTenantPassword(
  tenantId: string,
  username: string,
  currentPasswordRaw: string,
  newPasswordRaw: string,
  confirmPasswordRaw: string
): { success: boolean; message: string } {
  try {
    const currentPassword = (currentPasswordRaw || '').trim();
    const newPassword = (newPasswordRaw || '').trim();
    const confirmPassword = (confirmPasswordRaw || '').trim();

    if (!currentPassword) {
      return { success: false, message: 'Password saat ini wajib diisi untuk verifikasi keamanan.' };
    }
    if (!newPassword) {
      return { success: false, message: 'Password baru wajib diisi.' };
    }
    if (!confirmPassword) {
      return { success: false, message: 'Konfirmasi password baru wajib diisi.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Password baru dan konfirmasi password tidak cocok!' };
    }
    if (newPassword.length < 5) {
      return { success: false, message: 'Password baru minimal 5 karakter.' };
    }

    // 1. Verifikasi Password Saat Ini (Current Password)
    let isCurrentValid = false;

    // Cek di masterDb
    const masterDb = getMasterDb();
    const masterTenant = masterDb.prepare(`
      SELECT tenant_id, username, password_hash FROM tenants WHERE tenant_id = ?
    `).get(tenantId) as any;

    if (masterTenant && masterTenant.password_hash) {
      const inputMasterHash = hashMasterPassword(currentPassword);
      if (inputMasterHash === masterTenant.password_hash) {
        isCurrentValid = true;
      }
    }

    // Cek fallback di database auth lokal tenant
    if (!isCurrentValid) {
      try {
        const localAuth = db.prepare(`
          SELECT username, password_hash as hash, salt FROM auth WHERE id = 1
        `).get() as any;
        if (localAuth && localAuth.hash && localAuth.salt) {
          const inputHash = hashPassword(currentPassword, localAuth.salt);
          const hashBuffer = Buffer.from(localAuth.hash, 'hex');
          const inputBuffer = Buffer.from(inputHash, 'hex');
          if (hashBuffer.length === inputBuffer.length && crypto.timingSafeEqual(hashBuffer, inputBuffer)) {
            isCurrentValid = true;
          }
        }
      } catch {}
    }

    // Jika password saat ini salah, tolak!
    if (!isCurrentValid) {
      return { success: false, message: 'Password saat ini tidak valid! Periksa kembali password Anda.' };
    }

    // 2. Hash Password Baru dan Simpan ke masterDb
    const newMasterHash = hashMasterPassword(newPassword);
    masterDb.prepare(`
      UPDATE tenants SET password_hash = ? WHERE tenant_id = ?
    `).run(newMasterHash, tenantId);

    // Update di database tenant lokal (tabel auth)
    try {
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newLocalHash = hashPassword(newPassword, newSalt);
      db.prepare(`
        UPDATE auth SET password_hash = ?, salt = ?, updated_at = ? WHERE id = 1
      `).run(newLocalHash, newSalt, new Date().toISOString());
    } catch {}

    // Update di tabel tenants lokal (jika ada)
    try {
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newLocalHash = hashPassword(newPassword, newSalt);
      db.prepare(`
        UPDATE tenants SET password_hash = ?, salt = ? WHERE id = ?
      `).run(newLocalHash, newSalt, tenantId);
    } catch {}

    return {
      success: true,
      message: 'Password berhasil diperbarui! Silakan gunakan password baru ini untuk login berikutnya.',
    };
  } catch (err: any) {
    console.error('Error saat updateTenantPassword:', err);
    return { success: false, message: err?.message || 'Gagal mengubah password.' };
  }
}

