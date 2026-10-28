import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function resolveAuthPath(): string {
  const localDb = path.resolve(process.cwd(), 'database', 'auth.json');
  if (fs.existsSync(localDb)) return localDb;
  const backendDb = path.resolve(process.cwd(), 'backend', 'database', 'auth.json');
  if (fs.existsSync(backendDb)) return backendDb;
  return localDb;
}

const AUTH_FILE = resolveAuthPath();
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
 * Inisialisasi kredensial awal jika file database/auth.json belum ada
 * Akun default awal: username: "admin", password: "admin123"
 */
export function initAuth(): AuthConfig {
  try {
    const dir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.username && parsed.hash && parsed.salt) {
        return parsed;
      }
    }

    const defaultSalt = crypto.randomBytes(16).toString('hex');
    const defaultHash = hashPassword('admin123', defaultSalt);
    const initialConfig: AuthConfig = {
      username: 'admin',
      salt: defaultSalt,
      hash: defaultHash,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
    return initialConfig;
  } catch (err) {
    console.error('Gagal inisialisasi auth.json:', err);
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
    console.error('Error saat verifikasi login:', err);
    return false;
  }
}

/**
 * Buat sesi login baru dan kembalikan session token
 */
export function createSession(username: string): string {
  // Bersihkan sesi yang kedaluwarsa
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
