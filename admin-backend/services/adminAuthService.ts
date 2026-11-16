import crypto from 'crypto';
import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';
import { verifyMasterPassword } from '../utils/passwordCrypto.ts';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  calculateSessionExpiresAt,
  computeNextFailedAttempt,
  evaluateLockoutState,
  extractBearerToken,
  formatRemainingLockout,
  isSessionExpired,
  validatePasswordChange,
} from '../utils/adminSecurityUtils.ts';

export const activeAdminTokens = new Set<string>();
export const impersonationTokens = new Map<string, { tenantId: string; expiresAt: number }>();

export interface MasterAdminUser {
  id: number;
  username: string;
  name: string;
}

export interface AdminSessionResult {
  valid: boolean;
  admin?: MasterAdminUser;
  expiresAt?: string;
  token?: string;
}

export class AdminAuthError extends Error {
  statusCode: number;
  remainingSeconds?: number;
  lockedUntil?: string | null;

  constructor(
    message: string,
    statusCode: number = 401,
    extra?: { remainingSeconds?: number; lockedUntil?: string | null }
  ) {
    super(message);
    this.name = 'AdminAuthError';
    this.statusCode = statusCode;
    this.remainingSeconds = extra?.remainingSeconds;
    this.lockedUntil = extra?.lockedUntil;
  }
}

// Precomputed dummy scrypt hash untuk menyamakan waktu komputasi saat username tidak ditemukan
const DUMMY_ADMIN_SCRYPT_HASH =
  'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

export class AdminAuthService {
  static login(username?: string, password?: string, clientIp: string = 'unknown') {
    const db = getMasterDb();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Bersihkan sesi yang sudah kedaluwarsa secara berkala
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(nowIso);

    // 1. Cek apakah IP sedang terkunci karena brute-force
    const attemptRecord = db
      .prepare('SELECT failed_count, locked_until FROM admin_login_attempts WHERE ip = ?')
      .get(clientIp) as { failed_count: number; locked_until: string | null } | undefined;

    const lockout = evaluateLockoutState(attemptRecord, nowMs);
    if (lockout.isLocked) {
      throw new AdminAuthError(
        `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${formatRemainingLockout(
          lockout.remainingSeconds
        )}.`,
        429,
        {
          remainingSeconds: lockout.remainingSeconds,
          lockedUntil: attemptRecord?.locked_until || null,
        }
      );
    }

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    if (!normalizedUsername || !password) {
      throw new AdminAuthError('Username dan password wajib diisi.', 400);
    }

    // 2. Verifikasi kredensial terhadap tabel super_admins (scrypt + migrasi transparan hash lama)
    const admin = db
      .prepare('SELECT id, username, password_hash, name FROM super_admins WHERE username = ?')
      .get(normalizedUsername) as
      | { id: number; username: string; password_hash: string; name: string }
      | undefined;

    const pwCheck = verifyMasterPassword(password, admin?.password_hash || DUMMY_ADMIN_SCRYPT_HASH);
    const isPasswordValid = Boolean(admin && pwCheck.valid);

    if (!admin || !isPasswordValid) {
      const nextState = computeNextFailedAttempt(lockout.activeFailedCount, nowMs);

      db.prepare(`
        INSERT INTO admin_login_attempts (ip, failed_count, locked_until, last_attempt_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ip) DO UPDATE SET
          failed_count = excluded.failed_count,
          locked_until = excluded.locked_until,
          last_attempt_at = excluded.last_attempt_at
      `).run(clientIp, nextState.failedCount, nextState.lockedUntil, nowIso);

      if (nextState.isLocked) {
        throw new AdminAuthError(
          'Terlalu banyak percobaan login gagal (5x). Akses login dikunci sementara selama 15 menit.',
          429,
          {
            remainingSeconds: 15 * 60,
            lockedUntil: nextState.lockedUntil,
          }
        );
      }

      const remainingAttempts = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - nextState.failedCount);
      throw new AdminAuthError(
        `Username atau password tidak valid. Sisa percobaan: ${remainingAttempts}x.`,
        401
      );
    }

    // 3. Login berhasil: hapus catatan percobaan gagal & upgrade hash lama ke scrypt bila perlu
    db.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').run(clientIp);
    if (pwCheck.needsRehash) {
      try {
        db.prepare('UPDATE super_admins SET password_hash = ? WHERE id = ?').run(
          hashPassword(password),
          admin.id
        );
      } catch {}
    }

    // 4. Buat token sesi persisten 7 hari di SQLite
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = calculateSessionExpiresAt(nowMs);

    db.prepare(`
      INSERT INTO admin_sessions (token, admin_id, username, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(token, admin.id, admin.username, nowIso, expiresAt);

    activeAdminTokens.add(token);

    return {
      token,
      expiresAt,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    };
  }

  static verifySession(authHeader?: string): AdminSessionResult {
    const cleanToken = extractBearerToken(authHeader);
    if (!cleanToken) return { valid: false };

    const db = getMasterDb();
    const row = db
      .prepare(`
        SELECT s.token, s.admin_id, s.expires_at, a.username, a.name
        FROM admin_sessions s
        INNER JOIN super_admins a ON a.id = s.admin_id
        WHERE s.token = ?
      `)
      .get(cleanToken) as
      | { token: string; admin_id: number; expires_at: string; username: string; name: string }
      | undefined;

    if (!row) {
      activeAdminTokens.delete(cleanToken);
      return { valid: false };
    }

    if (isSessionExpired(row.expires_at)) {
      db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(cleanToken);
      activeAdminTokens.delete(cleanToken);
      return { valid: false };
    }

    return {
      valid: true,
      token: cleanToken,
      expiresAt: row.expires_at,
      admin: {
        id: row.admin_id,
        username: row.username,
        name: row.name,
      },
    };
  }

  static verifyToken(token?: string): boolean {
    return this.verifySession(token).valid;
  }

  static logout(authHeader?: string): boolean {
    const cleanToken = extractBearerToken(authHeader);
    if (!cleanToken) return false;

    const db = getMasterDb();
    const res = db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(cleanToken);
    activeAdminTokens.delete(cleanToken);
    return res.changes > 0;
  }

  static changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    keepToken?: string
  ) {
    const validation = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validation.valid === false) {
      throw new AdminAuthError(validation.error, 400);
    }

    const db = getMasterDb();
    const admin = db
      .prepare('SELECT id, username, password_hash FROM super_admins WHERE id = ?')
      .get(adminId) as { id: number; username: string; password_hash: string } | undefined;

    if (!admin) {
      throw new AdminAuthError('Akun Super Admin tidak ditemukan.', 404);
    }

    const currentCheck = verifyMasterPassword(currentPassword, admin.password_hash);
    if (!currentCheck.valid) {
      throw new AdminAuthError('Password saat ini tidak sesuai.', 400);
    }

    const nextHash = hashPassword(newPassword);
    db.prepare('UPDATE super_admins SET password_hash = ? WHERE id = ?').run(nextHash, admin.id);

    // Cabut semua sesi lain milik admin ini agar perangkat lama wajib login ulang
    if (keepToken) {
      db.prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND token != ?').run(admin.id, keepToken);
    } else {
      db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(admin.id);
    }

    return { success: true };
  }

  static createImpersonationToken(tenantId: string) {
    const impToken = crypto.randomBytes(24).toString('hex');
    impersonationTokens.set(impToken, {
      tenantId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 menit
    });
    return impToken;
  }
}
