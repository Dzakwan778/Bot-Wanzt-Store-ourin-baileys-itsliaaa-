import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  hashScryptPassword,
  verifyLocalSaltedPassword,
  verifyMasterPassword,
  verifyScryptPassword,
} from './passwordCrypto.ts';

test('hashScryptPassword generates unique random salts and verifies in constant time', () => {
  const hash1 = hashScryptPassword('StrongPass!23');
  const hash2 = hashScryptPassword('StrongPass!23');

  assert.match(hash1, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.match(hash2, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.notEqual(hash1, hash2);

  assert.equal(verifyScryptPassword('StrongPass!23', hash1), true);
  assert.equal(verifyScryptPassword('WrongPass!23', hash1), false);
  assert.equal(verifyMasterPassword('StrongPass!23', hash1).valid, true);
  assert.equal(verifyMasterPassword('StrongPass!23', hash1).needsRehash, false);
});

test('verifyMasterPassword and verifyLocalSaltedPassword support transparent legacy hash upgrade', () => {
  const legacyMasterHash = crypto
    .pbkdf2Sync('LegacySecret99!', 'master_salt_wanzt_2026', 1000, 32, 'sha256')
    .toString('hex');

  const okLegacy = verifyMasterPassword('LegacySecret99!', legacyMasterHash);
  assert.equal(okLegacy.valid, true);
  assert.equal(okLegacy.needsRehash, true);

  const badLegacy = verifyMasterPassword('WrongSecret', legacyMasterHash);
  assert.equal(badLegacy.valid, false);
  assert.equal(badLegacy.needsRehash, false);

  const localSalt = crypto.randomBytes(16).toString('hex');
  const legacyLocalHash = crypto.pbkdf2Sync('LocalPass88!', localSalt, 100000, 64, 'sha512').toString('hex');
  const okLocal = verifyLocalSaltedPassword('LocalPass88!', legacyLocalHash, localSalt, 100000);
  assert.equal(okLocal.valid, true);
  assert.equal(okLocal.needsRehash, true);
  assert.equal(verifyLocalSaltedPassword('Wrong', legacyLocalHash, localSalt, 100000).valid, false);
});

test('Session 3 cryptography & zero hardcoded credentials integration test (isolated scratch cwd)', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const tmpDirNoEnv = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi3-crypto-noenv-'));
  const tmpDirWithEnv = fs.mkdtempSync(path.join(os.tmpdir(), 'wanzt-sesi3-crypto-env-'));

  const scriptNoEnv = `
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { getMasterDb, initMasterDatabase } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'database', 'masterSqlite.ts'))};
import { AdminAuthService } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'services', 'adminAuthService.ts'))};
import { verifyLogin } from ${JSON.stringify(path.join(repoRoot, 'backend', 'services', 'authManager.ts'))};
import { verifyMasterAdminLogin } from ${JSON.stringify(path.join(repoRoot, 'backend', 'services', 'apartmentManager.ts'))};
import { TokenService } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'services', 'tokenService.ts'))};
import { generateCleanId, generateRandomPassword, generateStructuredUsername } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'utils', 'generatorUtils.ts'))};

initMasterDatabase();

// 1. Fresh DB without bootstrap env vars MUST NOT allow any hardcoded legacy credentials
assert.throws(() => AdminAuthService.login('wan_admin773', 'Obsidian@7X_Nova', '127.0.0.1'));
assert.equal(verifyLogin('wanzt', 'wanzt123'), false);
assert.equal(verifyLogin('admin', 'admin123'), false);
assert.equal(verifyMasterAdminLogin('superadmin', 'masterwanzt888'), false);

// 2. Simulate legacy SHA-256 hash rows in master.db and verify transparent login + auto-rehash to scrypt$
const db = getMasterDb();
const legacyAdminPass = 'LegacyMaster#2026';
const legacyAdminHash = crypto.pbkdf2Sync(legacyAdminPass, 'master_salt_wanzt_2026', 1000, 32, 'sha256').toString('hex');
db.prepare('INSERT INTO super_admins (username, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
  .run('legacy_admin', legacyAdminHash, 'Legacy Admin', new Date().toISOString());

const loginRes = AdminAuthService.login('legacy_admin', legacyAdminPass, '127.0.0.1');
assert.equal(loginRes.admin.username, 'legacy_admin');
const upgradedAdmin = db.prepare('SELECT password_hash FROM super_admins WHERE username = ?').get('legacy_admin') as { password_hash: string };
assert.ok(upgradedAdmin.password_hash.startsWith('scrypt$'), 'Admin hash should auto-upgrade to scrypt$');

// Second login continues working with scrypt$ hash
const secondAdminLogin = AdminAuthService.login('legacy_admin', legacyAdminPass, '127.0.0.1');
assert.ok(secondAdminLogin.token.length >= 64);

// Tenant legacy hash auto-upgrade test
const legacyTenantPass = 'LegacyTenant#2026';
const legacyTenantHash = crypto.pbkdf2Sync(legacyTenantPass, 'master_salt_wanzt_2026', 1000, 32, 'sha256').toString('hex');
db.prepare(\`
  INSERT INTO tenants (tenant_id, store_name, owner_name, owner_phone, username, password_hash, package_name, status, max_groups, created_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?, 'Pro', 'active', 10, ?, ?)
\`).run(
  't_legacy_01',
  'Legacy Store',
  'Legacy Owner',
  '628123456789',
  'legacy_tenant',
  legacyTenantHash,
  new Date().toISOString(),
  new Date(Date.now() + 86400000).toISOString()
);

const tenantLogin = verifyLogin('legacy_tenant', legacyTenantPass);
assert.ok(tenantLogin && tenantLogin.success && tenantLogin.tenantId === 't_legacy_01');
const upgradedTenant = db.prepare('SELECT password_hash FROM tenants WHERE tenant_id = ?').get('t_legacy_01') as { password_hash: string };
assert.ok(upgradedTenant.password_hash.startsWith('scrypt$'), 'Tenant hash should auto-upgrade to scrypt$');

// 3. CSPRNG generators & license tokens work cleanly
const tokens = new Set<string>();
for (let i = 0; i < 25; i++) {
  tokens.add(TokenService.createToken(30, 'days').token_code);
}
assert.equal(tokens.size, 25);
assert.ok(generateRandomPassword(12).length >= 12);
assert.ok(generateCleanId('Toko Keren').startsWith('t_tokokeren_'));
assert.ok(generateStructuredUsername('Toko Keren').includes('_'));

console.log('CRYPTO_NOENV_OK');
`;

  const scriptWithEnv = `
import assert from 'node:assert/strict';
import { getMasterDb, initMasterDatabase } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'database', 'masterSqlite.ts'))};
import { AdminAuthService } from ${JSON.stringify(path.join(repoRoot, 'admin-backend', 'services', 'adminAuthService.ts'))};
import { verifyLogin } from ${JSON.stringify(path.join(repoRoot, 'backend', 'services', 'authManager.ts'))};

initMasterDatabase();
const db = getMasterDb();

const adminRow = db.prepare('SELECT username, password_hash FROM super_admins WHERE username = ?').get('boot_admin_01') as any;
assert.ok(adminRow && adminRow.password_hash.startsWith('scrypt$'));
const adminLogin = AdminAuthService.login('boot_admin_01', 'BootAdmin#Pass99', '127.0.0.1');
assert.equal(adminLogin.admin.username, 'boot_admin_01');

const tenantRow = db.prepare('SELECT username, password_hash FROM tenants WHERE username = ?').get('boot_tenant_01') as any;
assert.ok(tenantRow && tenantRow.password_hash.startsWith('scrypt$'));
const tenantLogin = verifyLogin('boot_tenant_01', 'BootTenant#Pass99');
assert.ok(tenantLogin && tenantLogin.success);

console.log('CRYPTO_WITHENV_OK');
`;

  const p1 = path.join(tmpDirNoEnv, 'check-noenv.ts');
  const p2 = path.join(tmpDirWithEnv, 'check-withenv.ts');
  fs.writeFileSync(p1, scriptNoEnv, 'utf8');
  fs.writeFileSync(p2, scriptWithEnv, 'utf8');

  try {
    const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
    const cleanEnv = { ...process.env };
    delete cleanEnv.ADMIN_BOOTSTRAP_USERNAME;
    delete cleanEnv.ADMIN_BOOTSTRAP_PASSWORD;
    delete cleanEnv.TENANT_BOOTSTRAP_USERNAME;
    delete cleanEnv.TENANT_BOOTSTRAP_PASSWORD;
    delete cleanEnv.LOCAL_AUTH_BOOTSTRAP_USERNAME;
    delete cleanEnv.LOCAL_AUTH_BOOTSTRAP_PASSWORD;
    delete cleanEnv.APARTMENT_ADMIN_BOOTSTRAP_USERNAME;
    delete cleanEnv.APARTMENT_ADMIN_BOOTSTRAP_PASSWORD;

    const out1 = execFileSync(tsxBin, [p1], { cwd: tmpDirNoEnv, env: cleanEnv, encoding: 'utf-8' });
    assert.match(out1, /CRYPTO_NOENV_OK/);

    const out2 = execFileSync(tsxBin, [p2], {
      cwd: tmpDirWithEnv,
      env: {
        ...cleanEnv,
        ADMIN_BOOTSTRAP_USERNAME: 'boot_admin_01',
        ADMIN_BOOTSTRAP_PASSWORD: 'BootAdmin#Pass99',
        TENANT_BOOTSTRAP_USERNAME: 'boot_tenant_01',
        TENANT_BOOTSTRAP_PASSWORD: 'BootTenant#Pass99',
      },
      encoding: 'utf-8',
    });
    assert.match(out2, /CRYPTO_WITHENV_OK/);
  } finally {
    fs.rmSync(tmpDirNoEnv, { recursive: true, force: true });
    fs.rmSync(tmpDirWithEnv, { recursive: true, force: true });
  }
});
