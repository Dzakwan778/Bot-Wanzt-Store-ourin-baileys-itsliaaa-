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

/**
 * Verifikasi login dengan perbandingan waktu konstan (constant-time comparison)
 * Mencegah timing attacks
 */
export function verifyLogin(usernameInput: string, passwordInput: string): boolean {
  try {
    const auth = initAuth();
    if (!usernameInput || !passwordInput) return false;

    // Periksa kesesuaian username
    const trimmedInputUser = usernameInput.trim();
    if (trimmedInputUser.toLowerCase() !== auth.username.toLowerCase()) {
      return false;
    }

    const inputHash = hashPassword(passwordInput, auth.salt);
    const hashBuffer = Buffer.from(auth.hash, 'hex');
    const inputBuffer = Buffer.from(inputHash, 'hex');

    if (hashBuffer.length !== inputBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, inputBuffer);
  } catch (err) {
    console.error('Error saat verifikasi login SQLite:', err);
    return false;
  }
}

/**
 * Buat sesi login baru dan kembalikan session token
 */
export function createSession(username: string): string {
  cleanExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  activeSessions.set(token, {
    token,
    username,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  return token;
}

/**
 * Validasi session token
 */
export function validateSession(token?: string | null): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
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
