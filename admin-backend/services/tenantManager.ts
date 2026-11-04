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
  store_name?: string;
  owner_name?: string;
  owner_phone?: string;
  username?: string;
  password?: string;
  package_name?: string;
  duration_days?: number;
  max_groups?: number;
  notes?: string;
}

export interface CreateTenantResult extends TenantRecord {
  generated_username?: string;
  generated_password?: string;
}

export function normalizeIndonesianPhone(raw?: string): string {
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
  private static cleanId(name?: string): string {
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `t_${slug || 'unit'}_${random}`;
  }

  public static generateStructuredUsername(): string {
    const db = getMasterDb();
    let username = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 20) {
      attempts++;
      // Format terstruktur: tenant_xxxx (4 digit angka)
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      username = `tenant_${randomDigits}`;
      const row = db.prepare('SELECT id FROM tenants WHERE username = ?').get(username);
      if (!row) {
        exists = false;
      }
    }
    return username || `tenant_${Date.now().toString().slice(-4)}`;
  }

  public static generateRandomPassword(): string {
    // Format terstruktur yang rapi dan mudah dibaca: pass_xxxx
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `pass_${code}`;
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

  static createTenant(input: CreateTenantInput): CreateTenantResult {
    const db = getMasterDb();
    const rawUsername = input.username?.trim();
    const username = rawUsername || this.generateStructuredUsername();
    const rawPassword = input.password?.trim();
    const password = rawPassword || this.generateRandomPassword();
    const passwordHash = hashPassword(password);
    const duration = input.duration_days || 365;

    const storeName = input.store_name?.trim() || '';
    const ownerName = input.owner_name?.trim() || '';
    const normalizedPhone = normalizeIndonesianPhone(input.owner_phone);
    const tenantId = input.tenant_id || this.cleanId(storeName || username);

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
      storeName,
      ownerName,
      normalizedPhone,
      username,
      passwordHash,
      'Akses Penuh',
      'active',
      input.max_groups || 50,
      createdAt.toISOString(),
      expiresAt.toISOString(),
      input.notes || (storeName ? `Unit bot toko untuk ${storeName}` : `Unit bot tenant baru (${username})`)
    );

    // 2. Inisialisasi Database mandiri untuk tenant baru
    initTenantDb(tenantId);

    // 3. Inisialisasi folder sesi Baileys terisolasi
    const authFolder = path.resolve(process.cwd(), 'auth_info_baileys', `tenant_${tenantId}`);
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const tenantRecord = this.getTenant(tenantId)!;
    return {
      ...tenantRecord,
      generated_username: username,
      generated_password: password,
    };
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

    // Jika disuspend, putuskan koneksi bot WhatsApp secara paksa
    if (status === 'suspended') {
      try {
        const bot = getBotManager(tenantId);
        if (bot) {
          bot.forceDisconnect().catch((err: any) => {
            console.error(`Gagal memutuskan koneksi bot tenant ${tenantId} saat suspend:`, err);
          });
        }
      } catch (err: any) {
        console.error(`Error mencari botManager tenant ${tenantId}:`, err);
      }
    }

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

  /**
   * Menyinkronkan pembaruan identitas toko (Nama Toko, Nama Owner, No. WhatsApp)
   * dari pengisian tenant ke tabel tenants di database master (master.db)
   */
  static updateStoreInfo(tenantId: string, storeName: string, ownerName: string, ownerPhone: string): boolean {
    try {
      const db = getMasterDb();
      const result = db.prepare(`
        UPDATE tenants
        SET store_name = ?, owner_name = ?, owner_phone = ?
        WHERE tenant_id = ?
      `).run(
        storeName ? storeName.trim() : '',
        ownerName ? ownerName.trim() : '',
        ownerPhone ? ownerPhone.trim() : '',
        tenantId
      );
      return result.changes > 0;
    } catch (err: any) {
      console.error(`Gagal menyinkronkan store_info ke master.db untuk tenant ${tenantId}:`, err);
      return false;
    }
  }
}
