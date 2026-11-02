import crypto from 'crypto';
import { db } from '../database/sqlite.ts';
import {
  TenantRecord,
  TenantDTO,
  ApartmentStats,
  CreateTenantInput,
  ExtendLeaseInput,
  TenantStatus,
  MasterAdminAuthConfig,
} from '../types/apartment.types.ts';

// Cache sesi Master Admin (Super Admin)
interface MasterSessionData {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

const masterSessions = new Map<string, MasterSessionData>();
const MASTER_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 Jam

/**
 * Hash password menggunakan PBKDF2 (SHA-512 dengan 100.000 iterasi)
 */
export function hashApartmentPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Inisialisasi kredensial Master Admin
 */
export function initMasterAdmin(): MasterAdminAuthConfig {
  const row = db.prepare(`
    SELECT username, password_hash as hash, salt, updated_at as updatedAt
    FROM master_admin
    WHERE id = 1
  `).get() as MasterAdminAuthConfig | undefined;

  if (row && row.username && row.hash && row.salt) {
    return row;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashApartmentPassword('masterwanzt888', salt);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO master_admin (id, username, password_hash, salt, iterations, updated_at)
    VALUES (1, 'superadmin', ?, ?, 100000, ?)
  `).run(hash, salt, now);

  return {
    username: 'superadmin',
    salt,
    hash,
    updatedAt: now,
  };
}

/**
 * Verifikasi login Master Admin
 */
export function verifyMasterAdminLogin(usernameInput: string, passwordInput: string): boolean {
  try {
    const admin = initMasterAdmin();
    if (!usernameInput || !passwordInput) return false;

    if (usernameInput.trim().toLowerCase() !== admin.username.toLowerCase()) {
      return false;
    }

    const inputHash = hashApartmentPassword(passwordInput, admin.salt);
    const hashBuffer = Buffer.from(admin.hash, 'hex');
    const inputBuffer = Buffer.from(inputHash, 'hex');

    if (hashBuffer.length !== inputBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, inputBuffer);
  } catch (err) {
    console.error('Error saat verifikasi login Master Admin:', err);
    return false;
  }
}

/**
 * Buat sesi Master Admin
 */
export function createMasterAdminSession(username: string): string {
  const token = 'master_' + crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  masterSessions.set(token, {
    token,
    username,
    createdAt: now,
    expiresAt: now + MASTER_SESSION_TTL_MS,
  });
  return token;
}

/**
 * Validasi sesi Master Admin
 */
export function validateMasterAdminSession(token?: string | null): boolean {
  if (!token) return false;
  const session = masterSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    masterSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Hapus sesi Master Admin (Logout)
 */
export function revokeMasterAdminSession(token?: string | null): void {
  if (token) {
    masterSessions.delete(token);
  }
}

/**
 * Cek dan update otomatis status masa sewa tenant yang telah kedaluwarsa
 */
export function checkAndUpdateLeaseStatuses(): void {
  try {
    const nowIso = new Date().toISOString();
    // Ubah status ke expired jika tanggal sekarang melebihi expired_date dan bukan suspended
    db.prepare(`
      UPDATE tenants
      SET status = 'expired', updated_at = ?
      WHERE status = 'active' AND expired_date < ?
    `).run(nowIso, nowIso);
  } catch (err) {
    console.error('Gagal memperbarui status masa sewa tenant:', err);
  }
}

/**
 * Mengonversi TenantRecord DB ke TenantDTO yang aman untuk dikirim ke frontend
 */
function toTenantDTO(record: TenantRecord): TenantDTO {
  const now = Date.now();
  const expireTime = new Date(record.expired_date).getTime();
  const diffMs = expireTime - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0 || record.status === 'expired';

  return {
    id: record.id,
    unitNumber: record.unit_number,
    name: record.name,
    username: record.username,
    phoneNumber: record.phone_number || '',
    planName: record.plan_name || 'Standard',
    status: record.status,
    startDate: record.start_date,
    expiredDate: record.expired_date,
    daysRemaining,
    isExpired,
    maxGroups: record.max_groups || 10,
    notes: record.notes || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Ambil seluruh daftar unit apartemen / tenant
 */
export function getAllTenants(): TenantDTO[] {
  checkAndUpdateLeaseStatuses();

  const rows = db.prepare(`
    SELECT * FROM tenants
    ORDER BY unit_number ASC, created_at DESC
  `).all() as TenantRecord[];

  return rows.map(toTenantDTO);
}

/**
 * Ambil tenant berdasarkan ID
 */
export function getTenantById(id: string): TenantDTO | null {
  checkAndUpdateLeaseStatuses();

  const row = db.prepare(`
    SELECT * FROM tenants WHERE id = ?
  `).get(id) as TenantRecord | undefined;

  return row ? toTenantDTO(row) : null;
}

/**
 * Ambil tenant berdasarkan Username (untuk pengecekan saat tenant login)
 */
export function getTenantByUsername(username: string): TenantRecord | null {
  checkAndUpdateLeaseStatuses();

  const row = db.prepare(`
    SELECT * FROM tenants WHERE LOWER(username) = LOWER(?)
  `).get(username) as TenantRecord | undefined;

  return row || null;
}

/**
 * Tambah unit apartemen / tenant baru
 */
export function createTenant(input: CreateTenantInput): TenantDTO {
  const cleanUsername = input.username.trim();
  if (!cleanUsername) {
    throw new Error('Username wajib diisi');
  }
  if (!input.password || input.password.length < 4) {
    throw new Error('Password minimal 4 karakter');
  }

  // Cek apakah username sudah digunakan
  const existing = db.prepare(`
    SELECT id FROM tenants WHERE LOWER(username) = LOWER(?)
  `).get(cleanUsername);

  if (existing) {
    throw new Error(`Username "${cleanUsername}" sudah digunakan oleh unit lain`);
  }

  // Auto-generate unit number jika tidak diisi
  let unitNumber = input.unitNumber?.trim();
  if (!unitNumber) {
    const totalCount = (db.prepare('SELECT COUNT(*) as c FROM tenants').get() as { c: number }).c;
    unitNumber = `Unit ${101 + totalCount}`;
  }

  const tenantId = `unit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashApartmentPassword(input.password, salt);

  const now = new Date();
  const durationDays = Number(input.durationDays) || 30;
  const expired = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const nowIso = now.toISOString();
  const expiredIso = expired.toISOString();

  db.prepare(`
    INSERT INTO tenants (
      id, unit_number, name, username, password_hash, salt,
      phone_number, plan_name, status, start_date, expired_date,
      max_groups, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, 'active', ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    tenantId,
    unitNumber,
    input.name.trim() || 'Toko Mitra',
    cleanUsername,
    passwordHash,
    salt,
    input.phoneNumber?.trim() || '',
    input.planName?.trim() || 'Standard',
    nowIso,
    expiredIso,
    Number(input.maxGroups) || 15,
    input.notes?.trim() || '',
    nowIso,
    nowIso
  );

  const created = getTenantById(tenantId);
  if (!created) {
    throw new Error('Gagal memverifikasi unit apartemen yang baru dibuat');
  }

  return created;
}

/**
 * Perpanjang masa sewa unit apartemen
 */
export function extendTenantLease(id: string, input: ExtendLeaseInput): TenantDTO {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as TenantRecord | undefined;
  if (!tenant) {
    throw new Error(`Unit apartemen dengan ID "${id}" tidak ditemukan`);
  }

  const now = new Date();
  let newExpiredDate: Date;

  if (input.newExpiredDate) {
    newExpiredDate = new Date(input.newExpiredDate);
    if (isNaN(newExpiredDate.getTime())) {
      throw new Error('Format tanggal kedaluwarsa baru tidak valid');
    }
  } else {
    const additionalDays = Number(input.additionalDays) || 30;
    const currentExpired = new Date(tenant.expired_date);

    // Jika sudah expired di masa lalu, hitung perpanjangan mulai dari HARI INI
    const baseDate = currentExpired.getTime() < now.getTime() ? now : currentExpired;
    newExpiredDate = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  }

  const nowIso = now.toISOString();
  const newExpiredIso = newExpiredDate.toISOString();

  // Jika sebelumnya status 'expired', aktifkan kembali
  const newStatus = tenant.status === 'suspended' ? 'suspended' : 'active';

  db.prepare(`
    UPDATE tenants
    SET expired_date = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(newExpiredIso, newStatus, nowIso, id);

  const updated = getTenantById(id);
  if (!updated) {
    throw new Error('Gagal mengambil data unit yang telah diperpanjang');
  }

  return updated;
}

/**
 * Ubah status unit apartemen (active / suspended / expired)
 */
export function setTenantStatus(id: string, newStatus: TenantStatus): TenantDTO {
  const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(id);
  if (!tenant) {
    throw new Error(`Unit apartemen "${id}" tidak ditemukan`);
  }

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE tenants
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, nowIso, id);

  const updated = getTenantById(id);
  if (!updated) {
    throw new Error('Gagal memperbarui status unit');
  }

  return updated;
}

/**
 * Reset password unit apartemen
 */
export function resetTenantPassword(id: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Password baru minimal 4 karakter');
  }

  const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(id);
  if (!tenant) {
    throw new Error(`Unit apartemen "${id}" tidak ditemukan`);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashApartmentPassword(newPassword, salt);
  const nowIso = new Date().toISOString();

  db.prepare(`
    UPDATE tenants
    SET password_hash = ?, salt = ?, updated_at = ?
    WHERE id = ?
  `).run(hash, salt, nowIso, id);
}

/**
 * Hapus unit apartemen
 */
export function deleteTenant(id: string): void {
  // Lindungi unit utama (unit-101) dari penghapusan
  if (id === 'unit-101') {
    throw new Error('Unit 101 adalah unit apartemen utama dan tidak dapat dihapus');
  }

  const result = db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`Unit apartemen "${id}" tidak ditemukan`);
  }
}

/**
 * Ringkasan statistik sewa seluruh unit apartemen
 */
export function getApartmentStats(): ApartmentStats {
  checkAndUpdateLeaseStatuses();

  const totalTenants = (db.prepare('SELECT COUNT(*) as c FROM tenants').get() as { c: number }).c;
  const activeTenants = (db.prepare("SELECT COUNT(*) as c FROM tenants WHERE status = 'active'").get() as { c: number }).c;
  const expiredTenants = (db.prepare("SELECT COUNT(*) as c FROM tenants WHERE status = 'expired'").get() as { c: number }).c;
  const suspendedTenants = (db.prepare("SELECT COUNT(*) as c FROM tenants WHERE status = 'suspended'").get() as { c: number }).c;

  return {
    totalTenants,
    activeTenants,
    expiredTenants,
    suspendedTenants,
  };
}
