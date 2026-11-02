import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TENANTS_DIR = path.resolve(process.cwd(), 'database', 'tenants');
const DEFAULT_BOT_DB = path.resolve(process.cwd(), 'database', 'bot.db');

const tenantConnections = new Map<string, Database.Database>();

export function getTenantDbPath(tenantId: string): string {
  if (!fs.existsSync(TENANTS_DIR)) {
    fs.mkdirSync(TENANTS_DIR, { recursive: true });
  }
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.resolve(TENANTS_DIR, `${cleanId}.db`);
}

export function initTenantDb(tenantId: string): Database.Database {
  if (tenantConnections.has(tenantId)) {
    return tenantConnections.get(tenantId)!;
  }

  const dbPath = getTenantDbPath(tenantId);

  // Jika ini t_wanzt dan file belum ada, namun bot.db lama ada di root database, salin datanya
  if (tenantId === 't_wanzt' && !fs.existsSync(dbPath) && fs.existsSync(DEFAULT_BOT_DB)) {
    try {
      fs.copyFileSync(DEFAULT_BOT_DB, dbPath);
      console.log(`[Tenant DB] Berhasil menyinkronkan data lama bot.db ke ${dbPath}`);
    } catch (err) {
      console.error('[Tenant DB] Gagal menyalin bot.db ke t_wanzt.db:', err);
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Skema Tabel Tenant
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      session_token TEXT,
      session_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_number TEXT NOT NULL,
      admin_name TEXT,
      admin_number TEXT,
      web_link TEXT,
      is_locked INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lunas_qris_api_key TEXT,
      lunas_qris_secret_key TEXT,
      lunas_qris_base_url TEXT,
      xaviera_api_key TEXT,
      xaviera_base_url TEXT,
      xaviera_secret_key TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commands_config (
      command_name TEXT PRIMARY KEY,
      config_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_whitelist (
      group_jid TEXT PRIMARY KEY,
      group_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      added_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      customer_number TEXT NOT NULL,
      customer_name TEXT,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      fee_gateway INTEGER NOT NULL,
      total INTEGER NOT NULL,
      payment_url TEXT,
      qr_string TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      quota INTEGER NOT NULL,
      used_count INTEGER DEFAULT 0,
      min_transaction REAL DEFAULT 0,
      applicable_variants TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pricing_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mode TEXT NOT NULL DEFAULT 'rp',
      value REAL NOT NULL DEFAULT 500,
      updated_at TEXT NOT NULL
    );
  `);

  tenantConnections.set(tenantId, db);
  return db;
}

export function getTenantDb(tenantId: string = 't_wanzt'): Database.Database {
  if (tenantConnections.has(tenantId)) {
    return tenantConnections.get(tenantId)!;
  }
  return initTenantDb(tenantId);
}

export function deleteTenantDb(tenantId: string): void {
  const db = tenantConnections.get(tenantId);
  if (db) {
    try {
      db.close();
    } catch {
      // ignore
    }
    tenantConnections.delete(tenantId);
  }

  const dbPath = getTenantDbPath(tenantId);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
  if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
}
