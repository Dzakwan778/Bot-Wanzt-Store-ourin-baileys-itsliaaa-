import { getMasterDb, hashPassword } from '../database/masterSqlite.ts';
import { initTenantDb, deleteTenantDb } from '../../backend/database/tenantDbManager.ts';
import { getBotManager } from '../../backend/botManager.ts';
import fs from 'fs';
import path from 'path';

export interface TenantRecord {
  id: number;
  tenant_id: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  username: string;
  package_name: string;
  status: 'active' | 'suspended' | 'expired';
  max_groups: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
  days_remaining?: number;
  duration_days?: number;
  bot_status?: 'online' | 'offline';
}

export interface CreateTenantInput {
  tenant_id?: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  username: string;
  password?: string;
  package_name?: string;
  duration_days?: number;
  max_groups?: number;
  notes?: string;
}

export function normalizeIndonesianPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else if (!digits.startsWith('62') && digits.length > 0) {
    digits = '62' + digits;
  }
  return digits;
}

export class TenantManager {
  private static cleanId(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.floor(100 + Math.random() * 900);
    return `t_${slug || 'store'}_${random}`;
  }

  static getAllTenants(): TenantRecord[] {
    const db = getMasterDb();
    const rows = db.prepare(`
      SELECT id, tenant_id, store_name, owner_name, owner_phone, username, package_name, status, max_groups, created_at, expires_at, notes
      FROM tenants
      ORDER BY expires_at DESC, id DESC
    `).all() as TenantRecord[];

    const now = new Date().getTime();
    const mapped = rows.map((row) => {
      const exp = new Date(row.expires_at).getTime();
      const created = new Date(row.created_at).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      const durationDays = Math.max(1, Math.round((exp - created) / (1000 * 60 * 60 * 24)));

      let botStatus: 'online' | 'offline' = 'offline';
      try {
        const bot = getBotManager(row.tenant_id);
        if (bot && bot.status === 'connected') {
          botStatus = 'online';
        }
      } catch {
        botStatus = 'offline';
      }

      return {
        ...row,
        owner_phone: normalizeIndonesianPhone(row.owner_phone),
        days_remaining: diffDays > 0 ? diffDays : 0,
        duration_days: durationDays,
        bot_status: botStatus,
        status: exp < now && row.status === 'active' ? ('expired' as const) : row.status,
      };
    });

    // Urutkan peringkat masa sewa secara adil: unit aktif dengan sisa sewa terpanjang berada di peringkat teratas
    return mapped.sort((a, b) => {
      // Prioritaskan active dibanding expired/suspended
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (b.days_remaining || 0) - (a.days_remaining || 0);
    });
  }

  static getTenant(tenantId: string): TenantRecord | null {
    const db = getMasterDb();
    const row = db.prepare(`
      SELECT id, tenant_id, store_name, owner_name, owner_phone, username, package_name, status, max_groups, created_at, expires_at, notes
      FROM tenants
      WHERE tenant_id = ?
    `).get(tenantId) as TenantRecord | undefined;

    if (!row) return null;

    const now = new Date().getTime();
    const exp = new Date(row.expires_at).getTime();
    const created = new Date(row.created_at).getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, Math.round((exp - created) / (1000 * 60 * 60 * 24)));

    let botStatus: 'online' | 'offline' = 'offline';
    try {
      const bot = getBotManager(row.tenant_id);
      if (bot && bot.status === 'connected') {
        botStatus = 'online';
      }
    } catch {
      botStatus = 'offline';
    }

