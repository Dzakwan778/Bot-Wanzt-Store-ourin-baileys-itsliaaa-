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

export interface ImpersonationExchangeEntry {
  tenantId: string;
  adminId: number;
  adminSessionToken: string;
  expiresAt: number;
}

export interface ImpersonationSessionEntry {
  tenantId: string;
  adminId: number;
  adminSessionToken: string;
  expiresAt: number;
}

const IMPERSONATION_CODE_TTL_MS = 2 * 60 * 1000; // 2 menit sekali pakai
const IMPERSONATION_SESSION_TTL_MS = 30 * 60 * 1000; // 30 menit terikat sesi admin

export const impersonationExchangeCodes = new Map<string, ImpersonationExchangeEntry>();
export const impersonationTokens = new Map<string, ImpersonationSessionEntry>();

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
    const staleCutoffIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

    // Bersihkan sesi & catatan attempt yang sudah kedaluwarsa secara berkala
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(nowIso);
    db.prepare(
      'DELETE FROM admin_login_attempts WHERE last_attempt_at < ? AND (locked_until IS NULL OR locked_until <= ?)'
    ).run(staleCutoffIso, nowIso);
    db.prepare(
      'DELETE FROM admin_username_login_attempts WHERE last_attempt_at < ? AND (locked_until IS NULL OR locked_until <= ?)'
    ).run(staleCutoffIso, nowIso);

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const usernameKey = normalizedUsername.toLowerCase();

    // 1. Cek apakah IP atau username sedang terkunci karena brute-force
    const ipAttemptRecord = db
      .prepare('SELECT failed_count, locked_until FROM admin_login_attempts WHERE ip = ?')
      .get(clientIp) as { failed_count: number; locked_until: string | null } | undefined;

    const userAttemptRecord = usernameKey
      ? (db
          .prepare(
            'SELECT failed_count, locked_until FROM admin_username_login_attempts WHERE username = ?'
          )
          .get(usernameKey) as { failed_count: number; locked_until: string | null } | undefined)
      : undefined;

    const ipLockout = evaluateLockoutState(ipAttemptRecord, nowMs);
    const userLockout = evaluateLockoutState(userAttemptRecord, nowMs);

    if (ipLockout.isLocked || userLockout.isLocked) {
      const useUserLock =
        userLockout.isLocked &&
        (!ipLockout.isLocked || userLockout.remainingSeconds >= ipLockout.remainingSeconds);
      const remainingSeconds = useUserLock
        ? userLockout.remainingSeconds
        : ipLockout.remainingSeconds;
      const lockedUntil = useUserLock
        ? userAttemptRecord?.locked_until || null
        : ipAttemptRecord?.locked_until || null;

      throw new AdminAuthError(
        `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${formatRemainingLockout(
          remainingSeconds
        )}.`,
        429,
        {
          remainingSeconds,
          lockedUntil,
        }
      );
    }

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
      const ipNextState = computeNextFailedAttempt(ipLockout.activeFailedCount, nowMs);
      const userNextState = computeNextFailedAttempt(userLockout.activeFailedCount, nowMs);

      db.prepare(`
        INSERT INTO admin_login_attempts (ip, failed_count, locked_until, last_attempt_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ip) DO UPDATE SET
          failed_count = excluded.failed_count,
          locked_until = excluded.locked_until,
          last_attempt_at = excluded.last_attempt_at
      `).run(clientIp, ipNextState.failedCount, ipNextState.lockedUntil, nowIso);

      db.prepare(`
        INSERT INTO admin_username_login_attempts (username, failed_count, locked_until, last_attempt_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          failed_count = excluded.failed_count,
          locked_until = excluded.locked_until,
          last_attempt_at = excluded.last_attempt_at
      `).run(usernameKey, userNextState.failedCount, userNextState.lockedUntil, nowIso);

      if (ipNextState.isLocked || userNextState.isLocked) {
        throw new AdminAuthError(
          'Terlalu banyak percobaan login gagal (5x). Akses login dikunci sementara selama 15 menit.',
          429,
          {
            remainingSeconds: 15 * 60,
            lockedUntil: userNextState.isLocked ? userNextState.lockedUntil : ipNextState.lockedUntil,
          }
        );
      }

      const remainingAttempts = Math.max(
        0,
        Math.min(
          MAX_FAILED_LOGIN_ATTEMPTS - ipNextState.failedCount,
          MAX_FAILED_LOGIN_ATTEMPTS - userNextState.failedCount
        )
      );
      throw new AdminAuthError(
        `Username atau password tidak valid. Sisa percobaan: ${remainingAttempts}x.`,
        401
      );
    }

    // 3. Login berhasil: hapus catatan percobaan gagal IP & username, serta upgrade hash lama ke scrypt bila perlu
    db.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').run(clientIp);
    db.prepare('DELETE FROM admin_username_login_attempts WHERE username = ?').run(usernameKey);
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
      return { valid: false };
    }

    if (isSessionExpired(row.expires_at)) {
      db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(cleanToken);
      this.revokeImpersonationByAdminSession(cleanToken);
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
    this.revokeImpersonationByAdminSession(cleanToken);
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

    // Cabut seluruh kode dan token impersonasi milik admin yang mengganti password
    this.revokeImpersonationByAdminId(admin.id);

    return { success: true };
  }

  private static cleanExpiredImpersonationEntries(nowMs: number = Date.now()) {
    for (const [code, entry] of impersonationExchangeCodes.entries()) {
      if (nowMs >= entry.expiresAt) {
        impersonationExchangeCodes.delete(code);
      }
    }
    for (const [tok, entry] of impersonationTokens.entries()) {
      if (nowMs >= entry.expiresAt) {
        impersonationTokens.delete(tok);
      }
    }
  }

  static isAdminSessionActive(adminSessionToken: string): boolean {
    if (!adminSessionToken) return false;
    try {
      const db = getMasterDb();
      const row = db
        .prepare('SELECT expires_at FROM admin_sessions WHERE token = ?')
        .get(adminSessionToken) as { expires_at: string } | undefined;
      if (!row || isSessionExpired(row.expires_at)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  static createImpersonationCode(tenantId: string, adminId: number, adminSessionToken: string): string {
    this.cleanExpiredImpersonationEntries();
    const impCode = crypto.randomBytes(24).toString('hex');
    impersonationExchangeCodes.set(impCode, {
      tenantId,
      adminId,
      adminSessionToken,
      expiresAt: Date.now() + IMPERSONATION_CODE_TTL_MS,
    });
    return impCode;
  }

  static exchangeImpersonationCode(
    code: string
  ): { success: true; token: string; tenantId: string } | { success: false; error: string } {
    this.cleanExpiredImpersonationEntries();
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    if (!cleanCode) {
      return { success: false, error: 'Kode impersonasi wajib diisi.' };
    }

    const entry = impersonationExchangeCodes.get(cleanCode);
    // Sekali pakai: hapus langsung saat dibaca
    impersonationExchangeCodes.delete(cleanCode);

    if (!entry) {
      return { success: false, error: 'Kode impersonasi tidak valid atau sudah digunakan.' };
    }

    if (Date.now() >= entry.expiresAt) {
      return { success: false, error: 'Kode impersonasi telah kedaluwarsa.' };
    }

    if (!this.isAdminSessionActive(entry.adminSessionToken)) {
      return { success: false, error: 'Sesi Master Admin pembuat impersonasi sudah berakhir.' };
    }

    const impSessionToken = crypto.randomBytes(32).toString('hex');
    impersonationTokens.set(impSessionToken, {
      tenantId: entry.tenantId,
      adminId: entry.adminId,
      adminSessionToken: entry.adminSessionToken,
      expiresAt: Date.now() + IMPERSONATION_SESSION_TTL_MS,
    });

    return {
      success: true,
      token: impSessionToken,
      tenantId: entry.tenantId,
    };
  }

  static revokeImpersonationByAdminSession(adminSessionToken: string): void {
    if (!adminSessionToken) return;
    for (const [code, entry] of impersonationExchangeCodes.entries()) {
      if (entry.adminSessionToken === adminSessionToken) {
        impersonationExchangeCodes.delete(code);
      }
    }
    for (const [tok, entry] of impersonationTokens.entries()) {
      if (entry.adminSessionToken === adminSessionToken) {
        impersonationTokens.delete(tok);
      }
    }
  }

  static revokeImpersonationByAdminId(adminId: number): void {
    for (const [code, entry] of impersonationExchangeCodes.entries()) {
      if (entry.adminId === adminId) {
        impersonationExchangeCodes.delete(code);
      }
    }
    for (const [tok, entry] of impersonationTokens.entries()) {
      if (entry.adminId === adminId) {
        impersonationTokens.delete(tok);
      }
    }
  }

  static revokeImpersonationByTenant(tenantId: string): void {
    if (!tenantId) return;
    for (const [code, entry] of impersonationExchangeCodes.entries()) {
      if (entry.tenantId === tenantId) {
        impersonationExchangeCodes.delete(code);
      }
    }
    for (const [tok, entry] of impersonationTokens.entries()) {
      if (entry.tenantId === tenantId) {
        impersonationTokens.delete(tok);
      }
    }
  }
}
