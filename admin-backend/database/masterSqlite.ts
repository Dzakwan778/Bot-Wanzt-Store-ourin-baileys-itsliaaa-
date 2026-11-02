import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const MASTER_DB_PATH = path.resolve(process.cwd(), 'database', 'master.db');

let masterDb: Database.Database | null = null;

// Helper hashing PBKDF2
export function hashPassword(password: string): string {
  const salt = 'master_salt_wanzt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

export function initMasterDatabase(): Database.Database {
  if (masterDb) return masterDb;

  const dbDir = path.dirname(MASTER_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Buat juga direktori database/tenants jika belum ada
  const tenantsDir = path.resolve(process.cwd(), 'database', 'tenants');
  if (!fs.existsSync(tenantsDir)) {
    fs.mkdirSync(tenantsDir, { recursive: true });
  }

  masterDb = new Database(MASTER_DB_PATH);
  masterDb.pragma('journal_mode = WAL');
  masterDb.pragma('busy_timeout = 5000');

  // Tabel Super Admin
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Tabel Penyewa Toko (Tenants / Apartemen)
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT UNIQUE NOT NULL,
      store_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_phone TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      package_name TEXT DEFAULT 'Pro',
      status TEXT DEFAULT 'active',
      max_groups INTEGER DEFAULT 10,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      notes TEXT
    );
  `);

  // Tabel Riwayat Perpanjangan Sewa
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS subscription_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL,
      amount INTEGER DEFAULT 0,
      days_added INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default super admin jika kosong
  const adminCount = (masterDb.prepare('SELECT COUNT(*) as count FROM super_admins').get() as { count: number }).count;
  if (adminCount === 0) {
    const defaultHash = hashPassword('adminwanzt888');
    masterDb.prepare(`
      INSERT INTO super_admins (username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?)
    `).run('adminutama', defaultHash, 'Master Super Admin', new Date().toISOString());
    console.log('[Master DB] Akun super admin default "adminutama" berhasil dibuat.');
  }

  // Seed default tenant (Wanzt Store / t_wanzt) jika kosong
  const tenantCount = (masterDb.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number }).count;
  if (tenantCount === 0) {
    const tenantHash = hashPassword('wanzt123');
    const oneYearLater = new Date();
    oneYearLater.setDate(oneYearLater.getDate() + 365);

    masterDb.prepare(`
      INSERT INTO tenants (tenant_id, store_name, owner_name, owner_phone, username, password_hash, package_name, status, max_groups, created_at, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      't_wanzt',
      'Wanzt Store',
      'Dzakwan',
      '6282173515807',
      'wanzt',
      tenantHash,
      'Enterprise',
      'active',
      50,
      new Date().toISOString(),
      oneYearLater.toISOString(),
      'Unit Utama Wanzt Store (Apartemen Penthouse)'
    );
    console.log('[Master DB] Tenant default "t_wanzt" berhasil diinisialisasi.');
  }

  return masterDb;
}

export function getMasterDb(): Database.Database {
  if (!masterDb) {
    return initMasterDatabase();
  }
  return masterDb;
}