    return {
      ...row,
      owner_phone: normalizeIndonesianPhone(row.owner_phone),
      days_remaining: diffDays > 0 ? diffDays : 0,
      duration_days: durationDays,
      bot_status: botStatus,
    };
  }

  static createTenant(input: CreateTenantInput): TenantRecord {
    const db = getMasterDb();
    const tenantId = input.tenant_id || this.cleanId(input.store_name);
    const password = input.password || 'toko12345';
    const passwordHash = hashPassword(password);
    const duration = input.duration_days || 30;
    const normalizedPhone = normalizeIndonesianPhone(input.owner_phone);

    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // 1. Simpan di master.db (Semua unit bot mendapatkan Akses Penuh dan kapabilitas setara)
    db.prepare(`
      INSERT INTO tenants (
        tenant_id, store_name, owner_name, owner_phone, username, password_hash, package_name, status, max_groups, created_at, expires_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      input.store_name,
      input.owner_name,
      normalizedPhone,
      input.username,
      passwordHash,
      'Akses Penuh',
      'active',
      input.max_groups || 50,
      createdAt.toISOString(),
      expiresAt.toISOString(),
      input.notes || `Unit bot toko untuk ${input.store_name}`
    );

    // 2. Inisialisasi Database mandiri untuk tenant baru
    initTenantDb(tenantId);

    // 3. Inisialisasi folder sesi Baileys terisolasi
    const authFolder = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    return this.getTenant(tenantId)!;
  }

  static extendDuration(tenantId: string, days: number, note?: string): TenantRecord {
    const db = getMasterDb();
    const tenant = this.getTenant(tenantId);
    if (!tenant) throw new Error('Tenant tidak ditemukan');

    const currentExp = new Date(tenant.expires_at).getTime();
    const now = new Date().getTime();
    const baseTime = currentExp > now ? currentExp : now;

    const newExp = new Date(baseTime);
    newExp.setDate(newExp.getDate() + days);

    db.prepare(`
      UPDATE tenants
      SET expires_at = ?, status = 'active'
      WHERE tenant_id = ?
    `).run(newExp.toISOString(), tenantId);

    db.prepare(`
      INSERT INTO subscription_logs (tenant_id, amount, days_added, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, 0, days, note || `Perpanjangan sewa +${days} hari`, new Date().toISOString());

    return this.getTenant(tenantId)!;
  }

  static setStatus(tenantId: string, status: 'active' | 'suspended' | 'expired'): TenantRecord {
    const db = getMasterDb();
    db.prepare(`
      UPDATE tenants
      SET status = ?
      WHERE tenant_id = ?
    `).run(status, tenantId);

    return this.getTenant(tenantId)!;
  }

  static resetPassword(tenantId: string, newPassword?: string): { tenant_id: string; username: string; new_password: string } {
    const db = getMasterDb();
    const tenant = this.getTenant(tenantId);
    if (!tenant) throw new Error('Tenant tidak ditemukan');

    const passwordToSet = newPassword && newPassword.trim().length > 0
      ? newPassword.trim()
      : `pass_${Math.random().toString(36).substring(2, 8)}`;

    const passwordHash = hashPassword(passwordToSet);

    db.prepare(`
      UPDATE tenants
      SET password_hash = ?
      WHERE tenant_id = ?
    `).run(passwordHash, tenantId);

    return {
      tenant_id: tenantId,
      username: tenant.username,
      new_password: passwordToSet,
    };
  }

  static deleteTenant(tenantId: string): boolean {
    const db = getMasterDb();
    // Jangan izinkan hapus tenant default wanzt
    if (tenantId === 't_wanzt') {
      throw new Error('Tenant default "t_wanzt" tidak boleh dihapus.');
    }

    db.prepare('DELETE FROM tenants WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM subscription_logs WHERE tenant_id = ?').run(tenantId);

    // Hapus database fisik tenant
    deleteTenantDb(tenantId);

    // Hapus sesi Baileys
    const authFolder = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (fs.existsSync(authFolder)) {
      fs.rmSync(authFolder, { recursive: true, force: true });
    }

    return true;
  }

  static getGlobalStats() {
    const tenants = this.getAllTenants();
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'active').length;
    const expiredTenants = tenants.filter((t) => t.status === 'expired').length;
    const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;

    return {
      totalTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      serverTime: new Date().toISOString(),
    };
  }
}
