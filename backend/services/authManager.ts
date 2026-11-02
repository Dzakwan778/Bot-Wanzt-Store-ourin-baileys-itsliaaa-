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
        if (masterTenant.status === 'suspended') {
          return false;
        }
        const masterHash = hashMasterPassword(passwordInput);
        if (masterHash === masterTenant.password_hash) {
          return { success: true, username: masterTenant.username, tenantId: masterTenant.tenant_id };
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
        if (localTenant.status === 'suspended') {
          return false;
        }
        const tenantHash = crypto.pbkdf2Sync(passwordInput, localTenant.salt, 100000, 64, 'sha512').toString('hex');
        const hashBuffer = Buffer.from(localTenant.password_hash, 'hex');
        const inputBuffer = Buffer.from(tenantHash, 'hex');

        if (hashBuffer.length === inputBuffer.length && crypto.timingSafeEqual(hashBuffer, inputBuffer)) {
          return { success: true, username: localTenant.username, tenantId: localTenant.id };
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
