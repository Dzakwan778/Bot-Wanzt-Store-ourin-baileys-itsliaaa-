import crypto from 'node:crypto';

const LEGACY_MASTER_SALT = 'master_salt_wanzt_2026';
const SCRYPT_PREFIX = 'scrypt$';
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N=16384 (~16 MiB memory-hard)
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export interface PasswordVerifyResult {
  valid: boolean;
  needsRehash: boolean;
}

/**
 * Hash password kuat menggunakan crypto.scrypt + salt acak 16-byte per akun.
 * Format: scrypt$<saltHex32>$<derivedKeyHex128>
 */
export function hashScryptPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return `${SCRYPT_PREFIX}${salt}$${derived.toString('hex')}`;
}

function timingSafeHexEqual(hexA: string, hexB: string): boolean {
  if (!hexA || !hexB || hexA.length !== hexB.length) return false;
  if (!/^[0-9a-f]+$/i.test(hexA) || !/^[0-9a-f]+$/i.test(hexB)) return false;
  const bufA = Buffer.from(hexA.toLowerCase(), 'hex');
  const bufB = Buffer.from(hexB.toLowerCase(), 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifikasi hash scrypt secara constant-time.
 */
export function verifyScryptPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.startsWith(SCRYPT_PREFIX)) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const keyLen = Math.floor(expectedHex.length / 2);
    if (keyLen < 16) return false;
    const derived = crypto.scryptSync(password, salt, keyLen, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    });
    return timingSafeHexEqual(expectedHex, derived.toString('hex'));
  } catch {
    return false;
  }
}

/**
 * Verifikasi hash Master DB (super_admins & tenants):
 * - Mendukung format baru `scrypt$<salt>$<hash>`
 * - Mendukung verifikasi transparan hash legacy PBKDF2-SHA256 1000 iterasi (menandai `needsRehash: true`)
 * - Selalu menggunakan crypto.timingSafeEqual
 */
export function verifyMasterPassword(password: string, storedHash: string): PasswordVerifyResult {
  if (!password || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    return {
      valid: verifyScryptPassword(password, storedHash),
      needsRehash: false,
    };
  }

  // Kompatibilitas transparan untuk hash legacy 64-char hex (master_salt_wanzt_2026)
  if (/^[0-9a-f]{64}$/i.test(storedHash)) {
    const legacyCandidate = crypto
      .pbkdf2Sync(password, LEGACY_MASTER_SALT, 1000, 32, 'sha256')
      .toString('hex');
    const valid = timingSafeHexEqual(storedHash, legacyCandidate);
    return { valid, needsRehash: valid };
  }

  return { valid: false, needsRehash: false };
}

/**
 * Verifikasi hash PBKDF2-SHA512 kolom terpisah (tabel auth & tenants lokal) atau format scrypt$.
 */
export function verifyLocalSaltedPassword(
  password: string,
  storedHash: string,
  salt?: string,
  iterations: number = 100000
): PasswordVerifyResult {
  if (!password || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    return {
      valid: verifyScryptPassword(password, storedHash),
      needsRehash: false,
    };
  }

  if (!salt) {
    return { valid: false, needsRehash: false };
  }

  try {
    const safeIter = Math.max(1000, Number(iterations) || 100000);
    const derived = crypto.pbkdf2Sync(password, salt, safeIter, 64, 'sha512').toString('hex');
    const valid = timingSafeHexEqual(storedHash, derived);
    return { valid, needsRehash: valid };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

/**
 * Menghasilkan password acak sementara untuk proses bootstrap awal (jika DB masih kosong).
 */
export function generateBootstrapSecretPassword(byteLength: number = 12): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}
