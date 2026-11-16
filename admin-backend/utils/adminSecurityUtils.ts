export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

export interface LoginAttemptRecord {
  failed_count: number;
  locked_until: string | null;
}

export interface LockoutEvaluation {
  isLocked: boolean;
  remainingSeconds: number;
  activeFailedCount: number;
}

export function extractBearerToken(authHeader?: string): string {
  if (!authHeader || typeof authHeader !== 'string') return '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

export function calculateSessionExpiresAt(nowMs: number = Date.now()): string {
  return new Date(nowMs + ADMIN_SESSION_TTL_MS).toISOString();
}

export function isSessionExpired(expiresAtIso: string, nowMs: number = Date.now()): boolean {
  if (!expiresAtIso) return true;
  const parsed = Date.parse(expiresAtIso);
  if (Number.isNaN(parsed)) return true;
  return parsed <= nowMs;
}

export function evaluateLockoutState(
  record?: LoginAttemptRecord | null,
  nowMs: number = Date.now()
): LockoutEvaluation {
  if (!record) {
    return { isLocked: false, remainingSeconds: 0, activeFailedCount: 0 };
  }

  if (record.locked_until) {
    const lockedUntilMs = Date.parse(record.locked_until);
    if (!Number.isNaN(lockedUntilMs)) {
      if (lockedUntilMs > nowMs) {
        const remainingSeconds = Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 1000));
        return {
          isLocked: true,
          remainingSeconds,
          activeFailedCount: Math.max(0, Number(record.failed_count) || 0),
        };
      }
      // Lockout telah kedaluwarsa: reset hitungan gagal agar percobaan baru dimulai bersih
      return { isLocked: false, remainingSeconds: 0, activeFailedCount: 0 };
    }
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    activeFailedCount: Math.max(0, Number(record.failed_count) || 0),
  };
}

export function computeNextFailedAttempt(
  currentFailedCount: number,
  nowMs: number = Date.now()
): { failedCount: number; lockedUntil: string | null; isLocked: boolean } {
  const nextCount = Math.max(0, Math.floor(currentFailedCount)) + 1;
  if (nextCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      failedCount: nextCount,
      lockedUntil: new Date(nowMs + LOGIN_LOCKOUT_DURATION_MS).toISOString(),
      isLocked: true,
    };
  }
  return {
    failedCount: nextCount,
    lockedUntil: null,
    isLocked: false,
  };
}

export function formatRemainingLockout(remainingSeconds: number): string {
  const safeSeconds = Math.max(1, Math.ceil(remainingSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins > 0 && secs > 0) {
    return `${mins} menit ${secs} detik`;
  }
  if (mins > 0) {
    return `${mins} menit`;
  }
  return `${secs} detik`;
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): { valid: true } | { valid: false; error: string } {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { valid: false, error: 'Semua kolom password wajib diisi.' };
  }
  if (newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password baru minimal ${MIN_ADMIN_PASSWORD_LENGTH} karakter.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { valid: false, error: 'Konfirmasi password baru tidak cocok.' };
  }
  if (newPassword === currentPassword) {
    return { valid: false, error: 'Password baru tidak boleh sama dengan password saat ini.' };
  }
  return { valid: true };
}

export function normalizeClientIp(
  reqIp?: string,
  xForwardedFor?: string | string[]
): string {
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    const first = xForwardedFor[0].split(',')[0]?.trim();
    if (first) return first;
  } else if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  if (reqIp && reqIp.trim()) {
    return reqIp.trim();
  }
  return 'unknown';
}
